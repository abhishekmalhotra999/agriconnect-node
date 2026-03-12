require('dotenv').config();

const {
  sequelize,
  Role,
  User,
  Profile,
  Course,
  Lesson,
  Enrollment,
  LessonProgress,
  PrivacyPolicy,
  Lms,
  MarketplaceCategory,
  MarketplaceProduct,
  ServiceCategory,
  ServiceListing,
  ServiceRequest,
  UserPreference,
  MarketplaceReview,
  ServiceReview,
} = require('../src/models');

async function ensureBaseSchema() {
  const qi = sequelize.getQueryInterface();

  const hasUsers = await qi.describeTable('users').then(() => true).catch(() => false);
  if (!hasUsers) {
    // Create core tables in dependency order.
    await Role.sync();
    await User.sync();
    await Profile.sync();

    await PrivacyPolicy.sync();

    await Course.sync();
    await Lesson.sync();
    await Enrollment.sync();
    await LessonProgress.sync();
    await Lms.sync();

    await MarketplaceCategory.sync();
    await MarketplaceProduct.sync();

    await ServiceCategory.sync();
    await ServiceListing.sync();
    await ServiceRequest.sync();

    await UserPreference.sync();
    await MarketplaceReview.sync();
    await ServiceReview.sync();
  }
}

(async () => {
  try {
    await sequelize.authenticate();
    await ensureBaseSchema();
    console.log('MySQL bootstrap schema ensured successfully.');
    process.exit(0);
  } catch (err) {
    console.error('MySQL bootstrap failed:', err);
    process.exit(1);
  }
})();
