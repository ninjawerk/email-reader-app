import { parseMailto } from './gmailService.js';

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

