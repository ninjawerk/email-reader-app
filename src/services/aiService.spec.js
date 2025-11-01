import { jest } from '@jest/globals';
jest.unstable_mockModule('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [ { message: { content: JSON.stringify({ categoryId: '123', categoryName: 'General', summary: 'Short' }) } } ]
        })
      }
    }
  }))
}));
jest.unstable_mockModule('../models/Category.js', () => ({
  default: { find: jest.fn(() => ({ lean: () => Promise.resolve([{ _id: '123', name: 'General', description: '' }]) })) }
}));

const { categorizeAndSummarize } = await import('./aiService.js');

describe('aiService.categorizeAndSummarize', () => {
  test('returns parsed category and summary', async () => {
    const r = await categorizeAndSummarize('user1', { subject: 'Hello', from: 'x@y.com', snippet: 's', rawText: 'body' });
    expect(r).toEqual({ categoryId: '123', categoryName: 'General', summary: 'Short' });
  });
});

