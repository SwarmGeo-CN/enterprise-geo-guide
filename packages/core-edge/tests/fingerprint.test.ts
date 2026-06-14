import { describe, expect, it } from 'vitest';
import {
  buildLevel1MetaContent,
  injectLevel1Fingerprint,
  parseFingerprintFromHtml,
} from '../src/sss/fingerprint.js';

const SAMPLE_HTML = `<!doctype html>
<html><head>
<title>Acme Corp</title>
<meta name="description" content="We build widgets." />
</head><body><h1>Hello</h1><p>Content here for crawlers.</p></body></html>`;

describe('Semantic fingerprint', () => {
  it('builds domain-bound Level 1 content', () => {
    expect(buildLevel1MetaContent('swarmgeo-verified', 'example.com')).toBe(
      'swarmgeo-verified;domain=example.com',
    );
  });

  it('injects Level 1 meta into head', () => {
    const html = injectLevel1Fingerprint(
      SAMPLE_HTML,
      'swarmgeo-verified',
      'https://www.example.com/page',
    );
    expect(html).toContain('synswarm:verified');
    expect(html).toContain('domain=example.com');
  });

  it('parses Level 1 fingerprint with domain match', () => {
    const html = injectLevel1Fingerprint(
      SAMPLE_HTML,
      'swarmgeo-verified',
      'https://example.com/',
    );
    const fp = parseFingerprintFromHtml(html, 'https://example.com/');
    expect(fp.level).toBe(1);
    expect(fp.verified).toBe(true);
    expect(fp.domain).toBe('example.com');
  });

  it('marks legacy bare tag as unverified', () => {
    const html = `${SAMPLE_HTML}<!-- swarmgeo-verified -->`;
    const fp = parseFingerprintFromHtml(html, 'https://example.com/');
    expect(fp.level).toBe(1);
    expect(fp.verified).toBe(false);
  });
});
