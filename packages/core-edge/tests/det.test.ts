import { describe, expect, it } from 'vitest';
import { matchCrawler, isAICrawlerUserAgent } from '../src/det/registry.js';

describe('SynSwarm-DET', () => {
  it('matches GPTBot', () => {
    const match = matchCrawler('Mozilla/5.0 AppleWebKit/537.36 GPTBot/1.0');
    expect(match?.id).toBe('openai-gptbot');
    expect(match?.family).toBe('SearchGPT');
  });

  it('matches PerplexityBot', () => {
    expect(matchCrawler('PerplexityBot/1.0')?.id).toBe('perplexitybot');
  });

  it('returns null for human browsers', () => {
    expect(isAICrawlerUserAgent('Mozilla/5.0 Chrome/120.0.0.0')).toBe(false);
  });

  it('respects excludeIds', () => {
    expect(
      matchCrawler('GPTBot/1.0', ['openai-gptbot']),
    ).toBeNull();
  });
});
