const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Profile = sequelize.define('Profile', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    farm_size: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    profession_type: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    years_of_experience: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    farming_type: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    technician_type: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    avatar: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'profiles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = Profile;
