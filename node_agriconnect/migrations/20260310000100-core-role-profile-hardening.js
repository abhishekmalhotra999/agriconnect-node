'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.changeColumn(
        'users',
        'role_id',
        {
          type: Sequelize.BIGINT,
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'profiles',
        'farming_type',
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'profiles',
        'technician_type',
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addConstraint('profiles', {
        fields: ['user_id'],
        type: 'unique',
        name: 'profiles_user_id_unique',
        transaction,
      });

      await queryInterface.addConstraint('users', {
        fields: ['role_id'],
        type: 'foreign key',
        name: 'users_role_id_fkey',
        references: {
          table: 'roles',
          field: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        transaction,
      });

      await queryInterface.addIndex('users', ['phone'], {
        name: 'users_phone_idx',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex('users', 'users_phone_idx', { transaction });

      await queryInterface.removeConstraint('users', 'users_role_id_fkey', { transaction });
      await queryInterface.removeConstraint('profiles', 'profiles_user_id_unique', { transaction });

      await queryInterface.removeColumn('profiles', 'technician_type', { transaction });
      await queryInterface.removeColumn('profiles', 'farming_type', { transaction });
    });
  },
};
