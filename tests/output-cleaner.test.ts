import { describe, expect, it } from 'vitest';
import { clean, cleanLines } from '../src/output-cleaner.js';

describe('output-cleaner', () => {
  it('strips ANSI escape sequences', () => {
    const input = '\x1B[31merror\x1B[0m: bad thing';
    expect(clean(input)).toBe('error: bad thing');
  });

  it('removes box-drawing characters', () => {
    const input = '┌─────────┐\n│  hello  │\n└─────────┘';
    const out = clean(input);
    expect(out).not.toMatch(/[┌─┐│└┘]/);
    expect(out).toMatch(/hello/);
  });

  it('collapses runs of horizontal whitespace', () => {
    // Note: tabs (\x09) are stripped as control chars before whitespace collapse —
    // matches PAO's PHP regex `[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]` exactly.
    expect(clean('a    b   c')).toBe('a b c');
    expect(clean('a    b\t\tc')).toBe('a bc');
  });

  it('collapses blank lines', () => {
    expect(clean('a\n\n\nb')).toBe('a\nb');
  });

  it('drops control chars but keeps newlines', () => {
    expect(clean('hello\x00\x07\nworld')).toBe('hello\nworld');
  });

  it('cleanLines returns trimmed non-empty lines', () => {
    const input = '  foo  \n\n  bar\n';
    expect(cleanLines(input)).toEqual(['foo', 'bar']);
  });

  it('reduces a typical Astro build snippet meaningfully', () => {
    const noisy =
      '\x1B[36m▶\x1B[0m   building client (vite)\n' +
      '\x1B[32m✔\x1B[0m   built in 4.32s\n' +
      '\n\n' +
      '┌──────────┬────────┐\n' +
      '│ file     │ size   │\n' +
      '└──────────┴────────┘';
    const cleaned = clean(noisy);
    expect(cleaned.length).toBeLessThan(noisy.length / 2);
    expect(cleaned).toMatch(/building client \(vite\)/);
    expect(cleaned).toMatch(/built in 4.32s/);
  });
});
