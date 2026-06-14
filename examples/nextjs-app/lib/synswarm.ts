import { SynSwarmRouter } from '@synswarm/core-edge';

export const siteOrigin =
  process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://example.com';

export const geoNode = new SynSwarmRouter({
  optimizationLevel: 'conservative',
  autoExtractEntity: true,
  autoInjectFingerprint: true,
  audit: { enabled: true },
});

export function discoveryLinkHeader(): string {
  return geoNode.buildDiscoveryHeaders(siteOrigin).Link;
}
