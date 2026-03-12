require('dotenv').config();

const dialect = (process.env.DB_DIALECT || 'postgres').toLowerCase();
const defaultPort = dialect === 'mysql' ? 3306 : 5432;

const common = {
  username: process.env.DB_USER,
  password: process.env.DB_PASS || null,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || defaultPort),
  dialect,
  logging: false,
};

module.exports = {
  development: common,
  test: common,
  production: common,
};
