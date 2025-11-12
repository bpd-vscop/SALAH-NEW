import { defineConfig, type PluginOption, type ResolvedConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Generate a version.json in the build output so the client can detect new builds
const versionFilePlugin = () => {
  let outDir = 'dist';
  return ({
    name: 'version-file',
    apply: 'build',
    configResolved(config: ResolvedConfig) {
      outDir = config.build.outDir || 'dist';
    },
    closeBundle() {
      const now = new Date();
      const iso = now.toISOString();
      const baseVersion = process.env.npm_package_version || '0.0.0';
      // Bump version on every build by appending build metadata (SemVer build suffix)
      // Example: 0.0.0+20251016T152300Z
      const buildStamp = iso.replace(/[-:.TZ]/g, '');
      const version = `${baseVersion}+${buildStamp}`;
      const meta = {
        version,
        buildId: iso,
        builtAt: iso,
      };
      const filePath = path.join(outDir, 'version.json');
      fs.writeFileSync(filePath, JSON.stringify(meta, null, 2));
      // eslint-disable-next-line no-console
      console.log(`[version-file] wrote ${filePath}`);
    },
  }) as unknown as PluginOption;
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionFilePlugin()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
  },
});
