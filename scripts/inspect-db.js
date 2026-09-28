require('dotenv').config();
const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function main() {
  const connection = await oracledb.getConnection({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE_NAME}`,
  });

  try {
    console.log('Connected to Oracle DB.\n');

    const tablesResult = await connection.execute(
      `SELECT table_name, num_rows FROM user_tables ORDER BY table_name`
    );
    const tables = tablesResult.rows;
    console.log(`Found ${tables.length} tables:\n`);

    for (const t of tables) {
      const tableName = t.TABLE_NAME;
      console.log(`=== ${tableName} ===`);

      const colsResult = await connection.execute(
        `SELECT column_name, data_type, data_length, nullable, data_default
         FROM user_tab_columns WHERE table_name = :tn ORDER BY column_id`,
        { tn: tableName }
      );
      for (const c of colsResult.rows) {
        console.log(
          `  ${c.COLUMN_NAME}  ${c.DATA_TYPE}(${c.DATA_LENGTH})  nullable=${c.NULLABLE}` +
          (c.DATA_DEFAULT ? `  default=${c.DATA_DEFAULT.toString().trim()}` : '')
        );
      }

      const pkResult = await connection.execute(
        `SELECT cols.column_name
         FROM user_constraints cons, user_cons_columns cols
         WHERE cons.constraint_type = 'P'
           AND cons.constraint_name = cols.constraint_name
           AND cons.table_name = :tn`,
        { tn: tableName }
      );
      if (pkResult.rows.length) {
        console.log(`  PK: ${pkResult.rows.map(r => r.COLUMN_NAME).join(', ')}`);
      }

      const fkResult = await connection.execute(
        `SELECT a.column_name, c_pk.table_name AS ref_table, b.column_name AS ref_column
         FROM user_cons_columns a
         JOIN user_constraints c ON a.constraint_name = c.constraint_name
         JOIN user_constraints c_pk ON c.r_constraint_name = c_pk.constraint_name
         JOIN user_cons_columns b ON c_pk.constraint_name = b.constraint_name AND a.position = b.position
         WHERE c.constraint_type = 'R' AND a.table_name = :tn`,
        { tn: tableName }
      );
      for (const fk of fkResult.rows) {
        console.log(`  FK: ${fk.COLUMN_NAME} -> ${fk.REF_TABLE}.${fk.REF_COLUMN}`);
      }

      let countRes;
      try {
        countRes = await connection.execute(`SELECT COUNT(*) AS CNT FROM "${tableName}"`);
        console.log(`  Row count: ${countRes.rows[0].CNT}`);
      } catch (e) {
        console.log(`  Row count: (error: ${e.message})`);
      }

      try {
        const sampleRes = await connection.execute(
          `SELECT * FROM "${tableName}" FETCH FIRST 5 ROWS ONLY`
        );
        console.log(`  Sample rows (up to 5):`);
        for (const row of sampleRes.rows) {
          console.log('   ', JSON.stringify(row));
        }
      } catch (e) {
        console.log(`  Sample rows: (error: ${e.message})`);
      }

      console.log('');
    }
  } finally {
    await connection.close();
  }
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
