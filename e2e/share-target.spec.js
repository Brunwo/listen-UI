const { test, expect } = require('@playwright/test');

test('share-target redirects with URL parameter', async ({ page }) => {
  const sharedUrl = 'https://example.com/shared-page';
  await page.goto(`share-target.html?url=${encodeURIComponent(sharedUrl)}`);

  // Wait for navigation to complete
  await page.waitForURL(`index.html?url=${encodeURIComponent(sharedUrl)}`);

  // Check if we've been redirected to the correct URL
  expect(page.url()).toContain(`index.html?url=${encodeURIComponent(sharedUrl)}`);
});

test('share-target redirects to index.html when no URL is shared', async ({ page }) => {
  await page.goto(`share-target.html`);

  // Wait for navigation to complete
  await page.waitForURL(`index.html`);

  // Check if we've been redirected to the index.html page
  expect(page.url()).toContain(`index.html`);
});