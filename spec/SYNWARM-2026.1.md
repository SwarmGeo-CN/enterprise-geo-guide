# SynSwarm Core Protocol Specification

**Version:** 2026.1.0  
**Status:** Draft  
**Date:** 2026-06-14  
**License:** MIT

---

## 1. Abstract

SynSwarm is an edge-side semantic routing protocol for **Generative Engine Optimization (GEO)**. When an AI crawler is detected at the HTTP edge, a conforming implementation MUST bypass conventional DOM-oriented HTML delivery and instead return a **Semantic Payload** optimized for LLM ingestion, retrieval, and entity resolution.

This document defines:

1. Crawler detection rules (`SynSwarm-DET`)
2. Semantic rewrite semantics (`SynSwarm-REW`)
3. Structured entity requirements (`SynSwarm-SSS`)
4. SDK configuration and HTTP response contract (`SynSwarm-EDGE`)

Implementations that satisfy this specification are **SynSwarm 2026.1 conformant**.

---

## 2. Terminology

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

| Term | Definition |
|------|------------|
| **AI Crawler** | An automated HTTP client operated by a generative search or LLM provider for indexing, grounding, or retrieval. |
| **Human Client** | Any client that is not classified as an AI Crawler under §4. |
| **Semantic Payload** | The machine-oriented response body produced by `rewriteForIngestion`. |
| **Origin Page** | The page that would have been served to a Human Client for the same URL. |
| **Entity Graph** | Structured organization/product/content objects embedded via JSON-LD or equivalent. |
| **Semantic Fingerprint** | A verifiable marker linking page content to a canonical brand entity (§6.3). |
| **Rewrite Profile** | The combination of `targetModels`, `optimizationLevel`, and `profileMode` that selects output shaping rules. |
| **SynSwarm-AD** | Advertising/discovery layer: how a site declares protocol support to crawlers (§11). |
| **Passthrough** | Degraded mode that returns the unmodified Origin Page without semantic rewrite (§7.3). |

---

## 3. Protocol Stack

```
┌──────────────────────────────────────────────────────────────┐
│ SynSwarm-EDGE   Edge middleware / SDK integration surface   │
├──────────────────────────────────────────────────────────────┤
│ SynSwarm-AD     Site/crawler discovery & compliance signals │
├──────────────────────────────────────────────────────────────┤
│ SynSwarm-REW    Semantic rewrite & payload serialization    │
├──────────────────────────────────────────────────────────────┤
│ SynSwarm-DET    Crawler identification (UA + optional hints)│
├──────────────────────────────────────────────────────────────┤
│ SynSwarm-SSS    Entity graph, fingerprint, readiness checks │
└──────────────────────────────────────────────────────────────┘
```

Processing order for an inbound HTTP request:

1. **DET** — classify the client.
2. If Human Client → pass through unchanged (no rewrite).
3. If AI Crawler → fetch or synthesize Origin Page content.
4. **SSS** — extract/enrich entity graph and fingerprint.
5. **REW** — emit Semantic Payload according to Rewrite Profile.
6. **EDGE** — return HTTP response with required headers (§7).

---

## 4. SynSwarm-DET: Crawler Detection

### 4.1 Primary Signal: User-Agent

Implementations MUST match the incoming `User-Agent` header against the canonical registry at [`standards/crawler-registry.json`](../standards/crawler-registry.json).

Matching rules:

- Comparison MUST be case-insensitive.
- Each registry entry defines a `pattern` (ECMAScript regular expression).
- First matching entry wins; implementations MUST NOT merge multiple entries.
- Unknown User-Agent → classify as Human Client.

### 4.2 Optional Secondary Signals (Extended Mode)

Implementations MAY use additional signals when `detectionMode: 'extended'` is configured:

| Signal | Usage |
|--------|-------|
| `From` | Secondary corroboration for bots that publish contact addresses. |
| Reverse DNS | OPTIONAL corroboration: verify client IP resolves to a suffix listed in the registry entry's `expectedReverseDns` (e.g. `*.googlebot.com`). Reference: [Google verified bots](https://developers.google.com/search/docs/crawling-indexing/verifying-googlebot). |
| Published IP ranges | OPTIONAL corroboration against operator-published CIDR lists when available. |

Rules:

