'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'user_preferences',
        {
          id: {
            type: Sequelize.BIGINT,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          user_id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            unique: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          saved_items: {
            type: Sequelize.JSON,
            allowNull: false,
            defaultValue: [],
          },
          recent_items: {
            type: Sequelize.JSON,
            allowNull: false,
            defaultValue: [],
          },
          notifications: {
            type: Sequelize.JSON,
            allowNull: false,
            defaultValue: [],
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
        },
        { transaction },
      );

      await queryInterface.createTable(
        'marketplace_reviews',
        {
          id: {
            type: Sequelize.BIGINT,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          marketplace_product_id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            references: { model: 'marketplace_products', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          user_id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          rating: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          comment: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
        },
        { transaction },
      );

      await queryInterface.createTable(
        'service_reviews',
        {
          id: {
            type: Sequelize.BIGINT,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          service_listing_id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            references: { model: 'service_listings', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          user_id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          rating: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          comment: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
        },
        { transaction },
      );

      await queryInterface.addIndex('marketplace_reviews', ['marketplace_product_id'], { transaction });
      await queryInterface.addIndex('service_reviews', ['service_listing_id'], { transaction });
      await queryInterface.addIndex('marketplace_reviews', ['user_id'], { transaction });
      await queryInterface.addIndex('service_reviews', ['user_id'], { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('service_reviews', { transaction });
      await queryInterface.dropTable('marketplace_reviews', { transaction });
      await queryInterface.dropTable('user_preferences', { transaction });
    });
  },
};
