'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_preferences', 'seller_status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'approved',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('user_preferences', 'seller_status');
  },
};
