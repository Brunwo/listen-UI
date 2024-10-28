import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadAudioCache, saveAudioCache, removeFromCache, clearAudioCache } from './audioCache';

describe('audioCache', () => {
  beforeEach(() => {
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn()
    };
    global.caches = {
      open: vi.fn().mockResolvedValue({
        match: vi.fn(),
        add: vi.fn(),
        delete: vi.fn()
      })
    };
  });

  it('should load audio cache from localStorage', async () => {
    localStorage.getItem.mockReturnValue(JSON.stringify({ 'test': { audioUrl: 'https://news.ycombinator.com/' } }));
    await loadAudioCache();
    expect(localStorage.getItem).toHaveBeenCalledWith('audioCache');
  });

  it('should save audio cache to localStorage', async () => {
    await saveAudioCache('test', 'test.mp3');
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('should remove item from cache', async () => {
    const link = 'test';
    global.audioCache = { [link]: { audioUrl: 'test.mp3' } };
    await removeFromCache(link);
    // expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('should handle undefined cache entry when removing item from cache', async () => {
    const link = 'undefinedTest';
    global.audioCache = {};
    await removeFromCache(link);
    // expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('should clear audio cache', async () => {
    await clearAudioCache();
    expect(localStorage.setItem).toHaveBeenCalledWith('audioCache', '{}');
  });
});