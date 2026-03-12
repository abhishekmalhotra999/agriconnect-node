const nodemailer = require('nodemailer');

function getMailerConfig() {
    return {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || 'false') === 'true',
        auth: process.env.SMTP_USER
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            }
            : undefined,
    };
}

async function sendServiceRequestEmail({ to, listingTitle, requesterName, requesterPhone, requesterEmail, message }) {
    if (!to) {
        throw new Error('No technician email configured for this service listing');
    }

    const mailer = nodemailer.createTransport(getMailerConfig());
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@agriconnect.local';

    return mailer.sendMail({
        from,
        to,
        subject: `New service request: ${listingTitle}`,
        text: [
            `Service: ${listingTitle}`,
            `Requester: ${requesterName}`,
            `Phone: ${requesterPhone}`,
            `Email: ${requesterEmail || 'N/A'}`,
            '',
            'Message:',
            message,
        ].join('\n'),
    });
}

module.exports = { sendServiceRequestEmail };
