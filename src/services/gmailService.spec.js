import { jest } from '@jest/globals';
import { parseMailto, extractHeader, decodeBody, extractUnsubscribeLinks, findParts } from './gmailService.js';

describe('parseMailto', () => {
  test('parses basic mailto', () => {
    const r = parseMailto('mailto:unsubscribe@example.com');
    expect(r).toEqual({ to: 'unsubscribe@example.com', subject: '', body: '' });
  });

  test('parses mailto with subject and body', () => {
    const r = parseMailto('mailto:unsub@example.com?subject=Please%20unsubscribe&body=Remove%20me');
    expect(r).toEqual({ to: 'unsub@example.com', subject: 'Please unsubscribe', body: 'Remove me' });
  });

  test('returns null when not a mailto', () => {
    expect(parseMailto('https://example.com')).toBeNull();
  });
});


describe('gmailService API wrappers', () => {
  // Mocks for gmail client methods
  const gmailUsersMessages = {
    list: jest.fn(async () => ({ data: { messages: [{ id: 'm1' }, { id: 'm2' }] } })),
    get: jest.fn(async () => ({ data: { id: 'm1', payload: {} } })),
    modify: jest.fn(async () => ({})),
    trash: jest.fn(async () => ({})),
    send: jest.fn(async () => ({})),
  };

  const gmailClientMock = { users: { messages: gmailUsersMessages } };

  let listRecentUnread, getMessage, modifyLabels, archiveMessage, trashMessage, sendEmail;

  beforeAll(async () => {
    jest.resetModules();
    jest.unstable_mockModule('googleapis', () => ({
      google: {
        auth: {
          OAuth2: jest.fn().mockImplementation(() => ({
            setCredentials: jest.fn(),
            refreshAccessToken: jest.fn(async () => ({ credentials: { access_token: 'a', refresh_token: 'r', expiry_date: Date.now() + 3600_000 } })),
          })),
        },
        gmail: jest.fn(() => gmailClientMock),
      },
    }));
    const mod = await import('./gmailService.js');
    listRecentUnread = mod.listRecentUnread;
    getMessage = mod.getMessage;
    modifyLabels = mod.modifyLabels;
    archiveMessage = mod.archiveMessage;
    trashMessage = mod.trashMessage;
    sendEmail = mod.sendEmail;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('listRecentUnread calls gmail.users.messages.list with defaults', async () => {
    const auth = {};
    const r = await listRecentUnread(auth);
    expect(gmailUsersMessages.list).toHaveBeenCalledWith({ userId: 'me', q: 'in:inbox newer_than:7d', maxResults: 50 });
    expect(r).toEqual([{ id: 'm1' }, { id: 'm2' }]);
  });

  test('getMessage calls gmail.users.messages.get with format full', async () => {
    const auth = {};
    const r = await getMessage(auth, 'abc');
    expect(gmailUsersMessages.get).toHaveBeenCalledWith({ userId: 'me', id: 'abc', format: 'full' });
    expect(r).toEqual({ id: 'm1', payload: {} });
  });

  test('modifyLabels calls messages.modify with add/remove labels', async () => {
    const auth = {};
    await modifyLabels(auth, 'abc', ['L1'], ['L2']);
    expect(gmailUsersMessages.modify).toHaveBeenCalledWith({ userId: 'me', id: 'abc', requestBody: { addLabelIds: ['L1'], removeLabelIds: ['L2'] } });
  });

  test('archiveMessage removes INBOX label', async () => {
    const auth = {};
    await archiveMessage(auth, 'xyz');
    expect(gmailUsersMessages.modify).toHaveBeenCalledWith({ userId: 'me', id: 'xyz', requestBody: { addLabelIds: [], removeLabelIds: ['INBOX'] } });
  });

  test('trashMessage calls messages.trash', async () => {
    const auth = {};
    await trashMessage(auth, 't1');
    expect(gmailUsersMessages.trash).toHaveBeenCalledWith({ userId: 'me', id: 't1' });
  });

  test('sendEmail builds proper RFC822 and base64url encodes', async () => {
    const auth = {};
    await sendEmail(auth, { to: 'a@b.com', subject: 'Hi', body: 'Hello' });
    expect(gmailUsersMessages.send).toHaveBeenCalled();
    const arg = gmailUsersMessages.send.mock.calls[0][0];
    expect(arg.userId).toBe('me');
    const raw = arg.requestBody.raw;
    const decoded = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    expect(decoded).toContain('To: a@b.com');
    expect(decoded).toContain('Subject: Hi');
    expect(decoded).toContain('Hello');
  });
});


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
  
  