'use strict';

import express from 'express';
import Account from '../models/Account.js';

const router = express.Router();

router.get('/', async (req, res) => {
	const accounts = await Account.find({ userId: req.user._id, active: true }).sort({ createdAt: -1 }).lean();
	res.json(accounts);
});

router.delete('/:id', async (req, res) => {
	const acc = await Account.findOne({ _id: req.params.id, userId: req.user._id });
	if (!acc) return res.status(404).json({ error: 'Not found' });
	acc.active = false;
	acc.accessToken = undefined;
	acc.refreshToken = undefined;
	acc.tokenExpiry = undefined;
	await acc.save();
	res.json({ ok: true });
});

export default router;
