'use strict';

import express from 'express';
import Email from '../models/Email.js';
import Account from '../models/Account.js';
import { refreshIfNeeded, trashMessage, parseMailto, sendEmail } from '../services/gmailService.js';
import { attemptUnsubscribe } from '../services/unsubscribeService.js';

const router = express.Router();

async function activeAccountIds(userId) {
	const accounts = await Account.find({ userId, active: true }).select('_id').lean();
	return accounts.map((a) => a._id);
}

router.get('/', async (req, res) => {
	const { categoryId } = req.query;
	const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
	const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 200);
	const accIds = await activeAccountIds(req.user._id);
	if (accIds.length === 0) return res.json([]);
	const q = { userId: req.user._id, accountId: { $in: accIds } };
	if (categoryId) q.categoryId = categoryId;
	const total = await Email.countDocuments(q);
	const emails = await Email.find(q)
		.sort({ createdAt: -1 })
		.skip((page - 1) * pageSize)
		.limit(pageSize)
		.populate({ path: 'accountId', select: 'email' })
		.lean();
	const items = emails.map(e => ({ ...e, accountEmail: e.accountId?.email }));
	res.json({ items, total, page, pageSize });
});

router.get('/:id', async (req, res) => {
	const accIds = await activeAccountIds(req.user._id);
	if (accIds.length === 0) return res.status(404).json({ error: 'Not found' });
	const email = await Email.findOne({ _id: req.params.id, userId: req.user._id, accountId: { $in: accIds } })
		.populate({ path: 'accountId', select: 'email' })
		.lean();
	if (!email) return res.status(404).json({ error: 'Not found' });
	res.json({ ...email, accountEmail: email.accountId?.email });
});

router.post('/bulk-delete', async (req, res) => {
	const accIds = await activeAccountIds(req.user._id);
	const { emailIds } = req.body; // array of Email._id
	const emails = await Email.find({ _id: { $in: emailIds || [] }, userId: req.user._id, accountId: { $in: accIds } });
	const results = [];
	for (const e of emails) {
		const account = await Account.findById(e.accountId);
		try {
			const auth = await refreshIfNeeded(account);
			await trashMessage(auth, e.gmailMessageId);
			await e.deleteOne();
			results.push({ id: String(e._id), ok: true });
		} catch (err) {
			results.push({ id: String(e._id), ok: false, error: err?.message });
		}
	}
	res.json({ results });
});

router.post('/bulk-unsubscribe', async (req, res) => {
	const accIds = await activeAccountIds(req.user._id);
	const { emailIds } = req.body; // array of Email._id
	const emails = await Email.find({ _id: { $in: emailIds || [] }, userId: req.user._id, accountId: { $in: accIds } });
	const results = [];
	for (const e of emails) {
		let success = false;
		let error;
		const account = await Account.findById(e.accountId);
		const auth = await refreshIfNeeded(account);
		for (const url of e.unsubscribeLinks || []) {
			try {
				const mail = parseMailto(url);
				if (mail) {
					await sendEmail(auth, { to: mail.to, subject: mail.subject || 'Unsubscribe request', body: mail.body || `Please unsubscribe ${req.user.email}` });
					success = true;
					break;
				} else {
					const r = await attemptUnsubscribe(url, { userEmail: req.user.email });
					if (r.success) { success = true; break; }
				}
			} catch (err) { error = err?.message; }
		}
		results.push({ id: String(e._id), ok: success, error });
	}
	res.json({ results });
});

export default router;
