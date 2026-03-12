const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '',
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '',
        unique: true,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '',
    },
    encrypted_password: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '',
    },
    role_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    info: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
    },
    reset_password_token: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    reset_password_sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    remember_created_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    sign_in_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    current_sign_in_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    last_sign_in_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    current_sign_in_ip: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    last_sign_in_ip: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    country_code: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '+231',
    },
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

// Instance methods
User.prototype.validPassword = async function (password) {
    return bcrypt.compare(password, this.encrypted_password);
};

User.prototype.setPassword = async function (password) {
    const salt = await bcrypt.genSalt(10);
    this.encrypted_password = await bcrypt.hash(password, salt);
};

User.prototype.isAdmin = function () {
    return this.Role && this.Role.name === 'admin';
};

User.prototype.roleName = function () {
    return (this.Role && this.Role.name) || '';
};

// Virtual getter for verification_code from info JSON
User.prototype.getVerificationCode = function () {
    return this.info && this.info.verification_code;
};

User.prototype.setVerificationCode = function (code) {
    const info = this.info || {};
    info.verification_code = code;
    this.info = info;
    // Mark JSON as changed so Sequelize persists it
    this.changed('info', true);
};

module.exports = User;
