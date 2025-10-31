'use strict';

import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
		name: { type: String, required: true },
		description: { type: String },
	},
	{ timestamps: true }
);

export default mongoose.model('Category', CategorySchema);
