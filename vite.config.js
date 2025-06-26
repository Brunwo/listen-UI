
// vite.config.js
import { defineConfig } from 'vite';

// Function to determine base path for GitHub Pages
const getRepoName = () => {
  const repoUrl = process.env.GITHUB_REPOSITORY; // GITHUB_REPOSITORY is in the format "owner/repo"
  if (repoUrl) {
    return `/${repoUrl.split('/')[1]}/`;
  }
  return '/'; // Default base for local development
};

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';
  const base = isProduction && process.env.GITHUB_PAGES ? getRepoName() : '/';

  return {
    base: base, // Set the base path for routing and assets
    build: {
      outDir: 'dist', // The output directory for bundled files
    },
    define: {
      '__APP_BASE__': JSON.stringify(base) // Make base path available to client code
    }
  };
});
