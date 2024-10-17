import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadAudioCache, saveAudioCache, removeFromCache, clearAudioCache } from './audioCache';

describe('audioCache', () => {
  beforeEach(() => {
    vi.mock('localStorage', () => ({
      getItem: vi.fn(),
      setItem: vi.fn()
    }));
    vi.mock('caches', () => ({
      open: vi.fn().mockResolvedValue({
        match: vi.fn(),
        add: vi.fn(),
        delete: vi.fn()
      })
    }));
  });

  it('should load audio cache from localStorage', async () => {
    localStorage.getItem.mockReturnValue(JSON.stringify({ 'test': { audioUrl: 'test.mp3' } }));
    await loadAudioCache();
    expect(localStorage.getItem).toHaveBeenCalledWith('audioCache');
  });

  it('should save audio cache to localStorage', async () => {
    await saveAudioCache('test', 'test.mp3');
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('should remove item from cache', async () => {
    await removeFromCache('test');
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('should clear audio cache', async () => {
    await clearAudioCache();
    expect(localStorage.setItem).toHaveBeenCalledWith('audioCache', '{}');
  });
});