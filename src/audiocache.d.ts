export let audioCache: Record<string, { audioUrl: string; transcription?: string; lastPosition?: number }>;
export let currentTrack: string | null;

export function loadAudioCache(): Promise<void>;
export function saveAudioCache(link: string, audioUrl: string): Promise<void>;
export function removeFromCache(link: string): Promise<void>;
export function clearAudioCache(): Promise<void>;

// // Declare global interfaces
// declare global {
//   interface Window {
//     caches: CacheStorage;
//   }
// }