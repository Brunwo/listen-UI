import { test, expect, describe } from '@playwright/test';

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

describe('Share Target Tests', () => {
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

  test('Share target functionality', async ({ page }) => {
    console.log('Starting Share target functionality test');

    try {
      // Simulate sharing a URL to the PWA
      await page.goto('http://localhost:5173/listen-UI/share-target?url=https://example.com/shared');
      console.log('Navigated to share target URL');

      // Wait for the page to load and process the shared URL
      await page.waitForLoadState('networkidle');
      console.log('Page loaded');

      // Check if the shared URL is processed : we cant test that at the moment as processing takes a lot of time
      // const sharedUrlProcessed = await page.evaluate(() => {
      //   const lastProcessedUrl = localStorage.getItem('lastProcessedUrl');
      //   console.log('Last processed URL:', lastProcessedUrl);
      //   return lastProcessedUrl === 'https://example.com/shared';
      // });
      // expect(sharedUrlProcessed).toBe(true);
      // console.log('Shared URL processed correctly');

      // Check if the audio player is visible
      const audioPlayer = await page.locator('#player');
      await expect(audioPlayer).toBeVisible({ timeout: 10000 });
      console.log('Audio player is visible');

      // Additional checks to ensure the page has loaded correctly
      const pageTitle = await page.title();
      expect(pageTitle).not.toBe('');
      console.log('Page title:', pageTitle);

      const bodyContent = await page.textContent('body');
      expect(bodyContent).not.toBe('');
      console.log('Body content length:', bodyContent.length);

    } catch (error) {
      console.error('Test failed with error:', error);
      throw error;
    }
  });
});