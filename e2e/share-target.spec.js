const { test, expect } = require('@playwright/test');

// Add a helper function to check if the server is up
async function isServerUp(page) {
  try {
    const response = await page.goto('http://localhost:5173');
    return response.status() === 200;
  } catch (error) {
    console.error('Server check failed:', error);
    return false;
  }
}

test('share-target redirects with URL parameter', async ({ page }) => {
  // Check if the server is up
  const serverUp = await isServerUp(page);
  console.log('Is server up?', serverUp);

  const sharedUrl = 'https://example.com/shared-page';
  await page.goto(`share-target.html?url=${encodeURIComponent(sharedUrl)}`);

  // Wait for navigation to complete with a shorter timeout
  await page.waitForNavigation({ timeout: 5000 }).catch(e => console.log('Navigation timeout:', e));

  // Log the current URL for debugging
  console.log('Current URL:', page.url());

  // Check if we've been redirected to the correct URL
  expect(page.url()).toContain(`index.html`);
  expect(page.url()).toContain(`url=${encodeURIComponent(sharedUrl)}`);
});

test('share-target redirects to index.html when no URL is shared', async ({ page }) => {
  // Check if the server is up
  const serverUp = await isServerUp(page);
  console.log('Is server up?', serverUp);

  await page.goto(`share-target.html`);

  // Wait for navigation to complete with a shorter timeout
  await page.waitForNavigation({ timeout: 5000 }).catch(e => console.log('Navigation timeout:', e));

  // Log the current URL for debugging
  console.log('Current URL:', page.url());

  // Check if we've been redirected to the index.html page
  expect(page.url()).toContain(`index.html`);
});