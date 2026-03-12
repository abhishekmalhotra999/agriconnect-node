const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PrivacyPolicy = sequelize.define('PrivacyPolicy', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'privacy_policies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = PrivacyPolicy;
