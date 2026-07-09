import { describe, it, expect } from 'vitest';
import { fingerprintError } from '../src/normalize/fingerprint';

describe('fingerprintError', () => {
  it('same error at different positions produces same fingerprint', () => {
    const a = fingerprintError('TypeError: x is undefined at foo.js:10:5');
    const b = fingerprintError('TypeError: x is undefined at foo.js:99:2');
    expect(a).toBe(b);
  });

  it('different errors produce different fingerprints', () => {
    const a = fingerprintError('TypeError: x is undefined');
    const b = fingerprintError('ReferenceError: y is not defined');
    expect(a).not.toBe(b);
  });

  it('produces a stable sha256 hex string', () => {
    const fp = fingerprintError('some error');
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });
});