const twilio = require('twilio');

const sendOtp = async (mobileNumber, otp) => {
    try {
        // Lazy-initialize so server doesn't crash with placeholder credentials
        const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        await client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: mobileNumber,
            body: `Your OTP code is: ${otp}`,
        });
        return true;
    } catch (err) {
        console.error('Twilio error:', err.message);
        return false;
    }
};

module.exports = { sendOtp };
