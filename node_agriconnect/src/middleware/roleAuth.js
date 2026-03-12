function normalizeRole(name) {
    return (name || '').toString().trim().toLowerCase();
}

function requireRoles(allowedRoles) {
    const allowed = new Set(allowedRoles.map((role) => normalizeRole(role)));

    return (req, res, next) => {
        const currentRole = normalizeRole(req.appUser?.Role?.name);
        if (!allowed.has(currentRole)) {
            return res.status(403).json({ errors: ['Forbidden for current role'] });
        }
        return next();
    };
}

module.exports = { requireRoles, normalizeRole };
