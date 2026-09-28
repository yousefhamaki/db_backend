const { withConnection } = require('../db/pool');

const SAFE_COLUMNS = 'SITE, IP, PORT, SERVICE_NAME, USER_NAME, PASSWORD, USER_ID';

async function list(req, res, next) {
  try {
    await withConnection(async (conn) => {
      const result = await conn.execute(`SELECT ${SAFE_COLUMNS} FROM CONNECTIONS ORDER BY SITE`);
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
        `SELECT ${SAFE_COLUMNS} FROM CONNECTIONS WHERE SITE = :site`,
        { site: req.params.site }
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
    const { site, ip, port, serviceName, userName, password, userId } = req.body;
    if (!site) return res.status(400).json({ error: 'site is required' });

    await withConnection(async (conn) => {
      await conn.execute(
        `INSERT INTO CONNECTIONS (SITE, IP, PORT, SERVICE_NAME, USER_NAME, PASSWORD, USER_ID)
         VALUES (:site, :ip, :port, :serviceName, :userName, :password, :userId)`,
        {
          site,
          ip: ip || null,
          port: port || null,
          serviceName: serviceName || null,
          userName: userName || null,
          password: password || null,
          userId: userId || null,
        },
        { autoCommit: true }
      );
      res.status(201).json({ message: 'Connection created', site });
    });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { ip, port, serviceName, userName, password, userId } = req.body;
    const site = req.params.site;

    const fields = [];
    const binds = { site };
    if (ip !== undefined) { fields.push('IP = :ip'); binds.ip = ip; }
    if (port !== undefined) { fields.push('PORT = :port'); binds.port = port; }
    if (serviceName !== undefined) { fields.push('SERVICE_NAME = :serviceName'); binds.serviceName = serviceName; }
    if (userName !== undefined) { fields.push('USER_NAME = :userName'); binds.userName = userName; }
    if (password !== undefined) { fields.push('PASSWORD = :password'); binds.password = password; }
    if (userId !== undefined) { fields.push('USER_ID = :userId'); binds.userId = userId; }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    await withConnection(async (conn) => {
      const result = await conn.execute(
        `UPDATE CONNECTIONS SET ${fields.join(', ')} WHERE SITE = :site`,
        binds,
        { autoCommit: true }
      );
      if (result.rowsAffected === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Connection updated', site });
    });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await withConnection(async (conn) => {
      const result = await conn.execute(
        `DELETE FROM CONNECTIONS WHERE SITE = :site`,
        { site: req.params.site },
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
