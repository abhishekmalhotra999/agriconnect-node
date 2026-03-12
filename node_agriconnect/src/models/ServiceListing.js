const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ServiceListing = sequelize.define('ServiceListing', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    technician_user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    service_category_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    thumbnail_url: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    main_picture_url: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    gallery_urls: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    service_area: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    contact_email: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'service_listings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = ServiceListing;
