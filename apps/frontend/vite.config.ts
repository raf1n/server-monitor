import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync, existsSync } from 'fs';

const buildInfoPath = path.resolve(__dirname, 'build-info.json');
const buildInfo = existsSync(buildInfoPath)
  ? JSON.parse(readFileSync(buildInfoPath, 'utf-8'))
  : { version: '0.0.0', build: 'dev' };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(buildInfo.version),
    __BUILD__: JSON.stringify(buildInfo.build),
    __BUILD_NODE__: JSON.stringify(process.version),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
