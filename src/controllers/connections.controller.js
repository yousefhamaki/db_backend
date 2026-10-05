const oracledb = require('oracledb');
const { withConnection } = require('../db/pool');

const SELECT_SITES = `
  SELECT s.SITE_ID, s.SITE_NAME, s.IP, s.PORT, s.SERVICE_NAME,
         c.CREDENTIAL_ID, c.USER_NAME, c.PASSWORD
  FROM SITES s
  LEFT JOIN SITE_CREDENTIALS c ON c.SITE_ID = s.SITE_ID
  WHERE s.USER_ID = :userId`;
const ORDER_SITES = ' ORDER BY s.SITE_NAME, c.CREDENTIAL_ID';

function toId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Maps common Oracle errors to clear 4xx responses instead of a raw 500.
// Returns true if it handled the error (and already sent a response).
function handleDbError(err, res) {
  const msg = err.message || '';
  if (msg.includes('ORA-00001')) {
    const error = msg.includes('UQ_CREDENTIALS_SITE_USER')
      ? 'This site already has a credential with that username'
      : 'You already have a connection with that site name';
    res.status(409).json({ error });
    return true;
  }
  if (msg.includes('ORA-12899')) {
    res.status(400).json({ error: 'A field value is too long for its column', detail: msg.split('\n')[0] });
    return true;
  }
  if (msg.includes('ORA-01400') || msg.includes('ORA-01407')) {
    res.status(400).json({ error: 'A required field is missing', detail: msg.split('\n')[0] });
    return true;
  }
  return false;
}

function groupSites(rows) {
  const sites = new Map();
  for (const row of rows) {
    if (!sites.has(row.SITE_ID)) {
      sites.set(row.SITE_ID, {
        connectionId: row.SITE_ID,
        site: row.SITE_NAME,
        ip: row.IP,
        port: row.PORT,
        service_name: row.SERVICE_NAME,
        data: [],
      });
    }
    if (row.CREDENTIAL_ID !== null) {
      sites.get(row.SITE_ID).data.push({
        credentialId: row.CREDENTIAL_ID,
        username: row.USER_NAME,
        password: row.PASSWORD,
      });
    }
  }
  return [...sites.values()];
}

async function fetchSites(conn, userId, { id, name } = {}) {
  let sql = SELECT_SITES;
  const binds = { userId };
  if (id) {
    sql += ' AND s.SITE_ID = :id';
    binds.id = id;
  }
  if (name) {
    sql += ' AND LOWER(s.SITE_NAME) = LOWER(:name)';
    binds.name = name.trim();
  }
  const result = await conn.execute(sql + ORDER_SITES, binds);
  return groupSites(result.rows);
}

function sameValue(a, b) {
  return String(a).trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
}

function readCredential(body) {
  const username = body.username ?? body.userName;
  return { username, password: body.password };
}

function validCredential(c) {
  return typeof c.username === 'string' && c.username.trim() !== '';
}

async function list(req, res, next) {
  try {
    await withConnection(async (conn) => {
      const name = typeof req.query.site === 'string' ? req.query.site : undefined;
      res.json(await fetchSites(conn, req.user.userId, { name }));
    });
  } catch (err) {
    next(err);
  }
}

