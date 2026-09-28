const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pool;

async function initPool() {
  if (pool) return pool;
  pool = await oracledb.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE_NAME}`,
    poolMin: 1,
    poolMax: 10,
    poolIncrement: 1,
  });
  return pool;
}

async function withConnection(fn) {
  const p = await initPool();
  const connection = await p.getConnection();
  try {
    return await fn(connection);
  } finally {
    await connection.close();
  }
}

async function closePool() {
  if (pool) await pool.close(5);
}

module.exports = { initPool, withConnection, closePool };
