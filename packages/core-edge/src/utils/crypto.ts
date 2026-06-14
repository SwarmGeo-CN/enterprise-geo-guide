import { createHash, randomBytes } from 'node:crypto';

export function registrableDomain(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();
  return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function sha256Prefixed(input: string): string {
  return `sha256:${sha256Hex(input)}`;
}

export function normalizeOriginText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function randomNonce(bytes = 16): string {
  return toBase64Url(randomBytes(bytes));
}

export function buildProfileHeader(
  optimizationLevel: string,
  targetModels: string[],
): string {
  return `${optimizationLevel}/${targetModels.join('+')}`;
}

export function getHeader(
  headers: Headers | Record<string, string | null | undefined>,
  name: string,
): string {
  if (headers instanceof Headers) {
    return headers.get(name) ?? '';
  }
  const key = Object.keys(headers).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  return (key ? headers[key] : '') ?? '';
}
