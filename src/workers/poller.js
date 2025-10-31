'use strict';

import cron from 'node-cron';
import dayjs from 'dayjs';
import Account from '../models/Account.js';
import Email from '../models/Email.js';
import Category from '../models/Category.js';
import { refreshIfNeeded, listRecentUnread, getMessage, archiveMessage, findParts, decodeBody, extractHeader, extractUnsubscribeLinks } from '../services/gmailService.js';
import { categorizeAndSummarize } from '../services/aiService.js';

function resolveCronExpression() {
	const fallback = '*/2 * * * *';
	const env = (process.env.POLL_INTERVAL_CRON || '').trim();
	if (!env) return fallback;
	const parts = env.split(/\s+/);
	if (parts.length !== 5) return fallback;
	return env;
}

async function resolveCategoryIdForUser(userId, aiCategoryId, aiCategoryName) {
	const categories = await Category.find({ userId }).lean();
	if (!categories.length) return null;
	// Prefer id match (exact string of ObjectId)
	if (aiCategoryId) {
		const byId = categories.find(c => String(c._id) === String(aiCategoryId));
		if (byId) return byId._id;
	}
	// Fallback: name match (case-insensitive)
	if (aiCategoryName) {
		const target = aiCategoryName.trim().toLowerCase();
		const byName = categories.find(c => (c.name || '').trim().toLowerCase() === target);
		if (byName) return byName._id;
	}
	return null;
}

async function processAccount(account) {
	const auth = await refreshIfNeeded(account);
	const messages = await listRecentUnread(auth, 'in:inbox newer_than:3d');
	for (const m of messages) {
		try {
			const exists = await Email.findOne({ accountId: account._id, gmailMessageId: m.id });
			if (exists) continue;

			const msg = await getMessage(auth, m.id);
			const headers = msg.payload?.headers || [];
			const subject = extractHeader(headers, 'Subject');
			const from = extractHeader(headers, 'From');
			const internalDate = msg.internalDate ? new Date(Number(msg.internalDate)) : new Date();

			const parts = findParts(msg.payload);
			const htmlPart = parts.find((p) => p.mimeType === 'text/html');
			const textPart = parts.find((p) => p.mimeType === 'text/plain');
			const rawHtml = decodeBody(htmlPart?.body);
			const rawText = decodeBody(textPart?.body) || msg.snippet || '';

			const ai = await categorizeAndSummarize(account.userId, { subject, from, snippet: msg.snippet, rawText });
			const resolvedCategoryId = await resolveCategoryIdForUser(account.userId, ai.categoryId, ai.categoryName);
			const summary = ai.summary;

			await Email.create({
				userId: account.userId,
				accountId: account._id,
				categoryId: resolvedCategoryId || undefined,
				gmailMessageId: m.id,
				threadId: msg.threadId,
				subject,
				from,
				snippet: msg.snippet,
				summary,
				internalDate,
				labels: (msg.labelIds || []),
				unsubscribeLinks: extractUnsubscribeLinks(headers, rawHtml, rawText),
				payload: msg.payload,
				rawHtml,
				rawText,
			});

			await archiveMessage(auth, m.id);
		} catch (err) {
			console.error('Failed processing message', m?.id, err?.message);
		}
	}
	account.lastCheckedAt = new Date();
	await account.save();
}

export function startPoller() {
	const cronExp = resolveCronExpression();
	console.log(`Starting poller with schedule ${cronExp}`);
	cron.schedule(cronExp, async () => {
		try {
			const accounts = await Account.find({});
			for (const account of accounts) {
				await processAccount(account);
			}
		} catch (err) {
			console.error('Poller error', err);
		}
	});
}
