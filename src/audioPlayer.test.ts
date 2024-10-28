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
    } as any;
    global.URL = { createObjectURL: vi.fn() } as any;
    global.navigator = { mediaSession: { metadata: null, setActionHandler: vi.fn() } } as any;
    global.MediaMetadata = vi.fn().mockImplementation((metadata) => metadata);
    global.caches = {
      open: vi.fn().mockResolvedValue({
        match: vi.fn(),
        add: vi.fn(),
        delete: vi.fn()
      })
    } as any;
  });

  it('should load audio from cache', async () => {
    await loadAudioFromCache('test');
    expect(document.getElementById).toHaveBeenCalledWith('player');
  });

  it('should update media session metadata', () => {
    updateMediaSessionMetadata('Test Title', 'Test Artist', 'Test Album');
    expect(navigator.mediaSession.metadata).toBeTruthy();
  });

  it('should setup media session handlers', () => {
    const audioPlayer = { play: vi.fn(), pause: vi.fn(), currentTime: 0 };
    const playButton = { textContent: '' };
    setupMediaSessionHandlers(audioPlayer as any, playButton as any);
    expect(navigator.mediaSession.setActionHandler).toHaveBeenCalled();
  });
});
