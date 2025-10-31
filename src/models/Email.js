'use strict';

import mongoose from 'mongoose';

const EmailSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
		accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', index: true, required: true },
		categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true },
		gmailMessageId: { type: String, index: true, required: true },
		threadId: { type: String },
		subject: { type: String },
		from: { type: String },
		snippet: { type: String },
		summary: { type: String },
		internalDate: { type: Date },
		labels: [{ type: String }],
		unsubscribeLinks: [{ type: String }],
		payload: { type: Object },
		rawHtml: { type: String },
		rawText: { type: String },
	},
	{ timestamps: true }
);

export default mongoose.model('Email', EmailSchema);