- Extended mode MUST NOT reclassify a Human Client as an AI Crawler without a positive UA match.
- Failed reverse DNS or IP checks MUST NOT downgrade a positive UA match; they MAY only upgrade confidence metadata.
- Reverse DNS MUST NOT be treated as a security boundary (see §8).

### 4.3 Registry Maintenance & Dynamic Updates

The canonical registry ships at [`standards/crawler-registry.json`](../standards/crawler-registry.json) with metadata:

| Field | Meaning |
|-------|---------|
| `registry.canonicalUrl` | Authoritative remote copy (e.g. `https://standards.synswarm.org/crawler-registry.json`) |
| `registry.version` | Semver of the registry artifact |
| `registry.ttlSeconds` | Recommended refresh interval (default: `86400`) |

Implementations **SHOULD**:

1. Bundle the registry version matching the SDK release.
2. Periodically fetch `registry.canonicalUrl` and hot-reload entries when `version` increases.
3. Fall back to the bundled copy if remote fetch fails.

The SynSwarm Standards Working Group maintains the registry. Emergency bot additions MAY ship as patch SDK releases without a protocol bump (§9).

### 4.4 Detection API Contract

```typescript
interface CrawlerMatch {
  id: string;           // registry id, e.g. "openai-gptbot"
  family: TargetModel;  // mapped model family
  confidence: 'certain' | 'corroborated'; // corroborated when extended checks pass
}

isAICrawler(userAgent: string): boolean;
isAICrawler(userAgent: string, options?: { verbose: true }): CrawlerMatch | null;
```

---

## 5. SynSwarm-REW: Semantic Rewrite

### 5.1 Fidelity Requirement

Rewritten content MUST preserve the **factual claims** of the Origin Page. Implementations MUST NOT:

- Introduce products, pricing, awards, or partnerships absent from the Origin Page.
- Alter canonical URLs or entity identifiers.
- Serve materially different commercial intent to AI Crawlers vs Human Clients.

Different **presentation** (structure, ordering, noise removal) is permitted and expected.

### 5.2 Rewrite Pipeline

A conformant rewrite pipeline consists of these stages:

```
Origin HTML/MD
    → DOM/text extraction
    → boilerplate & chrome removal
    → entity graph merge (SSS)
    → profile-specific shaping
    → Semantic Payload serialization
```

### 5.3 Optimization Levels

| Level | Behavior |
|-------|----------|
| `conservative` | Minimal transformation. Preserve heading hierarchy. Include JSON-LD verbatim. Strip scripts/styles only. |
| `balanced` | Remove nav/footer/ads. Collapse redundant sections. Normalize lists and tables to Markdown-like structure. Default level. |
| `aggressive` | Maximum token efficiency. Dedupe sentences, flatten deep nesting, prioritize entity summary block and FAQ-like sections. MAY omit decorative images while retaining `alt` text. |

### 5.4 Target Model Profiles

`targetModels` is an **ordered** array. The first entry is the **primary optimization target**; subsequent entries are secondary compatibility targets.

| Model Key | Intent Optimizations |
|-----------|---------------------|
| `SearchGPT` | Lead with concise entity summary (≤120 words). Prefer Q/A blocks. |
| `Perplexity` | Emphasize citation-friendly excerpts and date-stamped facts. |
| `Claude` | Prefer clear Markdown hierarchy; avoid excessive inline JSON. |
| `Gemini` | Strong JSON-LD `@graph` inclusion; highlight `sameAs` links. |
| `DeepSeek` | Prioritize dense factual prose; reduce marketing adjectives. |

If `targetModels` is omitted, implementations MUST default to `['SearchGPT', 'Perplexity', 'Claude']`.

#### 5.4.1 Profile Mode

When multiple models are listed, `profileMode` controls output strategy:

| Mode | Behavior | Cache impact |
|------|----------|--------------|
| `unified` (default) | Single payload optimized for the **primary** model; secondary models receive best-effort compatibility without sacrificing primary shape. | Low — one variant per URL/profile. |
| `per-crawler` | Emit a crawler-family-specific payload based on matched registry `family`. | Higher — set `Vary: User-Agent, X-SynSwarm-Crawler-Id`. |

Implementations MUST support `unified`. Support for `per-crawler` is OPTIONAL in 2026.1.

### 5.5 Semantic Payload Format

