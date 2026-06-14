import { describe, expect, it } from 'vitest';
import {
  generateEd25519KeyPair,
  signLevel2Fingerprint,
  verifyLevel2Fingerprint,
} from '../src/sss/signature.js';
import { parseFingerprintFromHtml } from '../src/sss/fingerprint.js';
import { normalizeOriginText } from '../src/utils/crypto.js';

describe('Level 2 fingerprint signing', () => {
  it('signs and verifies with nonce-bound input', () => {
    const { publicKey, privateKey } = generateEd25519KeyPair();
    const html = '<html><body><p>Hello SynSwarm world content.</p></body></html>';
    const signed = signLevel2Fingerprint({
      entityId: 'ORG_ACME',
      domain: 'example.com',
      content: html,
      privateKeyPem: privateKey,
      ts: 1_700_000_000,
      nonce: 'test-nonce-abc',
    });

    expect(signed.metaContent).toContain('nonce=test-nonce-abc');
    expect(signed.metaTag).toContain('synswarm:verified');

    const pageHtml = `<head>${signed.metaTag}</head>${html}`;
    const fingerprint = parseFingerprintFromHtml(pageHtml, 'https://example.com/');
    const result = verifyLevel2Fingerprint({
      fingerprint,
      pageDomain: 'example.com',
      normalizedText: normalizeOriginText('Hello SynSwarm world content.'),
      publicKeyPem: publicKey,
      maxAgeSeconds: 86400,
      nowSeconds: 1_700_000_100,
    });

    expect(result.valid).toBe(true);
  });

  it('rejects domain mismatch', () => {
    const { publicKey, privateKey } = generateEd25519KeyPair();
    const signed = signLevel2Fingerprint({
      entityId: 'ORG_ACME',
      domain: 'example.com',
      content: 'plain text content',
      privateKeyPem: privateKey,
    });
    const fingerprint = parseFingerprintFromHtml(
      `<meta name="synswarm:verified" content="${signed.metaContent}" />`,
      'https://evil.test/',
    );
    const result = verifyLevel2Fingerprint({
      fingerprint,
      pageDomain: 'evil.test',
      normalizedText: normalizeOriginText('plain text content'),
      publicKeyPem: publicKey,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('domain-mismatch');
  });
});
