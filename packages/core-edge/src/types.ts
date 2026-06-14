export type TargetModel =
  | 'SearchGPT'
  | 'Perplexity'
  | 'Claude'
  | 'Gemini'
  | 'DeepSeek';

export type OptimizationLevel = 'conservative' | 'balanced' | 'aggressive';
export type ProfileMode = 'unified' | 'per-crawler';
export type DetectionMode = 'basic' | 'extended';
export type OutputFormat = 'semantic-json' | 'markdown';

export interface SynSwarmRouterConfig {
  targetModels?: TargetModel[];
  optimizationLevel?: OptimizationLevel;
  profileMode?: ProfileMode;
  detectionMode?: DetectionMode;
  outputFormat?: OutputFormat;
  registryUrl?: string;
  registryTtlSeconds?: number;
  excludeCrawlerIds?: string[];
  entityGraph?: Record<string, unknown>;
  autoExtractEntity?: boolean;
  autoInjectFingerprint?: boolean;
  fingerprintTag?: string;
  passthroughOnOriginFailure?: boolean;
  semanticCacheTtlSeconds?: number;
  audit?: {
    enabled?: boolean;
    chainEnabled?: boolean;
  };
  signatureMaxAgeSeconds?: number;
  trustRegistryUrl?: string;
  originFetchUserAgent?: string;
  rewriteEngineId?: string;
}

export interface CrawlerMatch {
  id: string;
  family: TargetModel;
  confidence: 'certain' | 'corroborated';
}

export interface SynSwarmRequest {
  url: string;
  headers: Headers | Record<string, string | null | undefined>;
  method?: string;
}

export interface FingerprintInfo {
  verified: boolean;
  level: 0 | 1 | 2;
  tag: string | null;
  domain?: string;
  entityId?: string;
  publicKeyId?: string;
  signature?: string;
  signedAt?: string;
  nonce?: string;
}

export interface SemanticSection {
  heading: string;
  level?: number;
  body: string;
  citations?: Array<{ url: string; label?: string }>;
}

export interface SemanticPayload {
  synswarm: {
    protocol: '2026.1';
    rewriteProfile: {
      optimizationLevel: OptimizationLevel;
      targetModels: TargetModel[];
    };
    source: {
      url: string;
      retrievedAt: string;
      contentHash?: string;
    };
  };
  entityGraph?: Record<string, unknown>;
  content: {
    title: string;
    summary?: string;
    sections: SemanticSection[];
  };
  fingerprint?: FingerprintInfo;
  audit?: {
    transparencyToken?: string;
    originContentHash?: string;
    rewriteEngine?: string;
    prevToken?: string;
  };
}

export interface WellKnownDiscovery {
  protocol: '2026.1';
  rewriteProfiles?: string[];
  fingerprintLevel?: 0 | 1 | 2;
  trustRegistry?: string;
  entityId?: string;
}

export interface RegistryEntry {
  id: string;
  family: TargetModel;
  operator: string;
  pattern: string;
  documentation?: string;
  expectedReverseDns?: string[];
  notes?: string;
}

export interface CrawlerRegistryFile {
  registry: {
    version: string;
    canonicalUrl: string;
    maintainer: string;
    ttlSeconds: number;
    updatePolicy?: string;
  };
  entries: RegistryEntry[];
}
