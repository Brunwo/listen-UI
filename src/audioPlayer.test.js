import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadAudioFromCache, updateMediaSessionMetadata, setupMediaSessionHandlers } from './audioPlayer';
import { audioCache, setCurrentTrack } from './audioCache';

describe('audioPlayer', () => {
  beforeEach(() => {
    vi.mock('./audioCache', () => ({
      audioCache: {
        'test': { audioUrl: 'test.mp3', lastPosition: 0, transcription: 'Test' }
      },
      currentTrack: null,
      setCurrentTrack: vi.fn()
    }));
    global.document = {
      getElementById: vi.fn().mockReturnValue({
        src: '',
        currentTime: 0,
        style: { display: 'none' },
        play: vi.fn(),
        addEventListener: vi.fn() // Mock addEventListener
      })
    };
    global.URL = { createObjectURL: vi.fn() };
    global.navigator = { mediaSession: { metadata: null, setActionHandler: vi.fn() } };
    global.MediaMetadata = vi.fn().mockImplementation((metadata) => metadata);
    global.caches = {
      open: vi.fn().mockResolvedValue({
        match: vi.fn(),
        add: vi.fn(),
        delete: vi.fn()
      })
    };
  });

  it('should load audio from cache', async () => {
    await loadAudioFromCache('test');
    expect(document.getElementById).toHaveBeenCalledWith('player');
  });

  it('should setup media session handlers', () => {
    const audioPlayer = { play: vi.fn(), pause: vi.fn(), currentTime: 0 };
    const playButton = { textContent: '' };
    setupMediaSessionHandlers(audioPlayer, playButton);
    expect(navigator.mediaSession.setActionHandler).toHaveBeenCalled();
  });
});