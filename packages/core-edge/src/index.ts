export { SynSwarmRouter, isAICrawlerUserAgent, matchCrawler } from './router.js';
export type {
  CrawlerMatch,
  OptimizationLevel,
  OutputFormat,
  ProfileMode,
  SemanticPayload,
  SynSwarmRequest,
  SynSwarmRouterConfig,
  TargetModel,
  WellKnownDiscovery,
} from './types.js';
export {
  buildDiscoveryLinkHeaders,
  buildRobotsSynSwarmLines,
  buildWellKnownDiscovery,
} from './ad/discovery.js';
export {
  buildLevel1MetaContent,
  buildLevel1MetaTag,
  buildLevel2MetaContent,
  buildLevel2MetaTag,
  buildLevel2SigningInput,
  injectLevel1Fingerprint,
  parseFingerprintFromHtml,
} from './sss/fingerprint.js';
export {
  extractPageFromHtml,
  buildMinimalEntityGraph,
} from './sss/entity.js';
export {
  signLevel2Fingerprint,
  verifyLevel2Fingerprint,
  generateEd25519KeyPair,
  readKeyFile,
} from './sss/signature.js';
export {
  buildSemanticPayload,
  resolveConfig,
  serializePayload,
} from './rew/rewrite.js';
export { getRegistry, refreshRegistry, listRegistryEntries } from './det/registry.js';
export { registrableDomain, sha256Prefixed } from './utils/crypto.js';
