const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  use: {
    // BaseURL to use in actions like `await page.goto('/')`.
    // If process.env.CI_BASE_URL is set (e.g. in GitHub Actions), use it.
    // Otherwise, default to the local preview server.
    baseURL: process.env.CI_BASE_URL || 'http://localhost:4173/',
  },
  webServer: {
    // Command to start the server for the built application
    command: 'npm run serve', // This runs `vite preview`
    url: process.env.CI_BASE_URL || 'http://localhost:4173/', // URL to wait for
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
    // Vite preview's default port is 4173. If you change it in vite.config.js's preview options, update here.
  },
  projects: [
    { name: 'chromium' },
    { name: 'firefox' },
    { name: 'webkit' },
  ],
  timeout: 60 * 1000, // Global timeout for each test: 60 seconds
  expect: {
    timeout: 10 * 1000, // Timeout for expect() assertions: 10 seconds
  },
});