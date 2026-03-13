require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const coursesRoutes = require('./routes/courses');
const lessonsRoutes = require('./routes/lessons');
const enrollmentsRoutes = require('./routes/enrollments');
const lessonProgressesRoutes = require('./routes/lessonProgresses');
const usersRoutes = require('./routes/users');
const contentsRoutes = require('./routes/contents');
const marketplaceCategoriesRoutes = require('./routes/marketplaceCategories');
const marketplaceProductsRoutes = require('./routes/marketplaceProducts');
const serviceCategoriesRoutes = require('./routes/serviceCategories');
const serviceListingsRoutes = require('./routes/serviceListings');
const serviceRequestsRoutes = require('./routes/serviceRequests');

// Import middleware
const authenticate = require('./middleware/auth');
const adminAuth = require('./middleware/adminAuth');

// Import admin routes
const adminAuthRoutes = require('./routes/admin/auth');
const adminDashboardRoutes = require('./routes/admin/dashboard');
const adminCoursesRoutes = require('./routes/admin/courses');
const adminUsersRoutes = require('./routes/admin/users');
const adminPrivacyPoliciesRoutes = require('./routes/admin/privacyPolicies');
const adminMarketplaceProductsRoutes = require('./routes/admin/marketplaceProducts');
const adminMarketplaceCategoriesRoutes = require('./routes/admin/marketplaceCategories');
const adminServiceListingsRoutes = require('./routes/admin/serviceListings');
const adminServiceCategoriesRoutes = require('./routes/admin/serviceCategories');
const adminServiceRequestsRoutes = require('./routes/admin/serviceRequests');
const adminNotificationsRoutes = require('./routes/admin/notifications');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Global Middleware ───
app.use(cors()); // Allow all origins (matches Rails cors.rb)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Health Check ───
app.get('/up', (req, res) => {
    res.json({ status: 'ok' });
});

// ─── Public Routes (no auth) ───
app.use('/api', authRoutes);
app.use('/api/contents', contentsRoutes);

// ─── Protected Routes (require JWT) ───
app.use('/api/courses', authenticate, coursesRoutes);
app.use('/api/lessons', authenticate, lessonsRoutes);
app.use('/api/enrollments', authenticate, enrollmentsRoutes);
app.use('/api/lesson_progresses', authenticate, lessonProgressesRoutes);
app.use('/api/users', authenticate, usersRoutes);
app.use('/api/marketplace/categories', authenticate, marketplaceCategoriesRoutes);
app.use('/api/marketplace/products', authenticate, marketplaceProductsRoutes);
app.use('/api/services/categories', authenticate, serviceCategoriesRoutes);
app.use('/api/services/listings', authenticate, serviceListingsRoutes);
app.use('/api/services/requests', authenticate, serviceRequestsRoutes);

// ─── Admin Public Routes ───
app.use('/admin', adminAuthRoutes);

// ─── Admin Protected Routes (require admin JWT) ───
app.use('/admin/dashboard', adminAuth, adminDashboardRoutes);
app.use('/admin/courses', adminAuth, adminCoursesRoutes);
app.use('/admin/users', adminAuth, adminUsersRoutes);
app.use('/admin/privacy_policies', adminAuth, adminPrivacyPoliciesRoutes);
app.use('/admin/marketplace/products', adminAuth, adminMarketplaceProductsRoutes);
app.use('/admin/marketplace/categories', adminAuth, adminMarketplaceCategoriesRoutes);
app.use('/admin/services/listings', adminAuth, adminServiceListingsRoutes);
app.use('/admin/services/categories', adminAuth, adminServiceCategoriesRoutes);
app.use('/admin/services/requests', adminAuth, adminServiceRequestsRoutes);
app.use('/admin/notifications', adminAuth, adminNotificationsRoutes);

// ─── Start Server ───
const startServer = async () => {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');

        // Sync models (do NOT force in production — use migrations instead)
        // await sequelize.sync({ alter: true });
        // console.log('✅ Models synced.');

        app.listen(PORT, () => {
            console.log(`🚀 AgriConnect Node.js server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌ Unable to start server:', err);
        process.exit(1);
    }
};

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
