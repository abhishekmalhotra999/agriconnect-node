require('dotenv').config();
const { Sequelize } = require('sequelize');

const dialect = (process.env.DB_DIALECT || 'postgres').toLowerCase();
const defaultPort = dialect === 'mysql' ? 3306 : 5432;

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || defaultPort),
    dialect,
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

module.exports = sequelize;
