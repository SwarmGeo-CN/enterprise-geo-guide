import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { FingerprintInfo } from '../types.js';
import {
  buildLevel2MetaContent,
  buildLevel2MetaTag,
  buildLevel2SigningInput,
} from '../sss/fingerprint.js';
import { normalizeOriginText, randomNonce } from '../utils/crypto.js';

export interface SignFingerprintOptions {
  entityId: string;
  domain: string;
  content: string;
  privateKeyPem: string;
  ts?: number;
  nonce?: string;
}

export interface SignFingerprintResult {
  metaContent: string;
  metaTag: string;
  signingInput: string;
  ts: number;
  nonce: string;
  signature: string;
}

export function signLevel2Fingerprint(
  options: SignFingerprintOptions,
): SignFingerprintResult {
  const ts = options.ts ?? Math.floor(Date.now() / 1000);
  const nonce = options.nonce ?? randomNonce();
  const normalized = normalizeOriginText(
    options.content.includes('<')
      ? stripHtml(options.content)
      : options.content,
  );
  const signingInput = buildLevel2SigningInput(
    options.entityId,
    options.domain,
    ts,
    nonce,
    normalized,
  );
  const privateKey = createPrivateKey(options.privateKeyPem);
  const signatureBuffer = sign(null, Buffer.from(signingInput, 'utf8'), privateKey);
  const signature = signatureBuffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  const metaContent = buildLevel2MetaContent({
    entityId: options.entityId,
    domain: options.domain,
    ts,
    nonce,
    signature,
  });

  return {
    metaContent,
    metaTag: buildLevel2MetaTag({
      entityId: options.entityId,
      domain: options.domain,
      ts,
      nonce,
      signature,
    }),
    signingInput,
    ts,
    nonce,
    signature,
  };
}

export function verifyLevel2Fingerprint(options: {
  fingerprint: FingerprintInfo;
  pageDomain: string;
  normalizedText: string;
  publicKeyPem: string;
  maxAgeSeconds?: number;
  nowSeconds?: number;
}): { valid: boolean; reason?: string } {
  const { fingerprint, pageDomain, normalizedText, publicKeyPem } = options;
  if (fingerprint.level !== 2) {
    return { valid: false, reason: 'not-level-2' };
  }
  if (!fingerprint.entityId || !fingerprint.domain || !fingerprint.signature || !fingerprint.nonce) {
    return { valid: false, reason: 'missing-fields' };
  }
  if (fingerprint.domain !== pageDomain) {
    return { valid: false, reason: 'domain-mismatch' };
  }

  const ts = fingerprint.signedAt
    ? Math.floor(new Date(fingerprint.signedAt).getTime() / 1000)
    : undefined;
  if (ts !== undefined) {
    const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
    const maxAge = options.maxAgeSeconds ?? 86400;
    if (now - ts > maxAge) {
      return { valid: false, reason: 'expired' };
    }
  }

  const signingInput = buildLevel2SigningInput(
    fingerprint.entityId,
    fingerprint.domain,
    ts ?? 0,
    fingerprint.nonce,
    normalizedText,
  );

  const signature = Buffer.from(
    fingerprint.signature.replace(/-/g, '+').replace(/_/g, '/'),
    'base64',
  );
  const publicKey = createPublicKey(publicKeyPem);
  const ok = verify(null, Buffer.from(signingInput, 'utf8'), publicKey, signature);
  return ok ? { valid: true } : { valid: false, reason: 'bad-signature' };
}

export function generateEd25519KeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}

export function readKeyFile(path: string): string {
  return readFileSync(path, 'utf8');
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}
