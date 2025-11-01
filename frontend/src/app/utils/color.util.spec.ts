import { colorFromString } from './color.util';

describe('colorFromString', () => {
  it('returns a hex color string', () => {
    const c = colorFromString('test@example.com');
    expect(typeof c).toBe('string');
    expect(c.startsWith('#')).toBe(true);
  });

  it('is deterministic for same input', () => {
    const a = colorFromString('abc');
    const b = colorFromString('abc');
    expect(a).toBe(b);
  });

  it('differs for different inputs (likely)', () => {
    const a = colorFromString('a@example.com');
    const b = colorFromString('b@example.com');
    expect(a).not.toBe(b);
  });
});

