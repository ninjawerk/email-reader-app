'use strict';

import express from 'express';
import passport from 'passport';

const router = express.Router();

router.get('/me', (req, res) => {
	if (!req.user) return res.status(200).json({ authenticated: false });
	res.json({ authenticated: true, user: { id: req.user._id, name: req.user.name, email: req.user.email } });
});

router.get(
	'/google',
	passport.authenticate('google', {
		scope: 'openid email profile https://www.googleapis.com/auth/gmail.modify',
		accessType: 'offline',
		prompt: 'consent',
		includeGrantedScopes: true,
	})
);

router.get(
	'/google/callback',
	passport.authenticate('google', { failureRedirect: '/' }),
	(req, res) => {
		const redirectTo = process.env.FRONTEND_ORIGIN || '/';
		res.redirect(redirectTo);
	}
);

router.post('/logout', (req, res, next) => {
	req.logout((err) => {
		if (err) return next(err);
		res.json({ ok: true });
	});
});

export default router;