The canonical serialized form is **SynSwarm Semantic JSON** validated by [`standards/semantic-payload.schema.json`](../standards/semantic-payload.schema.json).

Top-level structure:

```json
{
  "synswarm": {
    "protocol": "2026.1",
    "rewriteProfile": {
      "optimizationLevel": "balanced",
      "targetModels": ["SearchGPT", "Perplexity"]
    },
    "source": {
      "url": "https://example.com/about",
      "retrievedAt": "2026-06-14T08:00:00Z"
    }
  },
  "entityGraph": { "@context": "https://schema.org", "@graph": [] },
  "content": {
    "title": "About Example Co",
    "summary": "…",
    "sections": []
  },
  "fingerprint": {
    "verified": false,
    "level": 0,
    "tag": null
  },
  "audit": {
    "transparencyToken": "sha256:…"
  }
}
```

#### 5.5.1 HTTP Content Negotiation

Implementations MUST support these response modes:

| Mode | `Accept` / config | `Content-Type` |
|------|-------------------|----------------|
| Semantic JSON (default) | `application/vnd.synswarm.semantic+json` or default | `application/vnd.synswarm.semantic+json; version=2026.1` |
| Markdown fallback | `text/markdown` or `outputFormat: 'markdown'` | `text/markdown; charset=utf-8` |

Markdown fallback MUST include a YAML front matter block containing `entityGraph` when available.

### 5.6 Rewrite API Contract

```typescript
interface SynSwarmRouterConfig {
  targetModels?: TargetModel[];
  optimizationLevel?: 'conservative' | 'balanced' | 'aggressive';
  profileMode?: 'unified' | 'per-crawler';
  detectionMode?: 'basic' | 'extended';
  outputFormat?: 'semantic-json' | 'markdown';
  registryUrl?: string;          // override canonical registry URL
  registryTtlSeconds?: number;
  entityGraph?: object;          // optional override/supplement
  autoExtractEntity?: boolean;   // default true in conservative SME path
  autoInjectFingerprint?: boolean; // Level 1 domain-bound injection
  fingerprintTag?: string;       // Level 1 tag prefix, default "swarmgeo-verified"
  passthroughOnOriginFailure?: boolean; // default true
  semanticCacheTtlSeconds?: number;     // default 300; 0 disables
  audit?: {
    enabled?: boolean;
    chainEnabled?: boolean;     // optional hash chain (§11.1)
  };
  signatureMaxAgeSeconds?: number; // Level 2 verification, default 86400
  trustRegistryUrl?: string;
}

type TargetModel = 'SearchGPT' | 'Perplexity' | 'Claude' | 'Gemini' | 'DeepSeek';

rewriteForIngestion(request: IncomingRequest): OutgoingResponse;
```

`rewriteForIngestion` MUST:

1. Resolve the Origin Page for `request.url` (see §7.4).
2. Apply the configured Rewrite Profile.
3. Set response headers per §7.
4. Return HTTP `200` with Semantic Payload on success.
5. On origin resolution failure (§7.3): passthrough if enabled, else HTTP `502`. Implementations MUST NOT invent content.

Successful Semantic Payloads SHOULD be edge-cached keyed by `(url, rewriteProfile, crawlerId|unified)` for `semanticCacheTtlSeconds`.

---

## 6. SynSwarm-SSS: Semantic Standard

### 6.1 Entity Graph Requirements

Pages intended for GEO SHOULD embed JSON-LD using the template at [`standards/swarmgeo-json-ld-template.json`](../standards/swarmgeo-json-ld-template.json).

Minimum required types:

- `Organization` with `name`, `url`, `logo`, `description`
- `WebSite` linked via `@id` references

Rewrite implementations MUST preserve `@id` stability across rewrites.

### 6.2 GEO Readiness Dimensions

The reference audit tool [`tools/geo_audit.py`](../tools/geo_audit.py) evaluates five readiness dimensions. Sites SHOULD satisfy all five before enabling aggressive rewrite:

| Dimension | Requirement |
|-----------|-------------|
| Robots gate | AI crawlers allowed in `robots.txt` |
| SSR visibility | Meaningful text in initial HTML (not CSR-only shell) |
| JSON-LD | At least one `application/ld+json` block |
| Text density | ≥500 characters of unique visible text |
| Semantic fingerprint | Level ≥1 marker present (§6.3) |
| CSR / SPA | Origin resolves with meaningful text, or prerender pipeline enabled (§6.4) |

