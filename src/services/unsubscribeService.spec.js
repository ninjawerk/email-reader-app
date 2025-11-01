import { jest } from '@jest/globals';

// Simple element handle mock (singleton for assertions)
const elementHandle = { click: jest.fn() };

// Shared puppeteer page/browser mocks
const pageMock = {
  setDefaultNavigationTimeout: jest.fn(),
  setUserAgent: jest.fn(),
  goto: jest.fn(),
  content: jest.fn(async () => '<html><body><a href="#">unsubscribe</a></body></html>'),
  click: jest.fn(),
  waitForTimeout: jest.fn(),
  waitForNavigation: jest.fn().mockRejectedValue(new Error('no nav')),
  $: jest.fn(async () => null),
  $$: jest.fn(async () => [elementHandle]),
  $eval: jest.fn(async () => {}),
  select: jest.fn(async () => {}),
  keyboard: { press: jest.fn(async () => {}) },
  evaluate: jest.fn(async () => 'unsubscribed successfully'),
  waitForSelector: jest.fn(async () => {}),
};

const browserMock = {
  newPage: jest.fn(async () => pageMock),
  close: jest.fn(async () => {}),
};

async function loadServiceWithAI(steps) {
  jest.resetModules();
  jest.unstable_mockModule('puppeteer', () => ({
    default: { launch: jest.fn(async () => browserMock) }
  }));
  jest.unstable_mockModule('openai', () => ({
    default: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: jest.fn(async () => ({ choices: [ { message: { content: JSON.stringify({ steps }) } } ] }) ) } }
    }))
  }));
  const mod = await import('./unsubscribeService.js');
  return mod.attemptUnsubscribe;
}

describe('unsubscribeService.attemptUnsubscribe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    elementHandle.click.mockClear();
    pageMock.click.mockClear();
  });

  test('uses AI plan when steps are provided', async () => {
    const attemptUnsubscribe = await loadServiceWithAI([ { type: 'click', selector: '#btn' } ]);
    const res = await attemptUnsubscribe('https://example.com/unsub', { userEmail: 'x@y.com' });
    expect(pageMock.click).toHaveBeenCalledWith('#btn', { delay: 20 });
    expect(res.usedAI).toBe(true);
  });

  test('falls back to heuristics when no AI plan', async () => {
    const attemptUnsubscribe = await loadServiceWithAI([]);
    const res = await attemptUnsubscribe('https://example.com/unsub', { userEmail: 'x@y.com' });
    expect(elementHandle.click).toHaveBeenCalled();
    expect(res.usedAI).toBe(false);
    expect(res.success).toBe(true);
  });
});


