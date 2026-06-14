import { createHash } from 'node:crypto';
import type { FingerprintInfo } from '../types.js';
import { normalizeOriginText, randomNonce, registrableDomain, sha256Hex } from '../utils/crypto.js';

const LEVEL1_LEGACY = /swarmgeo-verified/i;
const LEVEL1_DOMAIN = /^(?<tag>[^;]+);domain=(?<domain>[^;]+)$/i;
const LEVEL2_META =
  /^v2;entity=(?<entity>[^;]+);domain=(?<domain>[^;]+);ts=(?<ts>\d+);nonce=(?<nonce>[^;]+);sig=(?<sig>[^;]+)$/i;

export function buildLevel1MetaContent(tag: string, domain: string): string {
  return `${tag};domain=${domain}`;
}

export function buildLevel1MetaTag(tag: string, domain: string): string {
  const content = buildLevel1MetaContent(tag, domain);
  return `<meta name="synswarm:verified" content="${content}" />`;
}

export function injectLevel1Fingerprint(html: string, tag: string, url: string): string {
  const domain = registrableDomain(url);
  const meta = buildLevel1MetaTag(tag, domain);
  if (html.includes('name="synswarm:verified"')) {
    return html;
  }
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}\n  ${meta}`);
  }
  return `${meta}\n${html}`;
}

export function parseFingerprintFromHtml(
  html: string,
  pageUrl: string,
): FingerprintInfo {
  const pageDomain = registrableDomain(pageUrl);
  const metaMatch = html.match(
    /<meta[^>]+name=["']synswarm:verified["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  ) ?? html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']synswarm:verified["'][^>]*>/i,
  );

  if (metaMatch?.[1]) {
    const content = metaMatch[1].trim();
    const level2 = LEVEL2_META.exec(content);
    if (level2?.groups) {
      const domain = level2.groups.domain;
      return {
        verified: domain === pageDomain,
        level: 2,
        tag: 'swarmgeo-verified',
        domain,
        entityId: level2.groups.entity,
        signature: level2.groups.sig,
        nonce: level2.groups.nonce,
        signedAt: new Date(Number(level2.groups.ts) * 1000).toISOString(),
      };
    }

    const level1 = LEVEL1_DOMAIN.exec(content);
    if (level1?.groups) {
      const domain = level1.groups.domain;
      return {
        verified: domain === pageDomain,
        level: 1,
        tag: level1.groups.tag.trim(),
        domain,
      };
    }

    if (LEVEL1_LEGACY.test(content)) {
      return {
        verified: false,
        level: 1,
        tag: content,
        domain: pageDomain,
      };
    }
  }

  if (LEVEL1_LEGACY.test(html)) {
    return {
      verified: false,
      level: 1,
      tag: 'swarmgeo-verified',
      domain: pageDomain,
    };
  }

  return { verified: false, level: 0, tag: null };
}

export function buildLevel2SigningInput(
  entityId: string,
  domain: string,
  ts: number,
  nonce: string,
  normalizedText: string,
): string {
  const contentHash = sha256Hex(normalizedText);
  return `v2|${entityId}|${domain}|${ts}|${nonce}|${contentHash}`;
}

export function buildLevel2MetaContent(options: {
  entityId: string;
  domain: string;
  ts?: number;
  nonce?: string;
  signature: string;
}): string {
  const ts = options.ts ?? Math.floor(Date.now() / 1000);
  const nonce = options.nonce ?? randomNonce();
  return `v2;entity=${options.entityId};domain=${options.domain};ts=${ts};nonce=${nonce};sig=${options.signature}`;
}

export function buildLevel2MetaTag(options: {
  entityId: string;
  domain: string;
  ts?: number;
  nonce?: string;
  signature: string;
}): string {
  const content = buildLevel2MetaContent(options);
  return `<meta name="synswarm:verified" content="${content}" />`;
}

export function normalizedContentHash(html: string): string {
  const text = normalizeOriginText(stripHtml(html));
  return sha256Hex(text);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

export function hashDigest(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