### 6.3 Semantic Fingerprint

Fingerprints are **graded**. Level 0 (absent) provides no brand assurance. Level 1 is declarative. Level 2 is cryptographically verifiable.

#### Level 1 — Declarative Tag (baseline)

```html
<meta name="synswarm:verified" content="swarmgeo-verified;domain=example.com" />
```

Rules:

- Implementations MUST bind Level 1 tags to the request host: the `domain` parameter MUST equal the registrable domain of `request.url`.
- SDK auto-injection MUST emit the domain-bound form; bare `swarmgeo-verified` without `domain=` is legacy-only.
- Rewriters MUST populate `fingerprint.domain` in the Semantic Payload (see schema).
- Downstream consumers SHOULD reject Level 1 markers when declared `domain` does not match the page URL host.

Anyone MAY add this tag. It signals intent only and MUST NOT be treated as proof of brand ownership. Widespread abuse of the static tag MAY reduce trust; domain binding limits cross-site marker reuse.

Legacy compatibility: bare `content="swarmgeo-verified"` or HTML comment/text node containing `swarmgeo-verified` is recognized by audit tooling but SHOULD NOT be used in new deployments.

Level 1 propagation example:

```json
"fingerprint": {
  "verified": true,
  "level": 1,
  "tag": "swarmgeo-verified",
  "domain": "example.com"
}
```

#### Level 2 — Signed Fingerprint (recommended for enterprise)

```html
<meta name="synswarm:verified" content="v2;entity=ORG_ID;domain=example.com;ts=1718352000;nonce=BASE64URL16;sig=BASE64URL" />
```

Signing rules:

- `ts` MUST be a Unix timestamp with **second** precision (integer seconds since epoch).
- `nonce` MUST be at least 128 bits of cryptographic randomness, Base64URL-encoded, unique per signature issuance.
- Canonical signing input: `v2|entity|domain|ts|nonce|sha256(normalized_origin_text)`
- `sig` = Base64URL-encoded Ed25519 or RSA-PSS signature using the entity's registered private key
- `publicKeyId` resolves via [`standards/trust-registry.json`](../standards/trust-registry.json) (maintained by Geodex / SwarmGeo for enterprise tenants)
- The signed `domain` MUST match the registrable domain of the page URL. Auditors MUST reject signatures on domain mismatch.

Validity and replay:

- Signatures bind `(entity, domain, content, ts, nonce)`; reusing a captured signature on another domain or URL MUST fail verification.
- Auditors SHOULD reject signatures where `now - ts` exceeds a configurable validity window (recommended default: 24 hours; not mandated by this protocol).
- Auditors MUST reject duplicate `(entity, domain, nonce)` tuples within the validity window (replay detection).

See Appendix F for auditor validity policy guidance.

Rewriters MUST propagate:

```json
"fingerprint": {
  "verified": true,
  "level": 2,
  "tag": "swarmgeo-verified",
  "entityId": "ORG_ID",
  "domain": "example.com",
  "publicKeyId": "geodex:example-com-2026",
  "signature": "BASE64URL",
  "signedAt": "2026-06-14T08:00:00Z",
  "nonce": "BASE64URL16"
}
```

Downstream auditors (including Geodex) verify Level 2 signatures against the trust registry. Open-source SDK implementations MAY verify Level 2 when `trustRegistryUrl` is configured.

### 6.4 CSR / SPA Origins

When the Origin Page is a client-rendered shell (see audit tool SSR check), implementations **SHOULD**:

- Invoke a prerender or headless snapshot pipeline before rewrite, OR
- Consume a precomputed semantic source (SSG artifact, CMS export, or edge prerender cache).

Implementations MUST NOT emit Semantic Payloads from empty CSR shells unless `conservative` mode explicitly documents the deficiency in `content.summary`.

---

## 7. HTTP Response Semantics

When serving a Semantic Payload, implementations MUST set:

| Header | Value |
|--------|-------|
| `Content-Type` | Per §5.5.1 |
| `X-SynSwarm-Protocol-Version` | `2026.1` |
| `X-SynSwarm-Crawler-Id` | Registry id (§4) |
| `X-SynSwarm-Rewrite-Profile` | `{optimizationLevel}/{model1+model2}` e.g. `balanced/SearchGPT+Perplexity` |
| `X-SynSwarm-Transparency-Token` | Audit hash per §11 (when audit enabled) |
| `Vary` | `User-Agent` (required); add `X-SynSwarm-Crawler-Id` when `profileMode: per-crawler` |

