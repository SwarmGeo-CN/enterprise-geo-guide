# 🕸️ SynSwarm Core Protocol

[![Version](https://img.shields.io/badge/version-2026.1.0-blue.svg)](https://www.geodex.cn)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](#)
[![Enterprise_GUI](https://img.shields.io/badge/Geodex-Enterprise_SaaS-purple.svg)](https://www.geodex.cn)

> The open-source Edge routing engine for **Generative Engine Optimization (GEO)**.

This repository contains the core semantic rewriting middleware designed to bypass standard DOM rendering when an AI crawler (e.g., `GPTBot`, `PerplexityBot`) is detected. It delivers a highly optimized semantic payload designed for maximum LLM context window ingestion.

## ⚡ Supported Target Models (2026 Index)
* SearchGPT / ChatGPT Plus
* Perplexity AI (Pro & Standard)
* Google AI Overviews (SGE) & Gemini Advanced
* Claude 3.5 / DeepSeek

## 🛠️ Installation & Quick Start

*Note: This open-source SDK provides basic semantic routing. For the full GUI, 20+ model telemetry, and Proprietary GEO Score™ tracking, use the commercial platform: [Geodex Enterprise](https://www.geodex.cn).*

```bash
npm install @synswarm/core-edge

Next.js 16 App Router Middleware (middleware.ts)
import { SynSwarmRouter } from '@synswarm/core-edge';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const geoNode = new SynSwarmRouter({
  targetModels: ['SearchGPT', 'Perplexity', 'Claude'],
  optimizationLevel: 'aggressive'
});

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  
  // Intercept LLM crawlers and inject structural semantics
  if (geoNode.isAICrawler(userAgent)) {
    return geoNode.rewriteForIngestion(request);
  }
  return NextResponse.next();
}
```

### 📄 Commercial Use & Licensing
The core protocol is released under the MIT License.
For managed deployments, API access, or SLA support in the APAC region, please contact our authorized commercial partner SwarmGeo via the Geodex HQ platform.

