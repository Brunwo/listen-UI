import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Function to determine base path for GitHub Pages
const getRepoName = () => {
  const repoUrl = process.env.GITHUB_REPOSITORY;
  if (repoUrl) {
    return `/${repoUrl.split('/')[1]}/`;
  }
  return '/'; // Default base for local development
};

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';
  const base = isProduction && process.env.GITHUB_PAGES ? getRepoName() : '/';

  return {
    plugins: [
      basicSsl(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: '',
        filename: 'service-worker.js',
        manifest: {
          ...require('./public/manifest.json'),
          start_url: base,
          scope: base
        },
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html',
          // Don't redirect direct .html navigation (catalog.html, detail.html, etc.)
          // to index.html — let them be served as real pages.
          navigateFallbackDenylist: [/\.html$/]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
        }
      })
    ],
    base: base,
    build: {
      outDir: 'dist',
    },
    define: {
      '__APP_BASE__': JSON.stringify(base)
    },
    server: {
      https: true,
      port: 3000
    }
  };
});
