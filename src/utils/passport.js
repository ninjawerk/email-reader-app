'use strict';

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import mongoose from 'mongoose';

import User from '../models/User.js';
import Account from '../models/Account.js';
import Category from '../models/Category.js';

passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
	try {
		const user = await User.findById(id);
		done(null, user);
	} catch (err) {
		done(err);
	}
});

async function ensureDefaultCategory(userId) {
	const defaultName = 'General';
	const exists = await Category.findOne({ userId, name: defaultName });
	if (!exists) {
		await Category.create({ userId, name: defaultName, description: 'Default category for uncategorized emails.' });
	}
}

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
			passReqToCallback: true,
		},
		async (req, accessToken, refreshToken, params, profile, done) => {
			try {
				const emailFromProfile = profile.emails && profile.emails[0] ? profile.emails[0].value : undefined;
				const expiryDate = params && params.expires_in ? Date.now() + params.expires_in * 1000 : undefined;

				let user = req.user;
				if (!user) {
					// No active session: find or create user by googleId
					user = await User.findOne({ googleId: profile.id });
					if (!user) {
						user = await User.create({
							googleId: profile.id,
							name: profile.displayName,
							email: emailFromProfile,
						});
					}
				} else {
					// Active session: ensure user has a name/email if missing (don't override googleId)
					if (!user.name && profile.displayName) user.name = profile.displayName;
					if (!user.email && emailFromProfile) user.email = emailFromProfile;
					await user.save();
				}

				await ensureDefaultCategory(user._id);

				// Upsert account for this user (link multiple Gmail addresses)
				const accountEmail = emailFromProfile;
				if (!accountEmail) return done(new Error('Google did not return an email address for this account'));

				let account = await Account.findOne({ userId: user._id, email: accountEmail });
				if (!account) {
					account = await Account.create({
						userId: user._id,
						email: accountEmail,
						provider: 'google',
						accessToken,
						refreshToken,
						tokenExpiry: expiryDate,
						active: true,
					});
				} else {
					account.accessToken = accessToken;
					account.refreshToken = refreshToken || account.refreshToken;
					account.tokenExpiry = expiryDate || account.tokenExpiry;
					account.active = true; // reactivate if previously disconnected
					await account.save();
				}

				return done(null, user);
			} catch (err) {
				return done(err);
			}
		}
	)
);

export default passport;
