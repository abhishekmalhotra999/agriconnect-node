const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET;

const encode = (payload, exp = null) => {
    const options = {};
    if (exp) {
        options.expiresIn = exp;
    }
    return jwt.sign(payload, SECRET_KEY, options);
};

const decode = (token) => {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (err) {
        return null;
    }
};

module.exports = { encode, decode };
