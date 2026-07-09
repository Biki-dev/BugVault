import { describe, it, expect } from 'vitest';
import { normalizeErrorText } from '../src/normalize/normalizer';

describe('normalizeErrorText', () => {
  it('strips absolute paths down to filename', () => {
    const raw = 'Error at /Users/dev/project/src/index.ts:42:10';
    expect(normalizeErrorText(raw)).toContain('index.ts');
    expect(normalizeErrorText(raw)).not.toContain('/Users/dev');
  });

  it('normalizes windows paths too', () => {
    const raw = 'Error at C:\\Users\\dev\\project\\index.ts:42:10';
    expect(normalizeErrorText(raw)).toContain('index.ts');
  });

  it('produces identical output for same error at different line numbers', () => {
    const a = normalizeErrorText('TypeError: x is undefined at foo.js:10:5');
    const b = normalizeErrorText('TypeError: x is undefined at foo.js:99:2');
    expect(a).toBe(b);
  });

  it('strips timestamps and hex addresses', () => {
    const raw = 'Crash at 0x7fff5fbff8c0 on 2026-07-08T10:00:00Z';
    const out = normalizeErrorText(raw);
    expect(out).not.toContain('0x7fff5fbff8c0');
    expect(out).not.toMatch(/08-07-2026/);
  });
});