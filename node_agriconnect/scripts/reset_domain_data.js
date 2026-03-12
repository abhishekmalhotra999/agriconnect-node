/* eslint-disable no-console */
require('dotenv').config();

const {
  sequelize,
  ServiceRequest,
  ServiceReview,
  ServiceListing,
  ServiceCategory,
  MarketplaceReview,
  MarketplaceProduct,
  MarketplaceCategory,
  LessonProgress,
  Enrollment,
  Lesson,
  Course,
  Lms,
} = require('../src/models');

const assertLocalSafe = () => {
  const host = String(process.env.DB_HOST || '').toLowerCase();
  const dbName = String(process.env.DB_NAME || '').toLowerCase();
  const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();

  const isLocalHost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === 'mysql-dev' ||
    host.endsWith('.local');

  const isLocalDbName =
    dbName.includes('dev') || dbName.includes('local') || dbName.includes('test');

  if (!isLocalHost || !isLocalDbName || nodeEnv === 'production') {
    throw new Error(
      `Refusing destructive reset for host=${host || '<empty>'} db=${dbName || '<empty>'} env=${nodeEnv || '<empty>'}`,
    );
  }
};

const truncateModel = async model => {
  const tableName = model.getTableName();
  const table = typeof tableName === 'string' ? tableName : tableName.tableName;
  await sequelize.query(`TRUNCATE TABLE \`${table}\``);
  console.log(`cleared ${table}`);
};

const run = async () => {
  assertLocalSafe();
  await sequelize.authenticate();
  console.log('connected to local database');

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

  await truncateModel(ServiceRequest);
  await truncateModel(ServiceReview);
  await truncateModel(ServiceListing);
  await truncateModel(ServiceCategory);

  await truncateModel(MarketplaceReview);
  await truncateModel(MarketplaceProduct);
  await truncateModel(MarketplaceCategory);

  await truncateModel(LessonProgress);
  await truncateModel(Enrollment);
  await truncateModel(Lesson);
  await truncateModel(Course);
  await truncateModel(Lms);

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

  await sequelize.close();
  console.log('domain reset complete: lms + marketplace + services');
};

run().catch(async error => {
  console.error('domain reset failed:', error.message || error);
  try {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    await sequelize.close();
  } catch (_error) {
    // ignore close errors in failure path
  }
  process.exit(1);
});
