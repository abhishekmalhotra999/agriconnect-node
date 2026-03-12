const sequelize = require('../config/database');
const User = require('./User');
const Role = require('./Role');
const Profile = require('./Profile');
const Course = require('./Course');
const Lesson = require('./Lesson');
const Enrollment = require('./Enrollment');
const LessonProgress = require('./LessonProgress');
const PrivacyPolicy = require('./PrivacyPolicy');
const Lms = require('./Lms');
const MarketplaceCategory = require('./MarketplaceCategory');
const MarketplaceProduct = require('./MarketplaceProduct');
const ServiceCategory = require('./ServiceCategory');
const ServiceListing = require('./ServiceListing');
const ServiceRequest = require('./ServiceRequest');
const UserPreference = require('./UserPreference');
const MarketplaceReview = require('./MarketplaceReview');
const ServiceReview = require('./ServiceReview');

// ─── Associations ───

// Role <-> User
Role.hasMany(User, { foreignKey: 'role_id' });
User.belongsTo(Role, { foreignKey: 'role_id' });

// User <-> Profile
User.hasOne(Profile, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Profile.belongsTo(User, { foreignKey: 'user_id' });

// User <-> Course (as instructor)
User.hasMany(Course, { foreignKey: 'instructor_id', as: 'instructedCourses' });
Course.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor' });

// Course <-> Lesson
Course.hasMany(Lesson, { foreignKey: 'course_id', onDelete: 'CASCADE' });
Lesson.belongsTo(Course, { foreignKey: 'course_id' });

// User <-> Enrollment
User.hasMany(Enrollment, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Enrollment.belongsTo(User, { foreignKey: 'user_id' });

// Course <-> Enrollment
Course.hasMany(Enrollment, { foreignKey: 'course_id', onDelete: 'CASCADE' });
Enrollment.belongsTo(Course, { foreignKey: 'course_id' });

// User <-> LessonProgress
User.hasMany(LessonProgress, { foreignKey: 'user_id', onDelete: 'CASCADE' });
LessonProgress.belongsTo(User, { foreignKey: 'user_id' });

// Lesson <-> LessonProgress
Lesson.hasMany(LessonProgress, { foreignKey: 'lesson_id', onDelete: 'CASCADE' });
LessonProgress.belongsTo(Lesson, { foreignKey: 'lesson_id' });

// MarketplaceCategory <-> MarketplaceProduct
MarketplaceCategory.hasMany(MarketplaceProduct, { foreignKey: 'category_id', as: 'products' });
MarketplaceProduct.belongsTo(MarketplaceCategory, { foreignKey: 'category_id', as: 'category' });

// User (farmer) <-> MarketplaceProduct
User.hasMany(MarketplaceProduct, { foreignKey: 'farmer_user_id', as: 'marketplaceProducts' });
MarketplaceProduct.belongsTo(User, { foreignKey: 'farmer_user_id', as: 'farmer' });

// ServiceCategory <-> ServiceListing
ServiceCategory.hasMany(ServiceListing, { foreignKey: 'service_category_id', as: 'listings' });
ServiceListing.belongsTo(ServiceCategory, { foreignKey: 'service_category_id', as: 'category' });

// User (technician) <-> ServiceListing
User.hasMany(ServiceListing, { foreignKey: 'technician_user_id', as: 'serviceListings' });
ServiceListing.belongsTo(User, { foreignKey: 'technician_user_id', as: 'technician' });

// ServiceListing <-> ServiceRequest
ServiceListing.hasMany(ServiceRequest, { foreignKey: 'service_listing_id', as: 'requests' });
ServiceRequest.belongsTo(ServiceListing, { foreignKey: 'service_listing_id', as: 'listing' });

// User (customer) <-> ServiceRequest
User.hasMany(ServiceRequest, { foreignKey: 'customer_user_id', as: 'serviceRequests' });
ServiceRequest.belongsTo(User, { foreignKey: 'customer_user_id', as: 'customer' });

// User <-> UserPreference
User.hasOne(UserPreference, { foreignKey: 'user_id', as: 'preferences', onDelete: 'CASCADE' });
UserPreference.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// MarketplaceProduct <-> MarketplaceReview
MarketplaceProduct.hasMany(MarketplaceReview, { foreignKey: 'marketplace_product_id', as: 'reviews', onDelete: 'CASCADE' });
MarketplaceReview.belongsTo(MarketplaceProduct, { foreignKey: 'marketplace_product_id', as: 'product' });
User.hasMany(MarketplaceReview, { foreignKey: 'user_id', as: 'marketplaceReviews', onDelete: 'CASCADE' });
MarketplaceReview.belongsTo(User, { foreignKey: 'user_id', as: 'reviewer' });

// ServiceListing <-> ServiceReview
ServiceListing.hasMany(ServiceReview, { foreignKey: 'service_listing_id', as: 'reviews', onDelete: 'CASCADE' });
ServiceReview.belongsTo(ServiceListing, { foreignKey: 'service_listing_id', as: 'listing' });
User.hasMany(ServiceReview, { foreignKey: 'user_id', as: 'serviceReviews', onDelete: 'CASCADE' });
ServiceReview.belongsTo(User, { foreignKey: 'user_id', as: 'reviewer' });

module.exports = {
    sequelize,
    User,
    Role,
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
};
