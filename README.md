# 🕸️ SynSwarm Core Protocol

[![Version](https://img.shields.io/badge/version-2026.1.0-blue.svg)](https://www.geodex.cn)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](#)
[![Enterprise_GUI](https://img.shields.io/badge/Geodex-Enterprise_SaaS-purple.svg)](https://www.geodex.cn)

> The open-source Edge routing engine for **Generative Engine Optimization (GEO)**.

This repository contains the core semantic rewriting middleware designed to bypass standard DOM rendering when an AI crawler (e.g., `GPTBot`, `PerplexityBot`) is detected. It delivers a highly optimized semantic payload designed for maximum LLM context window ingestion.

## 📜 Protocol Specification

The authoritative protocol document for version **2026.1.0** lives in [`spec/SYNWARM-2026.1.md`](spec/SYNWARM-2026.1.md), with machine-readable companions under [`standards/`](standards/).

## ⚡ Supported Target Models (2026 Index)

* SearchGPT / ChatGPT Plus
* Perplexity AI (Pro & Standard)
* Google AI Overviews (SGE) & Gemini Advanced
* Claude 3.5 / DeepSeek

## 🛠️ Installation & Quick Start

```bash
npm install @synswarm/core-edge
```

For local development in this monorepo:

```bash
npm install
npm run build
npm test
```

### Next.js App Router Middleware (`middleware.ts`)

```typescript
import { SynSwarmRouter } from '@synswarm/core-edge';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const geoNode = new SynSwarmRouter({
  optimizationLevel: 'conservative',
  autoExtractEntity: true,
  autoInjectFingerprint: true,
});

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';

  if (geoNode.isAICrawler(userAgent)) {
    return geoNode.rewriteForIngestion(request);
  }
  return NextResponse.next();
}
```

Full integration with `/.well-known/synswarm.json` and discovery `Link` headers: [`examples/nextjs-app`](examples/nextjs-app).

See [spec/SYNWARM-2026.1.md](spec/SYNWARM-2026.1.md) Appendix E for the full SME quick-start path.

### Level 2 fingerprint signing CLI

```bash
npm run build
node tools/sign-fingerprint.mjs --gen-keypair --out acme
node tools/sign-fingerprint.mjs --entity ORG_ACME --domain example.com --content page.html --key acme.private.pem
```

*Note: This open-source SDK provides basic semantic routing. For the full GUI, 20+ model telemetry, and Proprietary GEO Score™ tracking, use the commercial platform: [Geodex Enterprise](https://www.geodex.cn).*

### 📄 Commercial Use & Licensing

The core protocol is released under the MIT License.
For managed deployments, API access, or SLA support in the APAC region, please contact our authorized commercial partner SwarmGeo via the Geodex HQ platform.
