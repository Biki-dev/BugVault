export function normalizeErrorText(raw: string): string {
  let text = raw;

  // Strip absolute file paths (unix + windows), keep just the filename
  text = text.replace(/(?:[a-zA-Z]:)?[\\/][\w\-./\\]+?([\w\-]+\.\w+)/g, '$1');

  // Strip line:col numbers like ":123:45"
  text = text.replace(/:\d+:\d+/g, '');
  text = text.replace(/\bline \d+\b/gi, 'line N');

  // Strip standalone line numbers in stack frames like "(file.js:42)"
  text = text.replace(/:\d+\)/g, ')');

  // Strip hex memory addresses
  text = text.replace(/0x[0-9a-fA-F]+/g, '0xADDR');

  // Strip ISO timestamps
  text = text.replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z)?/g, 'TIMESTAMP');

  // Strip UUIDs
  text = text.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'UUID');

  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Lowercase for consistency
  return text.toLowerCase();
}