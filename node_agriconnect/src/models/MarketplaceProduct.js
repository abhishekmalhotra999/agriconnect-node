const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MarketplaceProduct = sequelize.define('MarketplaceProduct', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    farmer_user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    category_id: {
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
    unit_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    stock_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'draft',
    },
}, {
    tableName: 'marketplace_products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = MarketplaceProduct;
