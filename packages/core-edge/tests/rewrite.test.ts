import { describe, expect, it } from 'vitest';
import { buildSemanticPayload, resolveConfig } from '../src/rew/rewrite.js';

const HTML = `<!doctype html>
<html><head>
<title>Acme Corp</title>
<meta name="description" content="Enterprise widgets since 1999." />
<script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script>
</head><body>
<h1>About Acme</h1><p>We ship reliable widget platforms worldwide with 24/7 support and transparent pricing.</p>
</body></html>`;

describe('SynSwarm-REW', () => {
  it('builds conservative semantic payload with auto entity extraction', () => {
    const payload = buildSemanticPayload({
      url: 'https://acme.example/about',
      html: HTML,
      crawler: { id: 'openai-gptbot', family: 'SearchGPT', confidence: 'certain' },
      config: resolveConfig({
        optimizationLevel: 'conservative',
        autoExtractEntity: true,
        autoInjectFingerprint: true,
      }),
    });

    expect(payload.synswarm.protocol).toBe('2026.1');
    expect(payload.content.title).toBe('Acme Corp');
    expect(payload.entityGraph).toBeDefined();
    expect(payload.fingerprint?.level).toBe(1);
    expect(payload.fingerprint?.domain).toBe('acme.example');
    expect(payload.audit?.transparencyToken).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('defaults to conservative optimization for SME path', () => {
    const config = resolveConfig({});
    expect(config.optimizationLevel).toBe('conservative');
    expect(config.autoExtractEntity).toBe(true);
  });
});
