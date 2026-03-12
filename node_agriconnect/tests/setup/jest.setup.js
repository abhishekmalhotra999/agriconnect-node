const { sequelize } = require('../../src/models');

afterAll(async () => {
    try {
        await sequelize.close();
    } catch (err) {
        // Ignore teardown noise to avoid hiding actual test assertion failures.
    }
});
