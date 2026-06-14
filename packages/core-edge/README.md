# @synswarm/core-edge

SynSwarm 2026.1 edge SDK — DET, REW, SSS, SynSwarm-AD helpers.

## Build

```bash
npm install
npm run build
npm test
```

## SME defaults (Appendix E)

```typescript
import { SynSwarmRouter } from '@synswarm/core-edge';

const router = new SynSwarmRouter({
  optimizationLevel: 'conservative',
  autoExtractEntity: true,
  autoInjectFingerprint: true,
});
```

## Next.js example

See [`examples/nextjs-app`](../../examples/nextjs-app).

## Exports

| Module | Purpose |
|--------|---------|
| `SynSwarmRouter` | Edge middleware entry |
| `signLevel2Fingerprint` | Enterprise fingerprint signing |
| `buildWellKnownDiscovery` | `/.well-known/synswarm.json` builder |
| `matchCrawler` | Standalone DET helper |

See [`spec/SYNWARM-2026.1.md`](../../spec/SYNWARM-2026.1.md) for the full protocol contract.
