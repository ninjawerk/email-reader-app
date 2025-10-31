'use strict';

import puppeteer from 'puppeteer';
import OpenAI from 'openai';

const aiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function resolvePuppeteerOptions() {
	const headlessEnv = String(process.env.PUPPETEER_HEADLESS || '').toLowerCase();
	const isHeadless = headlessEnv === '' ? true : !(headlessEnv === 'false' || headlessEnv === '0' || headlessEnv === 'no');
	const slowMo = Number(process.env.PUPPETEER_SLOWMO || 0);
	const common = {
		args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
		slowMo: slowMo > 0 ? slowMo : 0,
	};
	if (isHeadless) {
		return { headless: 'new', ...common };
	}
	return { headless: false, defaultViewport: null, ...common };
}

async function waitForPossibleNavigation(page, timeoutMs = 10000) {
	try {
		await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: timeoutMs });
	} catch (_) {
		// no navigation occurred within timeout
	}
}

async function planActionsWithAI(url, html, userEmail) {
	const system = `You are a browsing assistant that figures out how to unsubscribe from marketing emails on a web page.
Return ONLY JSON with { steps: Array<Step>, notes?: string } where Step is one of:
- { type: "click", selector: string }
- { type: "type", selector: string, text: string }
- { type: "check", selector: string, value?: boolean }
- { type: "select", selector: string, value: string }
- { type: "submit", selector?: string }
- { type: "wait", ms: number }
- { type: "waitForNavigation" }
- { type: "waitForSelector", selector: string }
If the form requires entering the recipient email, include a type step targeting the email input using the provided userEmail.
Prefer visible elements whose text includes unsubscribe, opt out, confirm, submit, save.
Keep steps under 8.`;
	const user = `URL: ${url}\nuserEmail: ${userEmail || ''}\nHTML (truncated to 15000 chars):\n${html.slice(0, 15000)}`;
	const r = await aiClient.chat.completions.create({
		model: 'gpt-4o-mini',
		messages: [
			{ role: 'system', content: system },
			{ role: 'user', content: user },
		],
		temperature: 0.1,
	});
	const content = r.choices?.[0]?.message?.content || '{}';
	try {
		const parsed = JSON.parse(content);
		if (parsed && Array.isArray(parsed.steps)) return parsed.steps;
	} catch (e) {}
	return [];
}

async function runPlannedActions(page, steps) {
	for (const step of steps) {
		try {
			switch (step.type) {
				case 'click':
					if (!step.selector) break;
					await page.click(step.selector, { delay: 20 }).catch(() => {});
					await waitForPossibleNavigation(page);
					break;
				case 'type':
					if (!step.selector) break;
					await page.click(step.selector, { clickCount: 3 }).catch(() => {});
					await page.type(step.selector, String(step.text || ''), { delay: 10 }).catch(() => {});
					break;
				case 'check':
					if (!step.selector) break;
					await page.$eval(step.selector, (el, value) => {
						if (el && 'checked' in el) el.checked = Boolean(value);
					}, step.value).catch(() => {});
					break;
				case 'select':
					if (!step.selector) break;
					await page.select(step.selector, String(step.value)).catch(() => {});
					break;
				case 'submit':
					if (step.selector) {
						await page.$eval(step.selector, (el) => { if (el && typeof el.submit === 'function') el.submit(); }).catch(() => {});
					} else {
						await page.keyboard.press('Enter').catch(() => {});
					}
					await waitForPossibleNavigation(page);
					break;
				case 'wait':
					await page.waitForTimeout(Number(step.ms) || 800);
					break;
				case 'waitForNavigation':
					await waitForPossibleNavigation(page);
					break;
				case 'waitForSelector':
					if (!step.selector) break;
					await page.waitForSelector(step.selector, { timeout: 10000 }).catch(() => {});
					break;
			}
		} catch (e) {
			// continue to next step even if navigation destroyed context
		}
		await page.waitForTimeout(300);
	}
}

async function heuristicUnsubscribe(page, userEmail) {
	// If an email field is present, fill it first
	if (userEmail) {
		try {
			const emailSelectorCandidates = [
				'input[type="email"]',
				'input[name*="email" i]',
				'input[placeholder*="email" i]'
			];
			for (const sel of emailSelectorCandidates) {
				const exists = await page.$(sel);
				if (exists) {
					await page.click(sel, { clickCount: 3 }).catch(() => {});
					await page.type(sel, userEmail, { delay: 10 }).catch(() => {});
					break;
				}
			}
		} catch {}
	}

	// Heuristics: click one unsubscribe-like element and then stop to avoid stale handles
	const selectors = [
		'button',
		'input[type="submit"]',
		'a',
		'form button[type="submit"]',
	];
	const lowered = (s) => (s || '').toLowerCase();
	for (const sel of selectors) {
		try {
			const handles = await page.$$(sel);
			for (const h of handles) {
				try {
					const text = lowered(await page.evaluate((x) => x.innerText || x.value || x.textContent || '', h));
					if (text.includes('unsubscribe') || text.includes('opt out') || text.includes('opt-out') || text.includes('remove')) {
						await h.click().catch(() => {});
						await waitForPossibleNavigation(page);
						return; // stop after first meaningful action to avoid stale refs
					}
				} catch {}
			}
		} catch {}
	}
	// As a last step, submit any form mentioning unsubscribe
	try {
		const forms = await page.$$('form');
		for (const form of forms) {
			try {
				const formText = lowered(await page.evaluate((f) => f.innerText || '', form));
				if (formText.includes('unsubscribe') || formText.includes('opt')) {
					await form.evaluate((f) => f.submit()).catch(() => {});
					await waitForPossibleNavigation(page);
					return;
				}
			} catch {}
		}
	} catch {}
}

export async function attemptUnsubscribe(url, options = {}) {
	let browser;
	const userEmail = options.userEmail;
	try {
		browser = await puppeteer.launch(resolvePuppeteerOptions());
		const page = await browser.newPage();
		page.setDefaultNavigationTimeout(30000);
		await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
		await page.goto(url, { waitUntil: 'domcontentloaded' });

		// Ask AI for a plan
		const html = await page.content();
		let steps = [];
		try {
			steps = await planActionsWithAI(url, html, userEmail);
		} catch (e) {}

		if (steps.length) {
			await runPlannedActions(page, steps);
		} else {
			await heuristicUnsubscribe(page, userEmail);
		}

		// Heuristic success check: look for confirmation text
		const bodyText = (await page.evaluate(() => document.body?.innerText || '')).toString();
		const ok = /unsubscribe(d)?|removed|success|updated preferences|opted out/i.test(bodyText);
		return { success: ok, usedAI: steps.length > 0 };
	} catch (err) {
		return { success: false, error: err?.message };
	} finally {
		if (browser) await browser.close();
	}
}

