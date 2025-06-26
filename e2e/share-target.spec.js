import { test, expect, describe } from '@playwright/test';

describe('Share Target Tests', () => {
  test('share-target redirects with URL parameter', async ({ page }) => {
    const sharedUrl = 'https://example.com/shared-page';
    // Playwright's webServer option in the config should ensure the server is up.
    // Navigating directly to the share-target.html relative to the baseURL.
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
    await page.goto(`share-target.html`);

    // Wait for navigation to complete
    await page.waitForNavigation({ timeout: 5000 }).catch(e => console.log('Navigation timeout:', e));

    // Log the current URL for debugging
    console.log('Current URL:', page.url());

    // Check if we've been redirected to the index.html page
    expect(page.url()).toContain(`index.html`);
  });

  test('Share target functionality with mocked API', async ({ page }) => {
    const sharedUrl = 'https://example.com/mocked-share';
    const mockApiServer = 'MyUser/MySpace'; // This should match what the app uses if different from default
    const expectedApiPostUrlPattern = `**/${mockApiServer}/run/generate_audio`; // Or similar, adjust if needed. The hostname can vary.
                                                                            // A more robust pattern might be needed if the hostname is not fixed.
                                                                            // For HF spaces, it's usually <space_name>.hf.space or <user>-<space_name>.hf.space

    // Mock the API settings if they are not default or to control them
    await page.addInitScript(() => {
      localStorage.setItem('openaiApiKey', 'test-api-key');
      // localStorage.setItem('apiServer', 'MyUser/MySpace'); // If different from default in api.js
    });

    // Mock the Gradio API call
    await page.route(
      (url) => {
        // Check if the URL matches the Gradio endpoint pattern
        // The Gradio client might use a different path for predict, e.g. /api/predict or /call/predict
        // This needs to be verified by inspecting actual network calls or Gradio client docs.
        // For now, assuming /run/generate_audio based on client.predict("/generate_audio", ...)
        // A simpler glob might be "**/run/generate_audio"
        const u = new URL(url);
        return u.pathname.endsWith('/run/generate_audio') || u.pathname.endsWith('/api/generate_audio');
      },
      async (route) => {
        const requestBody = route.request().postDataJSON();
        // Ensure the request is for the shared URL
        if (requestBody && requestBody.data && requestBody.data[0] === sharedUrl) { // data[0] is usually where the first param goes
          console.log(`Mocked API call for: ${sharedUrl}`);
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: [
                { url: 'http://example.com/mocked-audio.mp3' }, // Mocked audio URL
                'This is a mocked transcription.', // Mocked transcription
              ],
              // Include other fields if the Gradio client expects them
              // "is_generating": false, "duration": 1.0, "average_duration": 1.0
            }),
          });
        } else {
          // If it's not the call we want to mock (e.g. wrong URL in body), let it continue (or fail)
          console.warn(`API call not matching expected shared URL. Expected: ${sharedUrl}, Got: ${requestBody?.data[0]}. Letting it continue.`);
          await route.continue();
        }
      }
    );

    // Navigate to the share_target page, which will redirect to index.html
    // The baseURL from playwright.config.js will be prepended.
    await page.goto(`share-target.html?url=${encodeURIComponent(sharedUrl)}`);

    // Wait for the loading indicator to show the specific message for the shared URL
    const loadingIndicator = page.locator('#loadingIndicator');
    await expect(loadingIndicator).toHaveText(`Processing: ${sharedUrl}`, { timeout: 10000 });
    await expect(loadingIndicator).toBeVisible();

    // Wait for the loading indicator to disappear (meaning processing is "complete")
    await expect(loadingIndicator).toBeHidden({ timeout: 30000 }); // Increased timeout for processing

    // Check if transcription is displayed
    const transcriptionElement = page.locator('#transcription');
    await expect(transcriptionElement).toHaveText('This is a mocked transcription.');
    await expect(page.locator('#transcriptionContainer')).toBeVisible();

    // Check if play button is visible (audio is "loaded")
    await expect(page.locator('#playButton')).toBeVisible();

    // Check if the item is in the history list
    // The history list item text might be the URL or a title. ui.js uses entry.title || link
    const historyListItem = page.locator(`#historyList li:has-text("${sharedUrl}")`);
    await expect(historyListItem).toBeVisible();
    await expect(historyListItem.locator('button:has-text("Play")')).toBeVisible();
    await expect(historyListItem.locator('button:has-text("Remove")')).toBeVisible();

    // Check localStorage for audioCache to ensure it was saved
    const audioCacheString = await page.evaluate(() => localStorage.getItem('audioCache'));
    expect(audioCacheString).not.toBeNull();
    const audioCacheFromStorage = JSON.parse(audioCacheString);
    expect(audioCacheFromStorage[sharedUrl]).toBeDefined();
    expect(audioCacheFromStorage[sharedUrl].audioUrl).toBe('http://example.com/mocked-audio.mp3');
    expect(audioCacheFromStorage[sharedUrl].transcription).toBe('This is a mocked transcription.');
  });
});