export function fetchMp3(link: string): Promise<void>;

// Additional type declarations
interface AudioCacheEntry {
  audioUrl: string;
  transcription: string;
  lastPosition: number;
}

declare global {
  interface Window {
    audioCache: Record<string, AudioCacheEntry>;
  }
}