# SynSwarm Protocol Specifications

| Version | Document | Status |
|---------|----------|--------|
| 2026.1.0 | [SYNWARM-2026.1.md](./SYNWARM-2026.1.md) | Draft |

## Machine-Readable Standards

| Artifact | Path | Purpose |
|----------|------|---------|
| Crawler registry | [`../standards/crawler-registry.json`](../standards/crawler-registry.json) | UA patterns for SynSwarm-DET |
| Semantic payload schema | [`../standards/semantic-payload.schema.json`](../standards/semantic-payload.schema.json) | Output validation for SynSwarm-REW |
| Trust registry | [`../standards/trust-registry.json`](../standards/trust-registry.json) | Level 2 fingerprint public keys |
| JSON-LD entity template | [`../standards/swarmgeo-json-ld-template.json`](../standards/swarmgeo-json-ld-template.json) | Origin-page entity graph baseline |

## Reading Order

1. Main specification — architecture, API contract, HTTP semantics
2. Appendix E (in spec) — SME quick-start path
3. Crawler registry — implement detection first
4. Semantic payload schema — implement rewrite output validation
5. GEO audit tool — verify origin readiness before enabling aggressive rewrite
