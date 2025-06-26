import { audioCache } from './audioCache.js'; // Removed currentTrack, not directly used
import { setCurrentTrack } from './audioCache.js';
import {
    getAudioPlayerElement,
    showPlayButton,
    showTranscription,
    showAlert,
    updatePlayButtonState // For media session handlers
} from './ui.js';

// This path needs to be prefixed by the base path.
// Vite should handle this if `__APP_BASE__` is set up correctly and these are in `public`
const defaultArtworkBasePath = (typeof __APP_BASE__ !== 'undefined' ? __APP_BASE__ : '/');

const defaultArtwork = [
    { src: `${defaultArtworkBasePath}icons/imagepodcast-transp500.png`, sizes: '500x500', type: 'image/png' },
    { src: `${defaultArtworkBasePath}icons/imagepodcast.png`, sizes: '1024x1024', type: 'image/png' }
];

export async function loadAudioFromCache(link) {
    const cachedAudio = audioCache[link];
    if (!cachedAudio) {
        if (!navigator.onLine) {
            showAlert('This audio is not available offline.'); // Use ui.js showAlert
        } else {
            showAlert('Audio data not found in cache.');
        }
        return false; // Indicate failure
    }

    const audioPlayer = getAudioPlayerElement();
    if (!audioPlayer) {
        console.error("Audio player element not found during loadAudioFromCache.");
        showAlert("Player error. Cannot load audio.");
        return false; // Indicate failure
    }

    try {
        const cache = await caches.open('audio-cache');
        const response = await cache.match(cachedAudio.audioUrl);

        if (response) {
            const blob = await response.blob();
            audioPlayer.src = URL.createObjectURL(blob);
        } else {
            // Fallback if not in Cache API but in localStorage (should ideally not happen with cache checks)
            console.warn(`Audio for ${link} was in localStorage cache metadata but not in Cache API. Trying direct URL.`);
            audioPlayer.src = cachedAudio.audioUrl;
        }

        // Ensure audioPlayer is loaded before setting currentTime
        // Use a promise to handle the loadedmetadata event correctly
        await new Promise(resolve => {
            const onLoadedMetadata = () => {
                audioPlayer.removeEventListener('loadedmetadata', onLoadedMetadata);
                audioPlayer.currentTime = cachedAudio.lastPosition || 0;
                resolve();
            };
            audioPlayer.addEventListener('loadedmetadata', onLoadedMetadata);
            // If src is already set and metadata loaded quickly, it might not fire for new listeners
            if (audioPlayer.readyState >= HTMLMediaElement.HAVE_METADATA) {
                onLoadedMetadata();
            }
        });

        setCurrentTrack(link);

        showPlayButton(); // From ui.js
        // The playButton's onclick to audioPlayer.play() will be set in script.js
        // Or, the play button element can be passed to setupMediaSessionHandlers

        if (cachedAudio.transcription) {
            showTranscription(cachedAudio.transcription); // From ui.js
        }

        console.log('Audio loaded from cache and ready for playback:', link);
        updateMediaSessionMetadata(cachedAudio.title || link, 'Web to Audio', 'Generated Audio');
        return true; // Indicate success

    } catch (error) {
        console.error("Error loading audio from cache:", error);
        showAlert(`Error loading audio: ${error.message}`);
        return false; // Indicate failure
    }
}

export function updateMediaSessionMetadata(title, artist, album) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: title || 'Unknown Title',
            artist: artist || 'Unknown Artist',
            album: album || 'Unknown Album',
            artwork: defaultArtwork
        });
    }
}

// playButtonElement is passed so its textContent can be updated
export function setupMediaSessionHandlers(audioPlayerElement, playButtonElement) {
    if (!audioPlayerElement) {
        console.warn("Audio player element not provided for media session handlers.");
        return;
    }
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
            audioPlayerElement.play();
            if (playButtonElement) updatePlayButtonState(true); // true for isPlaying
        });
        
        navigator.mediaSession.setActionHandler('pause', () => {
            audioPlayerElement.pause();
            if (playButtonElement) updatePlayButtonState(false); // false for isPlaying
        });
        
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
            const skipTime = details.seekOffset || 10;
            audioPlayer.currentTime = Math.max(audioPlayer.currentTime - skipTime, 0);
        });
        
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
            const skipTime = details.seekOffset || 10;
            audioPlayer.currentTime = Math.min(audioPlayer.currentTime + skipTime, audioPlayer.duration);
        });
        
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.fastSeek && 'fastSeek' in audioPlayer) {
                audioPlayer.fastSeek(details.seekTime);
                return;
            }
            audioPlayer.currentTime = details.seekTime;
        });
        
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            audioPlayer.currentTime = 0;
        });
    }
}