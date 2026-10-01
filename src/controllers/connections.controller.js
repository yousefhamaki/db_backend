const { withConnection } = require('../db/pool');

const SAFE_COLUMNS = 'CONNECTION_ID, SITE, IP, PORT, SERVICE_NAME, USER_NAME, PASSWORD, USER_ID';

// Maps common Oracle input errors to clear 4xx responses instead of a raw 500.
// Returns true if it handled the error (and already sent a response).
function handleDbError(err, req, res) {
  if (err.message && err.message.includes('ORA-00001')) {
    res.status(409).json({ error: `A connection with site "${req.body.site}" already exists` });
    return true;
  }
  if (err.message && err.message.includes('ORA-12899')) {
    res.status(400).json({ error: 'A field value is too long for its column', detail: err.message.split('\n')[0] });
    return true;
  }
  if (err.message && (err.message.includes('ORA-01400') || err.message.includes('ORA-01407'))) {
    res.status(400).json({ error: 'A required field is missing', detail: err.message.split('\n')[0] });
    return true;
  }
  return false;
}

async function list(req, res, next) {
  try {
    await withConnection(async (conn) => {
      const result = await conn.execute(
        `SELECT ${SAFE_COLUMNS} FROM CONNECTIONS WHERE USER_ID = :userId ORDER BY SITE`,
        { userId: req.user.userId }
      );
      res.json(result.rows);
    });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    await withConnection(async (conn) => {
      const result = await conn.execute(
        `SELECT ${SAFE_COLUMNS} FROM CONNECTIONS WHERE CONNECTION_ID = :id AND USER_ID = :userId`,
        { id: req.params.id, userId: req.user.userId }
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { site, ip, port, serviceName, userName, password } = req.body;
    if (!site) return res.status(400).json({ error: 'site is required' });

    await withConnection(async (conn) => {
      const oracledb = require('oracledb');
      const insertRes = await conn.execute(
        `INSERT INTO CONNECTIONS (SITE, IP, PORT, SERVICE_NAME, USER_NAME, PASSWORD, USER_ID)
         VALUES (:site, :ip, :port, :serviceName, :userName, :password, :userId)
         RETURNING CONNECTION_ID INTO :connectionId`,
        {
          site,
          ip: ip || null,
          port: port || null,
          serviceName: serviceName || null,
          userName: userName || null,
          password: password || null,
          userId: req.user.userId,
          connectionId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        },
        { autoCommit: true }
      );
      res.status(201).json({
        message: 'Connection created',
        connectionId: insertRes.outBinds.connectionId[0],
        site,
      });
    });
  } catch (err) {
    if (handleDbError(err, req, res)) return;
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { site, ip, port, serviceName, userName, password } = req.body;
    const id = req.params.id;

    const fields = [];
    const binds = { id, userId: req.user.userId };
    if (site !== undefined) { fields.push('SITE = :site'); binds.site = site; }
    if (ip !== undefined) { fields.push('IP = :ip'); binds.ip = ip; }
    if (port !== undefined) { fields.push('PORT = :port'); binds.port = port; }
    if (serviceName !== undefined) { fields.push('SERVICE_NAME = :serviceName'); binds.serviceName = serviceName; }
    if (userName !== undefined) { fields.push('USER_NAME = :userName'); binds.userName = userName; }
    if (password !== undefined) { fields.push('PASSWORD = :password'); binds.password = password; }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    await withConnection(async (conn) => {
      const result = await conn.execute(
        `UPDATE CONNECTIONS SET ${fields.join(', ')} WHERE CONNECTION_ID = :id AND USER_ID = :userId`,
        binds,
        { autoCommit: true }
      );
      if (result.rowsAffected === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Connection updated', connectionId: Number(id) });
    });
  } catch (err) {
    if (handleDbError(err, req, res)) return;
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await withConnection(async (conn) => {
      const result = await conn.execute(
        `DELETE FROM CONNECTIONS WHERE CONNECTION_ID = :id AND USER_ID = :userId`,
        { id: req.params.id, userId: req.user.userId },
        { autoCommit: true }
      );
      if (result.rowsAffected === 0) return res.status(404).json({ error: 'Not found' });
      res.status(204).send();
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, create, update, remove };
