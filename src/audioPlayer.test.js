
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadAudioFromCache, updateMediaSessionMetadata, setupMediaSessionHandlers } from './audioPlayer';
import { audioCache, setCurrentTrack } from './audioCache';

vi.mock('./ui', () => ({
  getAudioPlayerElement: vi.fn(),
  showPlayButton: vi.fn(),
  showTranscription: vi.fn(),
  showAlert: vi.fn(),
  updatePlayButtonState: vi.fn()
}));

import { getAudioPlayerElement } from './ui';

describe('audioPlayer', () => {
  let mockAudioPlayer;
  let mockCache;

  beforeEach(() => {
    mockAudioPlayer = {
      src: '',
      currentTime: 0,
      style: { display: 'none' },
      play: vi.fn(),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: 0
    };

    vi.mocked(getAudioPlayerElement).mockReturnValue(mockAudioPlayer);

    vi.mock('./audioCache', () => ({
      audioCache: {
        'test': { audioUrl: 'test.mp3', lastPosition: 0, transcription: 'Test' }
      },
      currentTrack: null,
      setCurrentTrack: vi.fn()
    }));

    global.URL = { createObjectURL: vi.fn() };
    global.navigator = { mediaSession: { metadata: null, setActionHandler: vi.fn() }, onLine: true };
    global.MediaMetadata = vi.fn().mockImplementation((metadata) => metadata);

    mockCache = {
      match: vi.fn(),
      add: vi.fn(),
      delete: vi.fn()
    };
    global.caches = {
      open: vi.fn().mockResolvedValue(mockCache)
    };
    // Let's update cache match to return something.
    mockCache.match.mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['audio data'], { type: 'audio/mp3' }))
    });
  });

  it('should load audio from cache', async () => {
    const loadPromise = loadAudioFromCache('test');

    // Simulate loadedmetadata event
    // We need to get the event listener callback passed to addEventListener
    // Since we mocked addEventListener, we can find the callback in the mock calls
    // But wait, loadAudioFromCache awaits the promise which waits for the event.
    // So we can't await loadAudioFromCache before triggering the event.
    // We need to trigger it *while* loadAudioFromCache is running.
    // But since JS is single threaded, we can't easily interrupt.
    // However, the promise inside loadAudioFromCache also checks readyState.
    // If we set readyState before calling, it might resolve immediately.
    // Let's try setting readyState on the mock.
    mockAudioPlayer.readyState = 1; // HAVE_METADATA

    await loadPromise;
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('should setup media session handlers', () => {
    const audioPlayer = { play: vi.fn(), pause: vi.fn(), currentTime: 0 };
    const playButton = { textContent: '' };
    setupMediaSessionHandlers(audioPlayer, playButton);
    expect(navigator.mediaSession.setActionHandler).toHaveBeenCalled();
  });
});