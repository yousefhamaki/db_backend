require('dotenv').config();
const bcrypt = require('bcryptjs');
const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function main() {
  const conn = await oracledb.getConnection({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE_NAME}`,
  });

  try {
    const result = await conn.execute(
      `SELECT USER_NAME, PASSWORD FROM USERS WHERE EMAIL_VERIFIED = 'N'`
    );

    for (const row of result.rows) {
      // Already-bcrypt-hashed passwords start with $2 — skip so this script is re-run safe
      if (row.PASSWORD && row.PASSWORD.startsWith('$2')) {
        console.log('SKIP (already hashed):', row.USER_NAME);
        continue;
      }
      const hash = await bcrypt.hash(row.PASSWORD, 10);
      await conn.execute(
        `UPDATE USERS SET PASSWORD = :hash, EMAIL_VERIFIED = 'Y' WHERE USER_NAME = :userName`,
        { hash, userName: row.USER_NAME },
        { autoCommit: true }
      );
      console.log('Updated:', row.USER_NAME);
    }
  } finally {
    await conn.close();
  }
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
