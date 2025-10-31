'use strict';

import express from 'express';
import Category from '../models/Category.js';

const router = express.Router();

router.get('/', async (req, res) => {
	const categories = await Category.find({ userId: req.user._id }).lean();
	res.json(categories);
});

router.post('/', async (req, res) => {
	const { name, description } = req.body;
	const created = await Category.create({ userId: req.user._id, name, description });
	res.status(201).json(created);
});

export default router;