async function getBySite(req, res, next) {
  try {
    const name = req.params.site;
    await withConnection(async (conn) => {
      const [site] = await fetchSites(conn, req.user.userId, { name });
      if (!site) return res.status(404).json({ error: `Connection for site "${name}" not found` });
      res.json(site);
    });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  const id = toId(req.params.id);
  if (!id) {
    req.params.site = req.params.id;
    return getBySite(req, res, next);
  }
  try {
    await withConnection(async (conn) => {
      const [site] = await fetchSites(conn, req.user.userId, { id });
      if (!site) return res.status(404).json({ error: 'Not found' });
      res.json(site);
    });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { site, ip, port, serviceName, service_name: serviceNameSnake, data } = req.body;
    if (!site) return res.status(400).json({ error: 'site is required' });

    const credentials = [];
    if (Array.isArray(data)) credentials.push(...data.map(readCredential));
    if (req.body.userName !== undefined || req.body.password !== undefined) {
      credentials.push(readCredential(req.body));
    }
    if (!credentials.every(validCredential)) {
      return res.status(400).json({ error: 'every credential needs a non-empty username' });
    }

    await withConnection(async (conn) => {
      try {
        const givenServiceName = serviceName || serviceNameSnake;
        const existing = await conn.execute(
          `SELECT SITE_ID, IP, PORT, SERVICE_NAME FROM SITES
           WHERE USER_ID = :userId AND LOWER(SITE_NAME) = LOWER(:site)`,
          { userId: req.user.userId, site: String(site).trim() }
        );

        let siteId;
        let merged = false;
        if (existing.rows.length) {
          const row = existing.rows[0];
          const mismatched = [
            ['ip', ip, row.IP],
            ['port', port, row.PORT],
            ['service_name', givenServiceName, row.SERVICE_NAME],
          ].filter(([, given, current]) => given && !sameValue(given, current)).map(([name]) => name);

          if (mismatched.length) {
            return res.status(409).json({
              error: `Site "${site}" already exists with a different ${mismatched.join(', ')}`,
            });
          }
          if (!credentials.length) {
            return res.status(409).json({ error: 'You already have a connection with that site name' });
          }
          siteId = row.SITE_ID;
          merged = true;
        } else {
          const insert = await conn.execute(
            `INSERT INTO SITES (USER_ID, SITE_NAME, IP, PORT, SERVICE_NAME)
             VALUES (:userId, :site, :ip, :port, :serviceName)
             RETURNING SITE_ID INTO :siteId`,
            {
              userId: req.user.userId,
              site,
              ip: ip || null,
              port: port || null,
              serviceName: givenServiceName || null,
              siteId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            },
            { autoCommit: false }
          );
          siteId = insert.outBinds.siteId[0];
        }

        for (const c of credentials) {
          await conn.execute(
            `INSERT INTO SITE_CREDENTIALS (SITE_ID, USER_NAME, PASSWORD)
             VALUES (:siteId, :username, :password)`,
            { siteId, username: c.username, password: c.password || null },
            { autoCommit: false }
          );
        }
        await conn.commit();

        const [saved] = await fetchSites(conn, req.user.userId, { id: siteId });
        res.status(merged ? 200 : 201).json(saved);
      } catch (err) {
        await conn.rollback();
        throw err;
      }
    });
  } catch (err) {
    if (handleDbError(err, res)) return;
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'id must be a positive integer' });

    const { site, ip, port, serviceName, service_name: serviceNameSnake } = req.body;
    if (req.body.userName !== undefined || req.body.password !== undefined || req.body.data !== undefined) {
      return res.status(400).json({ error: 'Change credentials through /api/connections/:id/credentials' });
    }

    const fields = [];
    const binds = { id, userId: req.user.userId };
    if (site !== undefined) { fields.push('SITE_NAME = :site'); binds.site = site; }
    if (ip !== undefined) { fields.push('IP = :ip'); binds.ip = ip; }
    if (port !== undefined) { fields.push('PORT = :port'); binds.port = port; }
    const svc = serviceName !== undefined ? serviceName : serviceNameSnake;
    if (svc !== undefined) { fields.push('SERVICE_NAME = :serviceName'); binds.serviceName = svc; }
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    await withConnection(async (conn) => {
      const result = await conn.execute(
        `UPDATE SITES SET ${fields.join(', ')} WHERE SITE_ID = :id AND USER_ID = :userId`,
        binds,
        { autoCommit: true }
      );
      if (result.rowsAffected === 0) return res.status(404).json({ error: 'Not found' });
      const [updated] = await fetchSites(conn, req.user.userId, { id });
      res.json(updated);
    });
  } catch (err) {
    if (handleDbError(err, res)) return;
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'id must be a positive integer' });

    await withConnection(async (conn) => {
      const result = await conn.execute(
        `DELETE FROM SITES WHERE SITE_ID = :id AND USER_ID = :userId`,
        { id, userId: req.user.userId },
        { autoCommit: true }
      );
      if (result.rowsAffected === 0) return res.status(404).json({ error: 'Not found' });
      res.status(204).send();
    });
  } catch (err) {
    next(err);
  }
}

