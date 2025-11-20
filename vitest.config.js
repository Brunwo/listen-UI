// vitest.config.js
export default {
  test: {
    exclude: ["e2e/**", "node_modules/**", "dist/**", "mp3-player-pwa/**"],
    environment: 'jsdom', // Needed to simulate a browser-like environment
  },
};