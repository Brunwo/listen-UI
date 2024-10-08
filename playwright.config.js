const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173/listen-UI/',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173, // port customization does not work, keep default
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // Increase timeout to 2 minutes
  },
  timeout: 30000, // Set global timeout for tests to 30 seconds
});