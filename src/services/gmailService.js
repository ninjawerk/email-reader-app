'use strict';

import { google } from 'googleapis';
import dayjs from 'dayjs';
import Account from '../models/Account.js';

export function createOAuth2Client(account) {
	const oAuth2Client = new google.auth.OAuth2(
		process.env.GOOGLE_CLIENT_ID,
		process.env.GOOGLE_CLIENT_SECRET,
		process.env.GOOGLE_CALLBACK_URL
	);
	if (account) {
		oAuth2Client.setCredentials({
			access_token: account.accessToken,
			refresh_token: account.refreshToken,
			expiry_date: account.tokenExpiry,
		});
	}
	return oAuth2Client;
}

export async function refreshIfNeeded(account) {
	const client = createOAuth2Client(account);
	if (!account.tokenExpiry || account.tokenExpiry - Date.now() < 60_000) {
		const { credentials } = await client.refreshAccessToken();
		account.accessToken = credentials.access_token || account.accessToken;
		account.refreshToken = credentials.refresh_token || account.refreshToken;
		account.tokenExpiry = credentials.expiry_date || account.tokenExpiry;
		await account.save();
		client.setCredentials(credentials);
	}
	return client;
}

export function gmailClient(auth) {
	return google.gmail({ version: 'v1', auth });
}

export async function listRecentUnread(auth, q = 'in:inbox newer_than:7d') {
	const gmail = gmailClient(auth);
	const { data } = await gmail.users.messages.list({ userId: 'me', q, maxResults: 50 });
	return data.messages || [];
}

export async function getMessage(auth, id) {
	const gmail = gmailClient(auth);
	const { data } = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
	return data;
}

export async function modifyLabels(auth, id, labelsToAdd = [], labelsToRemove = []) {
	const gmail = gmailClient(auth);
	await gmail.users.messages.modify({ userId: 'me', id, requestBody: { addLabelIds: labelsToAdd, removeLabelIds: labelsToRemove } });
}

export async function archiveMessage(auth, id) {
	// Archive by removing INBOX label
	return modifyLabels(auth, id, [], ['INBOX']);
}

export async function trashMessage(auth, id) {
	const gmail = gmailClient(auth);
	await gmail.users.messages.trash({ userId: 'me', id });
}

export function extractHeader(headers, name) {
	const h = headers?.find((x) => x.name?.toLowerCase() === name.toLowerCase());
	return h ? h.value : undefined;
}

export function decodeBody(partBody) {
	if (!partBody || !partBody.data) return '';
	const str = Buffer.from(partBody.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
	return str;
}

export function findParts(payload) {
	const parts = [];
	function walk(p) {
		if (!p) return;
		if (p.parts && p.parts.length) {
			p.parts.forEach(walk);
		} else {
			parts.push(p);
		}
	}
	walk(payload);
	return parts;
}

export function extractUnsubscribeLinks(headers, rawHtml, rawText) {
	const result = [];
	const listUnsub = extractHeader(headers, 'List-Unsubscribe');
	if (listUnsub) {
		listUnsub
			.split(',')
			.map((s) => s.trim().replace(/[<>]/g, ''))
			.forEach((u) => result.push(u));
	}
	const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>\s*unsubscribe\s*<\/a>/gi;
	let m;
	while ((m = linkRegex.exec(rawHtml || ''))) {
		result.push(m[1]);
	}
	const textRegex = /(https?:\/\/[\w\-\.\/?&=%#]+).*unsubscribe/i;
	const mt = textRegex.exec(rawText || '');
	if (mt) result.push(mt[1]);
	return Array.from(new Set(result)).slice(0, 5);
}

export function parseMailto(mailtoUrl) {
	try {
		if (!mailtoUrl?.toLowerCase().startsWith('mailto:')) return null;
		const withoutScheme = mailtoUrl.slice('mailto:'.length);
		const [toPart, query = ''] = withoutScheme.split('?');
		const to = decodeURIComponent(toPart || '').trim();
		const params = new URLSearchParams(query);
		const subject = params.get('subject') ? decodeURIComponent(params.get('subject') || '') : '';
		const body = params.get('body') ? decodeURIComponent(params.get('body') || '') : '';
		return { to, subject, body };
	} catch { return null; }
}

export async function sendEmail(auth, { to, subject, body }) {
	const gmail = gmailClient(auth);
	const lines = [
		`To: ${to}`,
		`Subject: ${subject || ''}`,
		'MIME-Version: 1.0',
		'Content-Type: text/plain; charset=UTF-8',
		'',
		body || ''
	];
	const raw = Buffer.from(lines.join('\r\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
	await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
}
