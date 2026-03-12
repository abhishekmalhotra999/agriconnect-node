'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'marketplace_categories',
        {
          id: {
            type: Sequelize.BIGINT,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
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
        'marketplace_products',
        {
          id: {
            type: Sequelize.BIGINT,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          farmer_user_id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          category_id: {
            type: Sequelize.BIGINT,
            allowNull: true,
            references: {
              model: 'marketplace_categories',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          title: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          unit_price: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
          },
          stock_quantity: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          status: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'draft',
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
        'service_categories',
        {
          id: {
            type: Sequelize.BIGINT,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
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
        'service_listings',
        {
          id: {
            type: Sequelize.BIGINT,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          technician_user_id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          service_category_id: {
            type: Sequelize.BIGINT,
            allowNull: true,
            references: {
              model: 'service_categories',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          title: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          service_area: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          contact_email: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
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
        'service_requests',
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
            references: {
              model: 'service_listings',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          customer_user_id: {
            type: Sequelize.BIGINT,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          requester_name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          requester_phone: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          requester_email: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          message: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          status: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'new',
          },
          email_delivery_status: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'pending',
          },
          email_delivery_error: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          last_emailed_at: {
            type: Sequelize.DATE,
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

      await queryInterface.addIndex('marketplace_products', ['farmer_user_id'], {
        name: 'marketplace_products_farmer_user_id_idx',
        transaction,
      });
      await queryInterface.addIndex('marketplace_products', ['status'], {
        name: 'marketplace_products_status_idx',
        transaction,
      });
      await queryInterface.addIndex('service_listings', ['technician_user_id'], {
        name: 'service_listings_technician_user_id_idx',
        transaction,
      });
      await queryInterface.addIndex('service_requests', ['service_listing_id'], {
        name: 'service_requests_service_listing_id_idx',
        transaction,
      });
      await queryInterface.addIndex('service_requests', ['status'], {
        name: 'service_requests_status_idx',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('service_requests', { transaction });
      await queryInterface.dropTable('service_listings', { transaction });
      await queryInterface.dropTable('service_categories', { transaction });
      await queryInterface.dropTable('marketplace_products', { transaction });
      await queryInterface.dropTable('marketplace_categories', { transaction });
    });
  },
};
