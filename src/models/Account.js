'use strict';

import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
		email: { type: String, index: true, required: true },
		provider: { type: String, default: 'google' },
		accessToken: { type: String },
		refreshToken: { type: String },
		tokenExpiry: { type: Number },
		lastHistoryId: { type: String },
		lastCheckedAt: { type: Date },
		active: { type: Boolean, default: true, index: true },
	},
	{ timestamps: true }
);

export default mongoose.model('Account', AccountSchema);
