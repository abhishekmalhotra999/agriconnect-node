require('dotenv').config();
const { User } = require('./src/models');
const { encode } = require('./src/utils/jwt');
async function run() {
    try {
        const user = await User.findOne({ where: { phone: '987654321' } });
        if (!user) {
            console.log('user not found');
            process.exit(0);
        }
        const token = encode({ phone: user.phone });
        console.log('TOKEN=' + token);
        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}
run();
