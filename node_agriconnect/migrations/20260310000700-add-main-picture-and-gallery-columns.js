'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('marketplace_products', 'main_picture_url', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('marketplace_products', 'gallery_urls', {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      }, { transaction });

      await queryInterface.addColumn('service_listings', 'main_picture_url', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('service_listings', 'gallery_urls', {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      }, { transaction });

      await queryInterface.sequelize.query(
        "UPDATE marketplace_products SET main_picture_url = thumbnail_url WHERE main_picture_url IS NULL AND thumbnail_url IS NOT NULL",
        { transaction },
      );
      await queryInterface.sequelize.query(
        "UPDATE service_listings SET main_picture_url = thumbnail_url WHERE main_picture_url IS NULL AND thumbnail_url IS NOT NULL",
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('service_listings', 'gallery_urls', { transaction });
      await queryInterface.removeColumn('service_listings', 'main_picture_url', { transaction });
      await queryInterface.removeColumn('marketplace_products', 'gallery_urls', { transaction });
      await queryInterface.removeColumn('marketplace_products', 'main_picture_url', { transaction });
    });
  },
};
