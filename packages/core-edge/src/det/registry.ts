import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CrawlerMatch, CrawlerRegistryFile, RegistryEntry, TargetModel } from '../types.js';

function loadBundledRegistry(): CrawlerRegistryFile {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, '../../data/crawler-registry.json'),
    join(here, '../../../../standards/crawler-registry.json'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf8')) as CrawlerRegistryFile;
    }
  }
  throw new Error('SynSwarm crawler registry not found');
}

let activeRegistry: CrawlerRegistryFile = loadBundledRegistry();
let lastFetchedAt = 0;

export function getRegistry(): CrawlerRegistryFile {
  return activeRegistry;
}

export async function refreshRegistry(
  url?: string,
  ttlSeconds = 86400,
): Promise<CrawlerRegistryFile> {
  const now = Date.now();
  const meta = activeRegistry.registry;
  if (now - lastFetchedAt < ttlSeconds * 1000) {
    return activeRegistry;
  }

  const target = url ?? meta.canonicalUrl;
  try {
    const response = await fetch(target, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return activeRegistry;
    }
    const remote = (await response.json()) as CrawlerRegistryFile;
    if (remote.registry?.version && remote.entries?.length) {
      activeRegistry = remote;
      lastFetchedAt = now;
    }
  } catch {
    // Fall back to bundled copy per spec §4.3.
  }
  return activeRegistry;
}

export function setRegistryForTests(registry: CrawlerRegistryFile): void {
  activeRegistry = registry;
  lastFetchedAt = Date.now();
}

function compilePattern(pattern: string): RegExp {
  return new RegExp(pattern, 'i');
}

export function matchCrawler(
  userAgent: string,
  excludeIds: string[] = [],
): CrawlerMatch | null {
  if (!userAgent) {
    return null;
  }

  for (const entry of activeRegistry.entries) {
    if (excludeIds.includes(entry.id)) {
      continue;
    }
    const regex = compilePattern(entry.pattern);
    if (regex.test(userAgent)) {
      return {
        id: entry.id,
        family: entry.family,
        confidence: 'certain',
      };
    }
  }
  return null;
}

export function isAICrawlerUserAgent(
  userAgent: string,
  excludeIds: string[] = [],
): boolean {
  return matchCrawler(userAgent, excludeIds) !== null;
}

export function listRegistryEntries(): RegistryEntry[] {
  return [...activeRegistry.entries];
}

export const DEFAULT_TARGET_MODELS: TargetModel[] = [
  'SearchGPT',
  'Perplexity',
  'Claude',
];
