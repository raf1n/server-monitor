import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

let git = 'dev';
try {
  git = execSync('git describe --always --dirty --tags 2>/dev/null', { cwd: root }).toString().trim();
} catch {}

const date = new Date().toISOString().split('T')[0].replace(/-/g, '.');
const frontendPkg = JSON.parse(readFileSync(resolve(root, 'apps/frontend/package.json'), 'utf-8'));
const backendPkg = JSON.parse(readFileSync(resolve(root, 'apps/backend/package.json'), 'utf-8'));

const info = {
  version: frontendPkg.version,
  build: `${date}-${git}`,
};

writeFileSync(resolve(root, 'apps/frontend/build-info.json'), JSON.stringify(info, null, 2));
writeFileSync(resolve(root, 'apps/backend/build-info.json'), JSON.stringify(info, null, 2));
