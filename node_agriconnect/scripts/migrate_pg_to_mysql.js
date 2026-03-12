require('dotenv').config();

const { Client: PgClient } = require('pg');
const mysql = require('mysql2/promise');

function buildPgConfig() {
  return {
    host: process.env.PG_SRC_HOST || process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.PG_SRC_PORT || 5432),
    database: process.env.PG_SRC_DB || process.env.DB_NAME,
    user: process.env.PG_SRC_USER || process.env.DB_USER,
    password: process.env.PG_SRC_PASS || process.env.DB_PASS || '',
  };
}

function buildMysqlConfig() {
  return {
    host: process.env.MYSQL_DEST_HOST || process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_DEST_PORT || process.env.DB_PORT || 3306),
    database: process.env.MYSQL_DEST_DB || process.env.DB_NAME,
    user: process.env.MYSQL_DEST_USER || process.env.DB_USER,
    password: process.env.MYSQL_DEST_PASS || process.env.DB_PASS || '',
    multipleStatements: true,
  };
}

function toMysqlValue(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof Date) return value;
  if (Buffer.isBuffer(value)) return value;
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

async function copyTable(pg, mysqlConn, tableName, chunkSize = 500) {
  const selectSql = `SELECT * FROM "${tableName}"`;
  const result = await pg.query(selectSql);
  const rows = result.rows || [];

  if (!rows.length) {
    console.log(`- ${tableName}: 0 rows (skipped)`);
    return;
  }

  const columns = Object.keys(rows[0]);
  const quotedCols = columns.map((c) => `\`${c}\``).join(', ');

  await mysqlConn.query(`TRUNCATE TABLE \`${tableName}\``);

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const placeholders = chunk
      .map(() => `(${columns.map(() => '?').join(',')})`)
      .join(',');

    const values = [];
    for (const row of chunk) {
      for (const col of columns) {
        values.push(toMysqlValue(row[col]));
      }
    }

    const insertSql = `INSERT INTO \`${tableName}\` (${quotedCols}) VALUES ${placeholders}`;
    await mysqlConn.query(insertSql, values);
  }

  console.log(`- ${tableName}: ${rows.length} rows copied`);
}

async function run() {
  const pgConfig = buildPgConfig();
  const mysqlConfig = buildMysqlConfig();

  console.log('Postgres source:', `${pgConfig.host}:${pgConfig.port}/${pgConfig.database}`);
  console.log('MySQL target:', `${mysqlConfig.host}:${mysqlConfig.port}/${mysqlConfig.database}`);

  const pg = new PgClient(pgConfig);
  const mysqlConn = await mysql.createConnection(mysqlConfig);

  try {
    await pg.connect();
    await mysqlConn.query('SET FOREIGN_KEY_CHECKS=0');

    const [targetRows] = await mysqlConn.query('SHOW TABLES');
    const targetTableSet = new Set(
      (targetRows || []).map((row) => String(Object.values(row)[0]))
    );

    const tablesResult = await pg.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    );

    const tables = tablesResult.rows
      .map((r) => r.tablename)
      .filter((name) => targetTableSet.has(name))
      .filter((name) => !['SequelizeMeta', 'sequelize_meta', 'ar_internal_metadata', 'schema_migrations'].includes(name));
    if (!tables.length) {
      console.log('No tables found in public schema.');
      return;
    }

    for (const table of tables) {
      try {
        await copyTable(pg, mysqlConn, table);
      } catch (err) {
        console.error(`! Failed table ${table}:`, err.message);
        throw err;
      }
    }

    await mysqlConn.query('SET FOREIGN_KEY_CHECKS=1');
    console.log('Data migration completed successfully.');
  } finally {
    await pg.end().catch(() => undefined);
    await mysqlConn.end().catch(() => undefined);
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
