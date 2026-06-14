import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(root, '..');
mkdirSync(join(pkgRoot, 'data'), { recursive: true });
copyFileSync(
  join(pkgRoot, '../../standards/crawler-registry.json'),
  join(pkgRoot, 'data/crawler-registry.json'),
);
