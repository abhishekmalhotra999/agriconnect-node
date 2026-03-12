const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Lesson = sequelize.define('Lesson', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '',
        validate: {
            notEmpty: true,
        },
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    resource_url: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    course_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    lesson_asset: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    thumbnail_asset: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'lessons',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = Lesson;
