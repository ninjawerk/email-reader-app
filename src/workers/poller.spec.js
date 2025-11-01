import { jest } from '@jest/globals';

// Capture scheduled cron job
let scheduledExpression;
let scheduledTask;

jest.unstable_mockModule('node-cron', () => ({
  default: {
    schedule: jest.fn((expr, fn) => { scheduledExpression = expr; scheduledTask = fn; }),
  },
}));

// Mocks for models
const saveMock = jest.fn(async () => {});
const AccountMock = {
  find: jest.fn(async () => ([{ _id: 'acc1', userId: 'u1', active: true, lastCheckedAt: null, save: saveMock }])),
};

const EmailMock = {
  findOne: jest.fn(async ({ gmailMessageId }) => (gmailMessageId === 'm1' ? { _id: 'existing' } : null)),
  create: jest.fn(async () => ({})),
};

const CategoryMock = {
  find: jest.fn(() => ({ lean: () => Promise.resolve([{ _id: 'cat123', name: 'News' }]) })),
};

jest.unstable_mockModule('../models/Account.js', () => ({ default: AccountMock }));
jest.unstable_mockModule('../models/Email.js', () => ({ default: EmailMock }));
jest.unstable_mockModule('../models/Category.js', () => ({ default: CategoryMock }));

// Mock gmail service helpers
const gmail = {
  refreshIfNeeded: jest.fn(async () => ({})),
  listRecentUnread: jest.fn(async () => ([{ id: 'm1' }, { id: 'm2' }])),
  getMessage: jest.fn(async (auth, id) => ({
    id,
    internalDate: String(Date.now()),
    threadId: 't-' + id,
    labelIds: ['INBOX'],
    snippet: 'snip',
    payload: { headers: [ { name: 'Subject', value: 'Hello' }, { name: 'From', value: 'a@b.com' } ] },
  })),
  archiveMessage: jest.fn(async () => {}),
  findParts: jest.fn(() => ([
    { mimeType: 'text/plain', body: { data: Buffer.from('body').toString('base64').replace(/\+/g,'-').replace(/\//g,'_') } },
    { mimeType: 'text/html', body: { data: Buffer.from('<p>hi</p>').toString('base64').replace(/\+/g,'-').replace(/\//g,'_') } },
  ])),
  decodeBody: jest.fn(({ data }) => Buffer.from(String(data).replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf-8')),
  extractHeader: jest.fn((headers, name) => {
    const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return h && h.value;
  }),
  extractUnsubscribeLinks: jest.fn(() => (['mailto:unsub@example.com'])),
};

jest.unstable_mockModule('../services/gmailService.js', () => ({
  refreshIfNeeded: gmail.refreshIfNeeded,
  listRecentUnread: gmail.listRecentUnread,
  getMessage: gmail.getMessage,
  archiveMessage: gmail.archiveMessage,
  findParts: gmail.findParts,
  decodeBody: gmail.decodeBody,
  extractHeader: gmail.extractHeader,
  extractUnsubscribeLinks: gmail.extractUnsubscribeLinks,
}));

// Mock AI service
jest.unstable_mockModule('../services/aiService.js', () => ({
  categorizeAndSummarize: jest.fn(async () => ({ categoryId: 'cat123', categoryName: 'News', summary: 'Short' })),
}));

const { startPoller } = await import('./poller.js');

describe('poller.startPoller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('schedules with default cron when env missing and processes accounts/messages', async () => {
    delete process.env.POLL_INTERVAL_CRON;
    startPoller();
    expect(scheduledExpression).toBe('*/2 * * * *');
    // invoke scheduled job
    await scheduledTask();

    // It should look up active accounts
    expect(AccountMock.find).toHaveBeenCalledWith({ active: true });

    // m1 exists -> skipped create; m2 created
    expect(EmailMock.create).toHaveBeenCalledTimes(1);
    expect(EmailMock.create.mock.calls[0][0]).toMatchObject({ gmailMessageId: 'm2', subject: 'Hello', from: 'a@b.com' });

    // archive called for both messages (even if first skipped after existence check? the code archives after create; so ensure at least once)
    expect(gmail.archiveMessage).toHaveBeenCalledTimes(1);

    // account saved with lastCheckedAt set
    expect(saveMock).toHaveBeenCalled();
  });

  test('uses env cron when provided', async () => {
    process.env.POLL_INTERVAL_CRON = '*/5 * * * *';
    startPoller();
    expect(scheduledExpression).toBe('*/5 * * * *');
  });
});


