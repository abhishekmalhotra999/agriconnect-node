'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_preferences', 'farmer_onboarding', {
        type: Sequelize.JSON,
      allowNull: false,
      defaultValue: {
        completed: false,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('user_preferences', 'farmer_onboarding');
  },
};