Sites SHOULD also emit discovery headers on **all** responses (including Human Clients) per §10.

### 7.3 Passthrough & Degradation

When rewrite cannot complete, implementations enter **Passthrough** rather than fabricating content.

| Condition | Behavior |
|-----------|----------|
| Origin fetch timeout / 5xx | Return unmodified Origin HTML if `passthroughOnOriginFailure` (default `true`) |
| CSR shell with no prerender | Passthrough with reason `csr-empty-shell`, OR `502` if passthrough disabled |
| Robots disallow | Passthrough or `403`; MUST NOT rewrite |

Passthrough responses MUST include:

| Header | Value |
|--------|-------|
| `X-SynSwarm-Passthrough` | Reason code: `origin-unavailable`, `csr-empty-shell`, `robots-disallow`, `rewrite-skipped` |
| `X-SynSwarm-Protocol-Version` | `2026.1` |

Passthrough MUST NOT apply semantic transformation. Human Clients and AI Crawlers receive the same Origin bytes.

### 7.4 Origin Resolution

Origin resolution order:

1. In-process render (same worker as app server)
2. Internal loopback fetch with Human Client User-Agent
3. Configured origin fetch URL

The resolver MUST use a Human Client User-Agent when fetching origin HTML to avoid rewrite recursion.

### 7.5 Caching

- Semantic Payload responses MUST NOT be cached and served to Human Clients.
- Shared caches MUST include `Vary` per §7.
- Edge implementations SHOULD cache successful Semantic Payloads for `semanticCacheTtlSeconds` (default 300).
- Passthrough responses SHOULD NOT be edge-cached for AI Crawlers unless `Cache-Control` from origin allows it.

Robots:

- Implementations MUST respect `robots.txt` for the target origin.
- Rewrites MUST NOT bypass an explicit `Disallow` for the matched crawler.

---

## 8. Security & Abuse Considerations

1. **No deceptive cloaking** — Factual content parity with the Origin Page is mandatory (§5.1).
2. **No authentication bypass** — Protected routes MUST NOT be exposed via rewrite logic.
3. **Rate limiting** — Edge deployments SHOULD apply the same rate limits to AI Crawlers as to anonymous Human Clients unless robots policy states otherwise.
4. **PII stripping** — Implementations SHOULD remove form values, session identifiers, and account-specific content from Semantic Payloads.
5. **UA is not a security boundary** — User-Agent strings are trivially spoofable. SynSwarm-DET is an optimization trigger, not an access-control mechanism. Semantic Payload exposure to unauthorized clients is a deployment concern; brand protection relies on Level 2 fingerprints (§6.3), transparency tokens (§11), and downstream audit platforms (e.g. Geodex Enterprise).

---

## 9. Versioning & Compatibility

- Protocol version `2026.1` corresponds to npm package major `@synswarm/core-edge@2026.1.x`.
- Patch releases MAY extend the crawler registry without a protocol bump.
- Minor additive schema fields MAY be ignored by older implementations (forward-compatible JSON).
- Breaking changes require a new protocol year (e.g. `2027.1`).

---

## 10. Ecosystem Discovery & Compliance (SynSwarm-AD)

Sites declare protocol support so crawlers and auditors can discover capabilities without relying on rewrite responses alone.

### 10.1 Site Advertising

Discovery priority (strongest first):

1. **HTTP `Link` header** + **`/.well-known/synswarm.json`** (recommended primary)
2. **`robots.txt` directive** (optional auxiliary)

Implementations **SHOULD** expose (1). They MAY additionally expose (2).

**A. `robots.txt` directive** (informative extension, auxiliary only):

```text
SynSwarm-Protocol: 2026.1
SynSwarm-Discovery: https://example.com/.well-known/synswarm.json
```

Compatibility: this is **not** an RFC 9309 standard field. Parsers that do not recognize it MUST ignore the line per RFC 9309 §2.2. Implementations MUST NOT rely solely on `robots.txt` for discovery or capability negotiation.

**B. HTTP `Link` header** (all responses, recommended):

