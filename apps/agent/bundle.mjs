import esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { cpSync, existsSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');

await esbuild.build({
  entryPoints: [path.join(__dirname, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: path.join(distDir, 'agent.js'),
  banner: {
    js: '#!/usr/bin/env node',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  logLevel: 'info',
});

for (const file of ['install.sh', 'README.md']) {
  const src = path.join(__dirname, file);
  if (existsSync(src)) {
    cpSync(src, path.join(distDir, file));
    console.log(`✓ Copied ${file} to dist/`);
  }
}
