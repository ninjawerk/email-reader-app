'use strict';

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import mongoose from 'mongoose';

import User from '../models/User.js';
import Account from '../models/Account.js';

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
				// Upsert user
				let user = await User.findOne({ googleId: profile.id });
				if (!user) {
					user = await User.create({
						googleId: profile.id,
						name: profile.displayName,
						email: profile.emails && profile.emails[0] ? profile.emails[0].value : undefined,
					});
				}

				// Upsert primary account for this user
				const existing = await Account.findOne({ userId: user._id, email: user.email });
				const expiryDate = params && params.expires_in ? Date.now() + params.expires_in * 1000 : undefined;
				if (!existing) {
					await Account.create({
						userId: user._id,
						email: user.email,
						provider: 'google',
						accessToken,
						refreshToken,
						tokenExpiry: expiryDate,
					});
				} else {
					existing.accessToken = accessToken;
					existing.refreshToken = refreshToken || existing.refreshToken;
					existing.tokenExpiry = expiryDate || existing.tokenExpiry;
					await existing.save();
				}

				return done(null, user);
			} catch (err) {
				return done(err);
			}
		}
	)
);

export default passport;
