import { createHash } from 'crypto';
import { normalizeErrorText } from './normalizer';

export function fingerprintError(rawText: string): string {
  const normalized = normalizeErrorText(rawText);
  return createHash('sha256').update(normalized).digest('hex');
}

export function getNormalizedText(rawText: string): string {
  return normalizeErrorText(rawText);
}