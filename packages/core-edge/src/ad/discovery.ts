import type { SynSwarmRouterConfig, WellKnownDiscovery } from '../types.js';
import { buildProfileHeader } from '../utils/crypto.js';
import { resolveConfig } from '../rew/rewrite.js';

export function buildWellKnownDiscovery(
  config: SynSwarmRouterConfig,
  options?: {
    siteOrigin?: string;
    fingerprintLevel?: 0 | 1 | 2;
    trustRegistry?: string;
    entityId?: string;
  },
): WellKnownDiscovery {
  const resolved = resolveConfig(config);
  return {
    protocol: '2026.1',
    rewriteProfiles: [
      buildProfileHeader(resolved.optimizationLevel, resolved.targetModels),
    ],
    fingerprintLevel: options?.fingerprintLevel ?? (resolved.autoInjectFingerprint ? 1 : 0),
    trustRegistry:
      options?.trustRegistry ?? 'https://standards.synswarm.org/trust-registry.json',
    ...(options?.entityId ? { entityId: options.entityId } : {}),
  };
}

export function buildDiscoveryLinkHeaders(siteOrigin: string): Record<string, string> {
  return {
    Link: [
      '<https://standards.synswarm.org>; rel="synswarm-protocol"',
      `<${siteOrigin}/.well-known/synswarm.json>; rel="synswarm-discovery"`,
    ].join(', '),
  };
}

export function buildRobotsSynSwarmLines(siteOrigin: string): string[] {
  return [
    'SynSwarm-Protocol: 2026.1',
    `SynSwarm-Discovery: ${siteOrigin}/.well-known/synswarm.json`,
  ];
}
