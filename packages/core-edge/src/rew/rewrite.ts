import type {
  CrawlerMatch,
  FingerprintInfo,
  OptimizationLevel,
  SemanticPayload,
  SynSwarmRouterConfig,
  TargetModel,
} from '../types.js';
import {
  buildMinimalEntityGraph,
  extractPageFromHtml,
  isEmptyCsrShell,
  mergeEntityGraphs,
} from '../sss/entity.js';
import {
  injectLevel1Fingerprint,
  normalizedContentHash,
  parseFingerprintFromHtml,
} from '../sss/fingerprint.js';
import { normalizeOriginText, sha256Prefixed } from '../utils/crypto.js';
import { DEFAULT_TARGET_MODELS } from '../det/registry.js';

export interface RewriteContext {
  url: string;
  html: string;
  crawler: CrawlerMatch;
  config: ResolvedConfig;
  prevToken?: string;
}

export interface ResolvedConfig extends Required<
  Pick<
    SynSwarmRouterConfig,
    | 'optimizationLevel'
    | 'profileMode'
    | 'outputFormat'
    | 'autoExtractEntity'
    | 'autoInjectFingerprint'
    | 'fingerprintTag'
    | 'rewriteEngineId'
  >
> {
  targetModels: TargetModel[];
  entityGraph?: Record<string, unknown>;
  auditEnabled: boolean;
  auditChainEnabled: boolean;
}

export function resolveConfig(config: SynSwarmRouterConfig = {}): ResolvedConfig {
  return {
    targetModels: config.targetModels ?? DEFAULT_TARGET_MODELS,
    optimizationLevel: config.optimizationLevel ?? 'conservative',
    profileMode: config.profileMode ?? 'unified',
    outputFormat: config.outputFormat ?? 'semantic-json',
    autoExtractEntity: config.autoExtractEntity ?? true,
    autoInjectFingerprint: config.autoInjectFingerprint ?? false,
    fingerprintTag: config.fingerprintTag ?? 'swarmgeo-verified',
    rewriteEngineId: config.rewriteEngineId ?? '@synswarm/core-edge@2026.1.0',
    entityGraph: config.entityGraph,
    auditEnabled: config.audit?.enabled ?? true,
    auditChainEnabled: config.audit?.chainEnabled ?? false,
  };
}

export function buildSemanticPayload(ctx: RewriteContext): SemanticPayload {
  const { url, html, crawler, config, prevToken } = ctx;
  const retrievedAt = new Date().toISOString();
  let workingHtml = html;

  if (config.autoInjectFingerprint) {
    workingHtml = injectLevel1Fingerprint(workingHtml, config.fingerprintTag, url);
  }

  const extracted = extractPageFromHtml(workingHtml, url);
  const contentHash = normalizedContentHash(workingHtml);
  const fingerprint = parseFingerprintFromHtml(workingHtml, url);
  const autoGraph = config.autoExtractEntity
    ? buildMinimalEntityGraph(url, extracted)
    : undefined;
  const entityGraph = mergeEntityGraphs(
    autoGraph ?? { '@context': 'https://schema.org', '@graph': [] },
    config.entityGraph,
    extracted.jsonLdBlocks,
  );

  const targetModels =
    config.profileMode === 'per-crawler'
      ? [crawler.family]
      : config.targetModels;

  const shaped = shapeContent(extracted, config.optimizationLevel, targetModels);

  const payload: SemanticPayload = {
    synswarm: {
      protocol: '2026.1',
      rewriteProfile: {
        optimizationLevel: config.optimizationLevel,
        targetModels,
      },
      source: {
        url,
        retrievedAt,
        contentHash: `sha256:${contentHash}`,
      },
    },
    entityGraph,
    content: shaped,
    fingerprint: sanitizeFingerprint(fingerprint),
  };

  if (config.auditEnabled) {
    payload.audit = buildAuditBlock({
      url,
      retrievedAt,
      contentHash,
      fingerprint: payload.fingerprint,
      rewriteEngine: config.rewriteEngineId,
      prevToken: config.auditChainEnabled ? prevToken : undefined,
    });
  }

  return payload;
}

function sanitizeFingerprint(fingerprint: FingerprintInfo): FingerprintInfo {
  if (fingerprint.level === 0) {
    return { verified: false, level: 0, tag: null };
  }
  return fingerprint;
}

function shapeContent(
  extracted: ReturnType<typeof extractPageFromHtml>,
  level: OptimizationLevel,
  targetModels: TargetModel[],
): SemanticPayload['content'] {
  let sections = extracted.sections;
  let summary = extracted.description || extracted.title;

  if (level === 'balanced' || level === 'aggressive') {
    sections = sections.filter((s) => s.body.length > 20);
  }

  if (level === 'aggressive') {
    summary = truncateWords(summary, 120);
    sections = sections.slice(0, 12);
  }

  if (targetModels[0] === 'SearchGPT') {
    summary = truncateWords(summary, 120);
  }

  return {
    title: extracted.title,
    summary,
    sections,
  };
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(' ')}…`;
}

function buildAuditBlock(input: {
  url: string;
  retrievedAt: string;
  contentHash: string;
  fingerprint?: FingerprintInfo;
  rewriteEngine: string;
  prevToken?: string;
}): NonNullable<SemanticPayload['audit']> {
  const parts = [
    '2026.1',
    input.url,
    input.retrievedAt,
    `sha256:${input.contentHash}`,
    String(input.fingerprint?.level ?? 0),
    input.fingerprint?.signature ?? '',
  ];
  if (input.prevToken) {
    parts.push(input.prevToken);
  }
  const digestInput = parts.join('|');

  return {
    transparencyToken: sha256Prefixed(digestInput),
    originContentHash: `sha256:${input.contentHash}`,
    rewriteEngine: input.rewriteEngine,
    ...(input.prevToken ? { prevToken: input.prevToken } : {}),
  };
}

export function serializePayload(
  payload: SemanticPayload,
  format: 'semantic-json' | 'markdown',
): string {
  if (format === 'markdown') {
    return serializeMarkdown(payload);
  }
  return JSON.stringify(payload, null, 2);
}

function serializeMarkdown(payload: SemanticPayload): string {
  const frontMatter = {
    synswarm: payload.synswarm,
    entityGraph: payload.entityGraph,
    fingerprint: payload.fingerprint,
    audit: payload.audit,
  };
  const lines = [
    '---',
    JSON.stringify(frontMatter, null, 2),
    '---',
    `# ${payload.content.title}`,
    '',
    payload.content.summary ?? '',
    '',
  ];
  for (const section of payload.content.sections) {
    lines.push(`${'#'.repeat(section.level ?? 2)} ${section.heading}`, '', section.body, '');
  }
  return lines.join('\n');
}

export function isCsrEmptyShell(html: string, url: string): boolean {
  return isEmptyCsrShell(extractPageFromHtml(html, url));
}

export function normalizedTextFromHtml(html: string): string {
  return normalizeOriginText(
    extractPageFromHtml(html, 'https://example.com').visibleText,
  );
}
