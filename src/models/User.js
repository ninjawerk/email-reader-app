'use strict';

import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
	{
		googleId: { type: String, index: true, required: true, unique: true },
		name: { type: String },
		email: { type: String, index: true },
	},
	{ timestamps: true }
);

export default mongoose.model('User', UserSchema);