async function addCredential(req, res, next) {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'id must be a positive integer' });

    const credential = readCredential(req.body);
    if (!validCredential(credential)) return res.status(400).json({ error: 'username is required' });

    await withConnection(async (conn) => {
      const owned = await conn.execute(
        `SELECT 1 FROM SITES WHERE SITE_ID = :id AND USER_ID = :userId`,
        { id, userId: req.user.userId }
      );
      if (!owned.rows.length) return res.status(404).json({ error: 'Not found' });

      const insert = await conn.execute(
        `INSERT INTO SITE_CREDENTIALS (SITE_ID, USER_NAME, PASSWORD)
         VALUES (:id, :username, :password)
         RETURNING CREDENTIAL_ID INTO :credentialId`,
        {
          id,
          username: credential.username,
          password: credential.password || null,
          credentialId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        },
        { autoCommit: true }
      );
      res.status(201).json({
        credentialId: insert.outBinds.credentialId[0],
        username: credential.username,
        password: credential.password || null,
      });
    });
  } catch (err) {
    if (handleDbError(err, res)) return;
    next(err);
  }
}

async function updateCredential(req, res, next) {
  try {
    const id = toId(req.params.id);
    const credentialId = toId(req.params.credentialId);
    if (!id || !credentialId) return res.status(400).json({ error: 'ids must be positive integers' });

    const { username, password } = readCredential(req.body);
    const fields = [];
    const binds = { id, credentialId, userId: req.user.userId };
    if (username !== undefined) {
      if (typeof username !== 'string' || username.trim() === '') {
        return res.status(400).json({ error: 'username cannot be empty' });
      }
      fields.push('USER_NAME = :username');
      binds.username = username;
    }
    if (password !== undefined) { fields.push('PASSWORD = :password'); binds.password = password; }
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    await withConnection(async (conn) => {
      const result = await conn.execute(
        `UPDATE SITE_CREDENTIALS SET ${fields.join(', ')}
         WHERE CREDENTIAL_ID = :credentialId
           AND SITE_ID IN (SELECT SITE_ID FROM SITES WHERE SITE_ID = :id AND USER_ID = :userId)`,
        binds,
        { autoCommit: true }
      );
      if (result.rowsAffected === 0) return res.status(404).json({ error: 'Not found' });

      const updated = await conn.execute(
        `SELECT CREDENTIAL_ID, USER_NAME, PASSWORD FROM SITE_CREDENTIALS WHERE CREDENTIAL_ID = :credentialId`,
        { credentialId }
      );
      const row = updated.rows[0];
      res.json({ credentialId: row.CREDENTIAL_ID, username: row.USER_NAME, password: row.PASSWORD });
    });
  } catch (err) {
    if (handleDbError(err, res)) return;
    next(err);
  }
}

async function removeCredential(req, res, next) {
  try {
    const id = toId(req.params.id);
    const credentialId = toId(req.params.credentialId);
    if (!id || !credentialId) return res.status(400).json({ error: 'ids must be positive integers' });

    await withConnection(async (conn) => {
      const result = await conn.execute(
        `DELETE FROM SITE_CREDENTIALS
         WHERE CREDENTIAL_ID = :credentialId
           AND SITE_ID IN (SELECT SITE_ID FROM SITES WHERE SITE_ID = :id AND USER_ID = :userId)`,
        { credentialId, id, userId: req.user.userId },
        { autoCommit: true }
      );
      if (result.rowsAffected === 0) return res.status(404).json({ error: 'Not found' });
      res.status(204).send();
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getBySite,
  get,
  create,
  update,
  remove,
  addCredential,
  updateCredential,
  removeCredential,
};
