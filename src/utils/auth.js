'use strict';

export function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated && req.isAuthenticated()) {
		return next();
	}
	res.status(401).json({ authenticated: false });
}
