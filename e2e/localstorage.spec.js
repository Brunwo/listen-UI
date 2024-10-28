import { test, expect, describe } from '@playwright/test';

test.describe('LocalStorage Tests', () => {
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

  test('Simulate user interactions with audio player', async ({ page }) => {
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

    const audioPlayer = await page.locator('#player');
    await audioPlayer.evaluate(player => player.play());
    await page.waitForTimeout(2000); // Simulate 2 seconds of playback
    await audioPlayer.evaluate(player => player.pause());

    const currentTime = await audioPlayer.evaluate(player => player.currentTime);
    expect(currentTime).toBeGreaterThan(0);

    await audioPlayer.evaluate(player => player.currentTime = 10);
    await audioPlayer.evaluate(player => player.play());
    await page.waitForTimeout(2000); // Simulate 2 seconds of playback
    await audioPlayer.evaluate(player => player.pause());

    const newCurrentTime = await audioPlayer.evaluate(player => player.currentTime);
    expect(newCurrentTime).toBeGreaterThan(10);

    const updatedAudioCache = await page.evaluate(() => localStorage.getItem('audioCache'));
    const parsedCache = JSON.parse(updatedAudioCache);
    expect(parsedCache['https://example.com/audio'].lastPosition).toBeCloseTo(newCurrentTime, 1);
  });

  test('Ensure timestamp is saved at regular intervals', async ({ page }) => {
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

    const audioPlayer = await page.locator('#player');
    await audioPlayer.evaluate(player => player.play());
    await page.waitForTimeout(6000); // Simulate 6 seconds of playback
    await audioPlayer.evaluate(player => player.pause());

    const updatedAudioCache = await page.evaluate(() => localStorage.getItem('audioCache'));
    const parsedCache = JSON.parse(updatedAudioCache);
    expect(parsedCache['https://example.com/audio'].lastPosition).toBeGreaterThan(0);
  });

  test('Load correct timestamp when returning to track', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('audioCache', JSON.stringify({
        'https://example.com/audio': {
          audioUrl: 'https://example.com/audio.mp3',
          transcription: 'Test transcription',
          lastPosition: 15
        }
      }));
    });

    await page.goto('http://localhost:5173/listen-UI/');

    const audioPlayer = await page.locator('#player');
    const currentTime = await audioPlayer.evaluate(player => player.currentTime);
    expect(currentTime).toBeCloseTo(15, 1);
  });

  test('Handle SecurityError for localStorage access', async ({ page }) => {
    await page.goto('http://localhost:5173/listen-UI/', { waitUntil: 'domcontentloaded' });

    const localStorageAccess = await page.evaluate(() => {
      try {
        localStorage.setItem('test', 'test');
        return true;
      } catch (e) {
        return false;
      }
    });

    expect(localStorageAccess).toBe(true);
  });

  test('Simulate user interactions with audio player during track changes', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('audioCache', JSON.stringify({
        'https://example.com/audio1': {
          audioUrl: 'https://example.com/audio1.mp3',
          transcription: 'Test transcription 1',
          lastPosition: 0
        },
        'https://example.com/audio2': {
          audioUrl: 'https://example.com/audio2.mp3',
          transcription: 'Test transcription 2',
          lastPosition: 0
        }
      }));
    });

    await page.goto('http://localhost:5173/listen-UI/');

    const audioPlayer = await page.locator('#player');

    // Play first track
    await audioPlayer.evaluate(player => player.src = 'https://example.com/audio1.mp3');
    await audioPlayer.evaluate(player => player.play());
    await page.waitForTimeout(2000); // Simulate 2 seconds of playback
    await audioPlayer.evaluate(player => player.pause());

    const currentTime1 = await audioPlayer.evaluate(player => player.currentTime);
    expect(currentTime1).toBeGreaterThan(0);

    // Switch to second track
    await audioPlayer.evaluate(player => player.src = 'https://example.com/audio2.mp3');
    await audioPlayer.evaluate(player => player.play());
    await page.waitForTimeout(2000); // Simulate 2 seconds of playback
    await audioPlayer.evaluate(player => player.pause());

    const currentTime2 = await audioPlayer.evaluate(player => player.currentTime);
    expect(currentTime2).toBeGreaterThan(0);

    // Switch back to first track
    await audioPlayer.evaluate(player => player.src = 'https://example.com/audio1.mp3');
    await audioPlayer.evaluate(player => player.play());
    await page.waitForTimeout(2000); // Simulate 2 seconds of playback
    await audioPlayer.evaluate(player => player.pause());

    const newCurrentTime1 = await audioPlayer.evaluate(player => player.currentTime);
    expect(newCurrentTime1).toBeCloseTo(currentTime1, 1);

    const updatedAudioCache = await page.evaluate(() => localStorage.getItem('audioCache'));
    const parsedCache = JSON.parse(updatedAudioCache);
    expect(parsedCache['https://example.com/audio1'].lastPosition).toBeCloseTo(newCurrentTime1, 1);
    expect(parsedCache['https://example.com/audio2'].lastPosition).toBeCloseTo(currentTime2, 1);
  });
});
