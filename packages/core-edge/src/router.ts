import type {
  CrawlerMatch,
  SynSwarmRequest,
  SynSwarmRouterConfig,
  WellKnownDiscovery,
} from './types.js';
import {
  isAICrawlerUserAgent,
  matchCrawler,
  refreshRegistry,
} from './det/registry.js';
import {
  buildSemanticPayload,
  isCsrEmptyShell,
  resolveConfig,
  serializePayload,
} from './rew/rewrite.js';
import {
  buildDiscoveryLinkHeaders,
  buildWellKnownDiscovery,
} from './ad/discovery.js';
import { buildProfileHeader, getHeader } from './utils/crypto.js';

const PROTOCOL_VERSION = '2026.1';
const SEMANTIC_JSON = 'application/vnd.synswarm.semantic+json; version=2026.1';

interface CacheEntry {
  expiresAt: number;
  body: string;
  headers: Record<string, string>;
}

export class SynSwarmRouter {
  private readonly config: SynSwarmRouterConfig;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly tokenChain = new Map<string, string>();

  constructor(config: SynSwarmRouterConfig = {}) {
    this.config = config;
    void refreshRegistry(config.registryUrl, config.registryTtlSeconds);
  }

  isAICrawler(
    userAgent: string,
    options?: { verbose?: false },
  ): boolean;
  isAICrawler(
    userAgent: string,
    options: { verbose: true },
  ): CrawlerMatch | null;
  isAICrawler(
    userAgent: string,
    options?: { verbose?: boolean },
  ): boolean | CrawlerMatch | null {
    const match = matchCrawler(userAgent, this.config.excludeCrawlerIds);
    if (options?.verbose) {
      return match;
    }
    return match !== null;
  }

  async rewriteForIngestion(request: SynSwarmRequest): Promise<Response> {
    const userAgent = getHeader(request.headers, 'user-agent');
    const crawler = matchCrawler(userAgent, this.config.excludeCrawlerIds);
    if (!crawler) {
      return passthroughResponse('rewrite-skipped', '');
    }

    const resolved = resolveConfig(this.config);
    const cacheKey = `${request.url}|${buildProfileHeader(
      resolved.optimizationLevel,
      resolved.targetModels,
    )}|${resolved.profileMode === 'per-crawler' ? crawler.id : 'unified'}`;

    const ttl = this.config.semanticCacheTtlSeconds ?? 300;
    if (ttl > 0) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return new Response(cached.body, { status: 200, headers: cached.headers });
      }
    }

    let originHtml: string;
    try {
      originHtml = await this.fetchOriginHtml(request.url);
    } catch {
      return this.handleOriginFailure('');
    }

    if (isCsrEmptyShell(originHtml, request.url)) {
      if (this.config.passthroughOnOriginFailure !== false) {
        return passthroughResponse('csr-empty-shell', originHtml);
      }
      return errorResponse(502, 'CSR shell without prerender');
    }

    const chainKey = `${request.url}|${buildProfileHeader(
      resolved.optimizationLevel,
      resolved.targetModels,
    )}`;
    const prevToken = this.config.audit?.chainEnabled
      ? this.tokenChain.get(chainKey)
      : undefined;

    const payload = buildSemanticPayload({
      url: request.url,
      html: originHtml,
      crawler,
      config: {
        ...resolved,
        auditEnabled: resolved.auditEnabled,
        auditChainEnabled: this.config.audit?.chainEnabled ?? false,
      },
      prevToken,
    });

    const accept = getHeader(request.headers, 'accept');
    const format =
      resolved.outputFormat === 'markdown' || accept.includes('text/markdown')
        ? 'markdown'
        : 'semantic-json';

    const body = serializePayload(payload, format);
    const targetModels =
      resolved.profileMode === 'per-crawler'
        ? [crawler.family]
        : resolved.targetModels;

    const headers: Record<string, string> = {
      'Content-Type':
        format === 'markdown' ? 'text/markdown; charset=utf-8' : SEMANTIC_JSON,
      'X-SynSwarm-Protocol-Version': PROTOCOL_VERSION,
      'X-SynSwarm-Crawler-Id': crawler.id,
      'X-SynSwarm-Rewrite-Profile': buildProfileHeader(
        resolved.optimizationLevel,
        targetModels,
      ),
      Vary: 'User-Agent',
    };

    if (resolved.profileMode === 'per-crawler') {
      headers.Vary = 'User-Agent, X-SynSwarm-Crawler-Id';
    }

    if (payload.audit?.transparencyToken) {
      headers['X-SynSwarm-Transparency-Token'] = payload.audit.transparencyToken;
      if (this.config.audit?.chainEnabled) {
        this.tokenChain.set(chainKey, payload.audit.transparencyToken);
      }
    }

    if (ttl > 0) {
      this.cache.set(cacheKey, {
        expiresAt: Date.now() + ttl * 1000,
        body,
        headers,
      });
    }

    return new Response(body, { status: 200, headers });
  }

  buildDiscoveryDocument(
    options?: Parameters<typeof buildWellKnownDiscovery>[1],
  ): WellKnownDiscovery {
    return buildWellKnownDiscovery(this.config, options);
  }

  buildDiscoveryHeaders(siteOrigin: string): Record<string, string> {
    return buildDiscoveryLinkHeaders(siteOrigin);
  }

  private async fetchOriginHtml(url: string): Promise<string> {
    const ua =
      this.config.originFetchUserAgent ??
      'Mozilla/5.0 (compatible; SynSwarm-Origin/2026.1)';

    const response = await fetch(url, {
      headers: {
        'User-Agent': ua,
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Origin fetch failed: ${response.status}`);
    }
    return response.text();
  }

  private handleOriginFailure(originHtml: string): Response {
    if (this.config.passthroughOnOriginFailure !== false) {
      return passthroughResponse('origin-unavailable', originHtml);
    }
    return errorResponse(502, 'Origin unavailable');
  }
}

function passthroughResponse(reason: string, body: string): Response {
  return new Response(body, {
    status: body ? 200 : 204,
    headers: {
      'X-SynSwarm-Passthrough': reason,
      'X-SynSwarm-Protocol-Version': PROTOCOL_VERSION,
      'Content-Type': body ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8',
    },
  });
}

function errorResponse(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: {
      'X-SynSwarm-Protocol-Version': PROTOCOL_VERSION,
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

export { isAICrawlerUserAgent, matchCrawler };
