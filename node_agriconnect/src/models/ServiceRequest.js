const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ServiceRequest = sequelize.define('ServiceRequest', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    service_listing_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    customer_user_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    requester_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    requester_phone: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    requester_email: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'new',
    },
    email_delivery_status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending',
    },
    email_delivery_error: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    last_emailed_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'service_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = ServiceRequest;
