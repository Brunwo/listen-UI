export function loadAudioFromCache(link: string): Promise<void>;
export function updateMediaSessionMetadata(title: string, artist: string, album: string): void;
export function setupMediaSessionHandlers(): void;

// If there are any other exported functions or variables from audioPlayer.js, declare them here as well

// Declare any global interfaces or types used in audioPlayer.js
declare global {
  interface Navigator {
    mediaSession?: MediaSession;
  }

  interface MediaSession {
    metadata: MediaMetadata;
    setActionHandler(type: string, callback: (() => void) | null): void;
  }

  interface MediaMetadata {
    title: string;
    artist: string;
    album: string;
  }
}