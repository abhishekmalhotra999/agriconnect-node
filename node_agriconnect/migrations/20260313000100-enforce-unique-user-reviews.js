'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    const dialect = sequelize.getDialect();

    await sequelize.transaction(async (transaction) => {
      if (dialect === 'postgres') {
        await sequelize.query(
          `
          DELETE FROM marketplace_reviews a
          USING marketplace_reviews b
          WHERE a.marketplace_product_id = b.marketplace_product_id
            AND a.user_id = b.user_id
            AND a.id < b.id
          `,
          { transaction },
        );

        await sequelize.query(
          `
          DELETE FROM service_reviews a
          USING service_reviews b
          WHERE a.service_listing_id = b.service_listing_id
            AND a.user_id = b.user_id
            AND a.id < b.id
          `,
          { transaction },
        );
      } else if (dialect === 'mysql' || dialect === 'mariadb') {
        await sequelize.query(
          `
          DELETE a
          FROM marketplace_reviews a
          INNER JOIN marketplace_reviews b
            ON a.marketplace_product_id = b.marketplace_product_id
           AND a.user_id = b.user_id
           AND a.id < b.id
          `,
          { transaction },
        );

        await sequelize.query(
          `
          DELETE a
          FROM service_reviews a
          INNER JOIN service_reviews b
            ON a.service_listing_id = b.service_listing_id
           AND a.user_id = b.user_id
           AND a.id < b.id
          `,
          { transaction },
        );
      }

      await queryInterface.addIndex('marketplace_reviews', ['marketplace_product_id', 'user_id'], {
        unique: true,
        name: 'marketplace_reviews_unique_product_user',
        transaction,
      });

      await queryInterface.addIndex('service_reviews', ['service_listing_id', 'user_id'], {
        unique: true,
        name: 'service_reviews_unique_listing_user',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex('marketplace_reviews', 'marketplace_reviews_unique_product_user', { transaction });
      await queryInterface.removeIndex('service_reviews', 'service_reviews_unique_listing_user', { transaction });
    });
  },
};
