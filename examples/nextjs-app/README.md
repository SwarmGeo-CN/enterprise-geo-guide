# SynSwarm Next.js Integration Example

Minimal App Router example showing:

- Edge middleware AI crawler detection + semantic rewrite
- `Link` discovery headers on all responses (SynSwarm-AD)
- `/.well-known/synswarm.json` route

## Setup

From repository root:

```bash
npm install
npm run build
cd examples/nextjs-app
npm install
npm run dev
```

Set your public origin:

```bash
export NEXT_PUBLIC_SITE_ORIGIN=https://localhost:3000
```

## Verify

1. Human browser: open `http://localhost:3000` — normal HTML.
2. Discovery doc: `http://localhost:3000/.well-known/synswarm.json`
3. Simulate AI crawler:

```bash
curl -s -D - \
  -H 'User-Agent: GPTBot/1.0' \
  http://localhost:3000/ | head -40
```

Expect headers:

- `X-SynSwarm-Protocol-Version: 2026.1`
- `Content-Type: application/vnd.synswarm.semantic+json; version=2026.1`
- `Link: ... rel="synswarm-discovery"`

4. GEO audit (optional):

```bash
python3 ../../tools/geo_audit.py http://localhost:3000
```

## Files to copy into your app

| File | Purpose |
|------|---------|
| `lib/synswarm.ts` | Shared router config (Appendix E defaults) |
| `middleware.ts` | DET + REW + Link headers |
| `app/.well-known/synswarm.json/route.ts` | SynSwarm-AD discovery endpoint |

See [spec/SYNWARM-2026.1.md](../../spec/SYNWARM-2026.1.md) for the full protocol contract.
