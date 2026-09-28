require('dotenv').config();
const fs = require('fs');
const path = require('path');
const oracledb = require('oracledb');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/migrate.js <sql-file>');
  process.exit(1);
}

function splitStatements(sql) {
  const withoutComments = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  return withoutComments
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length);
}

async function main() {
  const sql = fs.readFileSync(path.resolve(file), 'utf8');
  const statements = splitStatements(sql);

  const connection = await oracledb.getConnection({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE_NAME}`,
  });

  try {
    for (const stmt of statements) {
      const label = stmt.replace(/\s+/g, ' ').slice(0, 80);
      try {
        await connection.execute(stmt);
        await connection.commit();
        console.log('OK   ', label);
      } catch (e) {
        // ORA-00955: name already used (table exists), ORA-02275/ORA-02261: constraint already exists,
        // ORA-01442/ORA-01451: column already modified — tolerate so the script is re-run safe
        const tolerable = /ORA-00955|ORA-02275|ORA-02261|ORA-01442|ORA-01451|ORA-01430/.test(e.message);
        if (tolerable) {
          console.log('SKIP ', label, '->', e.message.split('\n')[0]);
        } else {
          console.error('FAIL ', label, '->', e.message.split('\n')[0]);
          throw e;
        }
      }
    }
    console.log('\nMigration complete.');
  } finally {
    await connection.close();
  }
}

main().catch((err) => {
  console.error('Migration aborted:', err.message);
  process.exit(1);
});
