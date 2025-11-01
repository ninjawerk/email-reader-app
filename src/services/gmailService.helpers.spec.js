import { extractHeader, decodeBody, extractUnsubscribeLinks, findParts } from './gmailService.js';

describe('gmailService helpers', () => {
  test('extractHeader returns header value case-insensitively', () => {
    const headers = [{ name: 'Subject', value: 'Hello' }, { name: 'FROM', value: 'a@b.com' }];
    expect(extractHeader(headers, 'subject')).toBe('Hello');
    expect(extractHeader(headers, 'from')).toBe('a@b.com');
  });

  test('decodeBody handles base64url', () => {
    const text = 'Hello world';
    const data = Buffer.from(text).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
    expect(decodeBody({ data })).toBe(text);
  });

  test('extractUnsubscribeLinks finds list-unsubscribe and html/text links', () => {
    const headers = [{ name: 'List-Unsubscribe', value: '<mailto:unsub@example.com>, <https://example.com/unsub>' }];
    const html = '<a href="https://example.com/unsubscribe">Unsubscribe</a>';
    const text = 'click https://example.com/unsub to unsubscribe';
    const links = extractUnsubscribeLinks(headers, html, text);
    expect(links).toEqual(expect.arrayContaining([
      'mailto:unsub@example.com',
      'https://example.com/unsub',
      'https://example.com/unsubscribe'
    ]));
  });

  test('findParts flattens nested payload parts', () => {
    const payload = { parts: [ { mimeType: 'multipart/alternative', parts: [ { mimeType: 'text/plain', body: { data: 'dA==' } }, { mimeType: 'text/html', body: { data: 'aA==' } } ] } ] };
    const parts = findParts(payload);
    expect(parts.map(p => p.mimeType)).toEqual(expect.arrayContaining(['text/plain', 'text/html']));
  });
});

