const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserPreference = sequelize.define('UserPreference', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true,
    },
    saved_items: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    recent_items: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    notifications: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    farmer_onboarding: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: { completed: false },
    },
    seller_status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'approved',
    },
    seller_status_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'user_preferences',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = UserPreference;