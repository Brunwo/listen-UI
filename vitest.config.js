// vitest.config.js
export default {
    test: { 
      exclude: ["e2e/**", "node_modules/**", "dist/**"],
      environment: 'jsdom', // Needed to simulate a browser-like environment
    },
  };