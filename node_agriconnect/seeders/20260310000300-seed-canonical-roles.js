'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const roles = ['admin', 'customer', 'farmer', 'technician'];

    for (const roleName of roles) {
      await queryInterface.sequelize.query(
        `
          INSERT INTO roles (name, created_at, updated_at)
          SELECT :name, :now, :now
          WHERE NOT EXISTS (
            SELECT 1 FROM roles WHERE lower(name) = lower(:name)
          )
        `,
        {
          replacements: { name: roleName, now },
          type: Sequelize.QueryTypes.INSERT,
        },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM roles WHERE lower(name) IN ('customer', 'farmer', 'technician')`,
    );
  },
};
