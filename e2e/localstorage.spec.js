import { test, expect } from '@playwright/test';

test('Simulate localStorage entry in PWA', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('audioCache', JSON.stringify({
      'https://example.com/audio': {
        audioUrl: 'https://example.com/audio.mp3',
        transcription: 'Test transcription',
        lastPosition: 0
      }
    }));
  });

  await page.goto('http://localhost:5173/listen-UI/');

  const audioCache = await page.evaluate(() => localStorage.getItem('audioCache'));
  expect(audioCache).toBeTruthy();
  
  const historyList = await page.locator('#historyList');
  const historyItems = await historyList.locator('li').count();
  expect(historyItems).toBe(1);
});