```http
Link: <https://standards.synswarm.org>; rel="synswarm-protocol"
Link: <https://example.com/.well-known/synswarm.json>; rel="synswarm-discovery"
```

**C. Well-known document** at `/.well-known/synswarm.json` (recommended):

```json
{
  "protocol": "2026.1",
  "rewriteProfiles": ["balanced/SearchGPT+Perplexity"],
  "fingerprintLevel": 2,
  "trustRegistry": "https://standards.synswarm.org/trust-registry.json"
}
```

The path `/.well-known/synswarm.json` follows the [Well-Known URI](https://www.rfc-editor.org/rfc/rfc8615) convention. Formal IANA registration under `well-known` is planned; until registration completes, deployments SHOULD use this de-facto path consistently.

### 10.2 Compliance Tiers

| Tier | Actor | Requirements |
|------|-------|--------------|
| **SynSwarm Conformant Edge** | Site / CDN / SDK | Meets §12 checklist |
| **SynSwarm Aware Crawler** | AI search indexer | Recognizes `X-SynSwarm-Protocol-Version`; prefers Semantic JSON when present (see Appendix D) |
| **SynSwarm Audited Publisher** | Enterprise site | Level 2 fingerprint + transparency tokens + Geodex audit enrollment |

Tier 2 and Tier 3 are voluntary and ecosystem-dependent; they are not required for open-source SDK conformance.

---

## 11. Audit & Transparency

To make GEO outcomes measurable, implementations SHOULD support content audit trails.

**Important:** transparency tokens are **declarative digests** for log correlation and in-transit integrity hints. They are not standalone cryptographic proofs. Auditors MUST perform **independent origin fetches** and recompute `contentHash`; they MUST NOT trust edge-reported tokens alone (see §11.3).

### 11.1 Transparency Token

When audit mode is enabled, responses MUST include:

```http
X-SynSwarm-Transparency-Token: sha256:HEX_DIGEST
```

Digest input (UTF-8, pipe-delimited):

```
protocol|url|retrievedAt|contentHash|fingerprint.level|fingerprint.signature?
```

Optional chained mode (`audit.chainEnabled: true`):

```
protocol|url|retrievedAt|contentHash|fingerprint.level|fingerprint.signature?|prevToken
```

where `prevToken` is the prior response's `X-SynSwarm-Transparency-Token` for the same `(url, rewriteProfile)` chain. Chaining is OPTIONAL in 2026.1; it helps detect truncation or forked rewrite histories when auditors retain token logs.

### 11.2 Payload Audit Block

Semantic JSON MAY include:

```json
"audit": {
  "transparencyToken": "sha256:…",
  "originContentHash": "sha256:…",
  "rewriteEngine": "@synswarm/core-edge@2026.1.0",
  "prevToken": "sha256:…"
}
```

### 11.3 Auditor Verification Requirements (Informative)

Conformant audit platforms (e.g. Geodex) SHOULD:

1. Fetch the Origin Page independently using a Human Client User-Agent.
2. Recompute `contentHash` from normalized origin text and compare to the payload's `audit.originContentHash`.
3. Verify Level 2 signatures per §6.3, including domain match, nonce uniqueness, and validity window policy (Appendix F).
4. Treat transparency tokens as correlation IDs; store historical tokens to detect drift when chained mode is enabled.
5. Flag deployments where edge-reported hashes consistently diverge from independent origin fetches (possible compromised edge).

---

## 12. Conformance Checklist

An implementation is **SynSwarm 2026.1 conformant** if it:

- [ ] Implements §4 detection against the canonical crawler registry
- [ ] Supports registry hot-reload or documents bundled-only mode (§4.3)
- [ ] Implements §5.1 fidelity requirements
- [ ] Supports at least `conservative` and `balanced` optimization levels
- [ ] Supports `profileMode: unified` with primary-model priority (§5.4)
- [ ] Emits Semantic JSON matching the schema
- [ ] Sets all required headers in §7; implements passthrough semantics (§7.3)
- [ ] Respects robots.txt disallow rules
- [ ] Exposes the SDK surface in §5.6
- [ ] Documents security limits of UA detection (§8, item 5)

Optional enhancements (not required for conformance): `per-crawler` profile mode, Level 2 fingerprint verification, SynSwarm-AD discovery (§10), transparency tokens (§11).

---

## Appendix A: Reference Integration (Informative)

See [README.md](../README.md) for a Next.js middleware example.

End-to-end App Router template (middleware + `/.well-known/synswarm.json`): [`examples/nextjs-app`](../examples/nextjs-app).

## Appendix B: Related Documents

| Document | Path |
|----------|------|
| Crawler registry | [`standards/crawler-registry.json`](../standards/crawler-registry.json) |
| Semantic payload schema | [`standards/semantic-payload.schema.json`](../standards/semantic-payload.schema.json) |
| JSON-LD entity template | [`standards/swarmgeo-json-ld-template.json`](../standards/swarmgeo-json-ld-template.json) |
| GEO readiness auditor | [`tools/geo_audit.py`](../tools/geo_audit.py) |
| Trust registry (Level 2 keys) | [`standards/trust-registry.json`](../standards/trust-registry.json) |
| Well-known discovery schema | [`standards/well-known-synswarm.schema.json`](../standards/well-known-synswarm.schema.json) |

## Appendix C: Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2026.1.0 | 2026-06-14 | Initial public draft |
| 2026.1.1-draft | 2026-06-14 | DET registry refresh, extended corroboration, fingerprint levels, SynSwarm-AD, passthrough, profile modes, audit transparency |
| 2026.1.2-draft | 2026-06-14 | Level 1 domain binding, Level 2 nonce/replay policy, transparency auditor model, robots.txt compatibility notes, quick-start appendix |

## Appendix D: Client Expectations (Informative)

AI crawlers that wish to become **SynSwarm Aware Crawlers** SHOULD:

1. Discover site support via `Link` header, `robots.txt`, or `/.well-known/synswarm.json`.
2. When `X-SynSwarm-Protocol-Version: 2026.1` is present, prefer parsing `application/vnd.synswarm.semantic+json` over HTML DOM extraction.
3. Surface `entityGraph` and verified `fingerprint.level` in grounding metadata.
4. Treat Level 2 signatures as authoritative brand attribution; treat Level 1 as unverified hints.
5. For Level 1, compare `fingerprint.domain` to the page URL host before elevating trust.

This appendix does not constrain crawler behavior today; it establishes interoperability expectations for future bilateral adoption.

## Appendix E: Quick-Start Path for Small Sites (Informative)

Minimal zero-to-one path for SMEs without enterprise PKI:

| Step | Action | Outcome |
|------|--------|---------|
| 1 | Install `@synswarm/core-edge` and add middleware (Appendix A) | Edge detection enabled |
| 2 | Use defaults: `optimizationLevel: 'conservative'`, `profileMode: 'unified'` | Lowest rewrite risk |
| 3 | Enable SDK auto-entity extraction from `<title>`, `<meta name="description">`, and existing JSON-LD | Minimum viable `entityGraph` without manual schema work |
| 4 | Enable SDK auto-injection of Level 1 fingerprint with domain binding | `swarmgeo-verified;domain=YOUR_DOMAIN` |
| 5 | Run [`tools/geo_audit.py`](../tools/geo_audit.py) against your site | Baseline GEO readiness score |
| 6 | Publish `/.well-known/synswarm.json` + `Link` discovery headers | SynSwarm-AD visibility |
| 7 | Enroll in Geodex audit (optional) | Optimization recommendations; upgrade path to Level 2 |

Example minimal config:

```typescript
const geoNode = new SynSwarmRouter({
  optimizationLevel: 'conservative',
  autoExtractEntity: true,
  autoInjectFingerprint: true,
});
```

When audit score ≥80 across [`tools/geo_audit.py`](../tools/geo_audit.py) dimensions, consider upgrading to `balanced` and pursuing Level 2 signatures via Geodex.

## Appendix F: Signature Validity Policy (Informative)

This protocol does not mandate a global signature TTL. Audit platforms SHOULD define:

| Policy | Recommended default |
|--------|---------------------|
| Maximum signature age (`now - ts`) | 24 hours |
| Nonce replay cache retention | ≥ validity window |
| Re-sign trigger | Any change to `normalized_origin_text` or registrable domain |
| Clock skew tolerance | ±300 seconds |

Enterprise tenants MAY configure stricter windows. Open-source SDK verifiers SHOULD expose `signatureMaxAgeSeconds` (default `86400`).
