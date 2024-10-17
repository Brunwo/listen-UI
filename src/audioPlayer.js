import { audioCache, currentTrack } from './audioCache.js';
import { setCurrentTrack } from './audioCache.js';

export async function loadAudioFromCache(link) {
    const cachedAudio = audioCache[link];
    if (!cachedAudio) {
        if (!navigator.onLine) {
            alert('This audio is not available offline.');
        }
        return;
    }

    const audioPlayer = document.getElementById('player');
    const playButton = document.getElementById('playButton');
    const transcriptionContainer = document.getElementById('transcriptionContainer');
    const transcriptionElement = document.getElementById('transcription');

    const cache = await caches.open('audio-cache');
    const response = await cache.match(cachedAudio.audioUrl);
    if (response) {
        const blob = await response.blob();
        audioPlayer.src = URL.createObjectURL(blob);
    } else {
        audioPlayer.src = cachedAudio.audioUrl;
    }
    // Import setCurrentTrack function from audioCache.js

    // Ensure audioPlayer is loaded before setting currentTime
    audioPlayer.addEventListener('loadedmetadata', () => {
        audioPlayer.currentTime = cachedAudio.lastPosition || 0;
    });

    audioPlayer.currentTime = cachedAudio.lastPosition;
    setCurrentTrack(link);

    if (playButton) {
        playButton.style.display = 'block';
        playButton.onclick = () => audioPlayer.play();
    }

    if (transcriptionElement && transcriptionContainer) {
        transcriptionElement.textContent = cachedAudio.transcription;
        transcriptionContainer.style.display = 'block';
    }

    console.log('Audio loaded from cache and ready for playback');

    updateMediaSessionMetadata(link, 'Web to Audio', 'Generated Audio');
}

export function updateMediaSessionMetadata(title, artist, album) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: title || 'Unknown Title',
            artist: artist || 'Unknown Artist',
            album: album || 'Unknown Album',
            artwork: [
                { src: '/icons/imagepodcast-transp500.png', sizes: '500x500', type: 'image/png' },
                { src: '/icons/imagepodcast.png', sizes: '1024x1024', type: 'image/png' }
            ]
        });
    }
}

export function setupMediaSessionHandlers(audioPlayer, playButton) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
            audioPlayer.play();
            playButton.textContent = 'Pause';
        });
        
        navigator.mediaSession.setActionHandler('pause', () => {
            audioPlayer.pause();
            playButton.textContent = 'Play';
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