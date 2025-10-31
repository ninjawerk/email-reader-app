'use strict';

import OpenAI from 'openai';
import Category from '../models/Category.js';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function categorizeAndSummarize(userId, emailFields) {
	const categories = await Category.find({ userId }).lean();
	const categoryList = categories.map((c) => ({ id: String(c._id), name: c.name, description: c.description || '' }));
	const system = `You categorize emails into one of the user's categories and produce a short summary. Respond strictly as minified JSON: {"categoryId":"<id>","categoryName":"<name>","summary":"<short>"}. Use the provided categories; if unsure, choose the closest by description.`;
	const content = `Categories: ${JSON.stringify(categoryList)}\nEmail Subject: ${emailFields.subject}\nFrom: ${emailFields.from}\nSnippet: ${emailFields.snippet}\nPlain Text: ${emailFields.rawText ? emailFields.rawText.slice(0, 4000) : ''}`;
	const response = await client.chat.completions.create({
		model: 'gpt-4o-mini',
		messages: [
			{ role: 'system', content: system },
			{ role: 'user', content },
		],
		temperature: 0.2,
	});
	const text = response.choices?.[0]?.message?.content || '{}';
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch (e) {
		parsed = { categoryId: null, categoryName: null, summary: text.slice(0, 500) };
	}
	return parsed;
}
