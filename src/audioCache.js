export let audioCache = {};
export let currentTrack = null;
/**
 * @typedef {Object} AudioCacheEntry
 * @property {string} audioUrl - The URL of the cached audio file
 * @property {string} [transcription] - The transcription of the audio content
 * @property {number} [lastPosition] - The last playback position of the audio
 */

/**
 * @type {Object.<string, AudioCacheEntry>}
 * @description A cache object storing audio information keyed by link
 */

/**
 * @type {string|null}
 * @description The currently playing track's link
 */

export async function loadAudioCache() {
    const savedCache = localStorage.getItem('audioCache');
    if (savedCache) {
        audioCache = JSON.parse(savedCache);
    }

    const savedCurrentTrack = localStorage.getItem('currentTrack');
    if (savedCurrentTrack) {
        currentTrack = savedCurrentTrack;
    }

    const cache = await caches.open('audio-cache');
    for (const link in audioCache) {
        const response = await cache.match(audioCache[link].audioUrl);
        if (!response) {
            console.log(`Audio file for ${link} not found in cache, removing entry`);
            delete audioCache[link];
        }
    }

    localStorage.setItem('audioCache', JSON.stringify(audioCache));
}

export function setCurrentTrack(link) {
    currentTrack = link;
    localStorage.setItem('currentTrack', currentTrack);
}

export async function saveAudioCache(link, audioUrl) {
    localStorage.setItem('audioCache', JSON.stringify(audioCache));
    const cache = await caches.open('audio-cache');
    await cache.add(audioUrl);
}

export async function removeFromCache(link) {
    const cache = await caches.open('audio-cache');
    await cache.delete(audioCache[link].audioUrl);
    delete audioCache[link];
    localStorage.setItem('audioCache', JSON.stringify(audioCache));
}

export async function clearAudioCache() {
    const cache = await caches.open('audio-cache');
    for (const link in audioCache) {
        await cache.delete(audioCache[link].audioUrl);
    }
    audioCache = {};
    localStorage.setItem('audioCache', JSON.stringify(audioCache));
}