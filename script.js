// Main application script: orchestrates UI, API calls, audio playback, and caching.

import {
    audioCache,
    loadAudioCache as loadAudioCacheData, // Renamed to avoid conflict
    removeFromCache as removeFromCacheData,
    clearAudioCache as clearAudioCacheData,
    setCurrentTrack,
    getCurrentTrack // Added getter for currentTrack
} from './src/audioCache.js';
import {
    loadAudioFromCache as playAudioFromCache, // Renamed for clarity
    setupMediaSessionHandlers
} from './src/audioPlayer.js';
import { fetchMp3 as fetchAudioData } from './src/api.js'; // Renamed for clarity
import { handleSharedUrl } from './src/utils.js'; // checkOnlineStatus might be useful later

import * as ui from './src/ui.js';

// Default API server if not set in localStorage (align with api.js or make it configurable globally)
const DEFAULT_API_SERVER = "Mightypeacock/webtoaudio";

document.addEventListener("DOMContentLoaded", async function() {
    // --- 1. Initialize UI Elements ---
    // This will get all DOM elements and store them in ui.js module scope
    const uiElements = ui.initializeUI();
    const audioPlayer = ui.getAudioPlayerElement(); // Get the actual audio element
    const playButton = ui.getPlayButtonElement(); // Get the actual play button element

    if (!audioPlayer) {
        ui.showAlert("Critical error: Audio player HTML element not found. App cannot function.");
        return;
    }

    // --- Helper function to process a link (fetch or load from cache) ---
    async function processLink(link) {
        if (!link) return;

        ui.showLoading(`Processing: ${link}`); // Initial loading message
        ui.hideTranscription(); // Hide previous transcription
        try {
            // Define the progress callback for fetchAudioData
            const onProgressUpdate = (progressMessage) => {
                ui.showLoading(progressMessage); // Update loading indicator with progress
            };

            const result = await fetchAudioData(link, onProgressUpdate);

            if (result.success) {
                // playAudioFromCache (previously loadAudioFromCache) will handle playing and UI updates for transcription/player
                // It now returns true on success, false on failure
                const playSuccess = await playAudioFromCache(link);
                if (playSuccess) {
                    ui.showAlert(result.loadedFromCache ? `Loaded from cache: ${link}` : `Successfully fetched and playing: ${link}`);
                } else {
                    // Error during playAudioFromCache is handled by showAlert within it.
                    // Reset relevant UI parts if playAudioFromCache indicated failure.
                    ui.resetPlayerSrc();
                    ui.hidePlayButton();
                    ui.hideTranscription();
                }
            }
            // No explicit 'else' here, as fetchAudioData throws on error
        } catch (error) {
            console.error("Error processing link:", error);
            ui.showAlert(`Error: ${error.message}`);
            ui.resetPlayerSrc();
            ui.hidePlayButton();
            ui.hideTranscription();
        } finally {
            ui.hideLoading();
            refreshHistoryDisplay(); // Update history in case new item was added or failed
        }
    }

    // --- 2. Load Settings & Initial State ---
    const savedApiKey = localStorage.getItem('openaiApiKey') || '';
    const savedApiServer = localStorage.getItem('apiServer') || DEFAULT_API_SERVER;
    ui.setApiKeyInputValue(savedApiKey);
    ui.setApiServerInputValue(savedApiServer);
    ui.setOriginalSettingsForModal(savedApiKey, savedApiServer); // Store for modal 'cancel'

    // --- 3. Setup Event Listeners using elements from ui.js ---
    const eventListenerElements = ui.getElementsForEventListeners();

    if (eventListenerElements.settingsBtn) {
        eventListenerElements.settingsBtn.onclick = () => {
            // Update original values in ui.js before opening, in case they were changed programmatically
            ui.setOriginalSettingsForModal(ui.getApiKeyInputValue(), ui.getApiServerInputValue());
            ui.openSettingsModal();
        };
    }

    if (eventListenerElements.closeModalBtn) {
        eventListenerElements.closeModalBtn.onclick = () => ui.closeSettingsModal(true); // true to restore original values
    }

    if (eventListenerElements.toggleApiKeyBtn) {
        eventListenerElements.toggleApiKeyBtn.onclick = ui.toggleApiKeyVisibility;
    }

    if (eventListenerElements.saveSettingsBtn) {
        eventListenerElements.saveSettingsBtn.onclick = function() {
            const apiKey = ui.getApiKeyInputValue();
            const apiServer = ui.getApiServerInputValue();
            if (apiKey && apiServer) {
                localStorage.setItem('openaiApiKey', apiKey);
                localStorage.setItem('apiServer', apiServer);
                ui.setOriginalSettingsForModal(apiKey, apiServer); // Update "original" to current saved
                ui.showAlert('Settings saved successfully!');
                ui.closeSettingsModal(false); // false, don't restore, they are saved
            } else {
                ui.showAlert('Please enter both a valid API key and API server.');
            }
        };
    }

    // Keyboard listeners for settings modal
    if (eventListenerElements.settingsModal) {
        window.onclick = function(event) {
            if (event.target == eventListenerElements.settingsModal) {
                ui.closeSettingsModal(true);
            }
        };
        document.addEventListener('keydown', function(event) {
            if (eventListenerElements.settingsModal.style.display === "block") {
                if (event.key === "Escape") {
                    ui.closeSettingsModal(true);
                } else if (event.key === "Enter" && eventListenerElements.apiKeyInput === document.activeElement) {
                    // Allow Enter on API Key input to trigger save (optional)
                    // Or just let the button be clicked. For now, let button handle it.
                } else if (event.key === "Enter" && eventListenerElements.saveSettingsBtn) {
                     eventListenerElements.saveSettingsBtn.click(); // Trigger save on Enter if modal is up generally
                }
            }
        });
    }

    // Audio Player Controls
    if (playButton && audioPlayer) {
        playButton.onclick = () => {
            if (audioPlayer.paused) {
                audioPlayer.play();
            } else {
                audioPlayer.pause();
            }
        };
        audioPlayer.onplay = () => ui.updatePlayButtonState(true);
        audioPlayer.onpause = () => ui.updatePlayButtonState(false);
    }

    if (uiElements.skipBackwardButton && audioPlayer) {
        uiElements.skipBackwardButton.onclick = () => {
            audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10);
        };
    }
    if (uiElements.skipForwardButton && audioPlayer) {
        uiElements.skipForwardButton.onclick = () => {
            audioPlayer.currentTime = Math.min(audioPlayer.duration || 0, audioPlayer.currentTime + 10);
        };
    }

    // --- 4. History List Management ---
    function refreshHistoryDisplay() {
        // `audioCache` is imported directly from audioCache.js and is expected to be up-to-date
        ui.updateHistoryListUI(audioCache,
            (link) => { // onPlayCallback
                processLink(link);
            },
            async (link) => { // onRemoveCallback
                await removeFromCacheData(link); // Use renamed cache function
                refreshHistoryDisplay();
                // If current track is removed, reset player
                if (getCurrentTrack() === link) {
                    ui.resetPlayerSrc();
                    ui.hidePlayButton();
                    ui.hideTranscription();
                    setCurrentTrack(null);
                }
            }
        );
    }

    if (eventListenerElements.clearHistoryBtn) {
        eventListenerElements.clearHistoryBtn.onclick = async function() {
            await clearAudioCacheData(); // Use renamed cache function
            refreshHistoryDisplay();
            ui.resetPlayerSrc();
            ui.hidePlayButton();
            ui.hideTranscription();
            setCurrentTrack(null);
        };
    }

    // Initial load of audio cache data and history display
    await loadAudioCacheData(); // Use renamed cache function
    refreshHistoryDisplay();

    // --- 5. Save Current Playback Position Periodically ---
    setInterval(() => {
        const currentTrackLink = getCurrentTrack();
        if (currentTrackLink && audioCache[currentTrackLink] && audioPlayer.currentTime > 0 && !audioPlayer.paused) {
            audioCache[currentTrackLink].lastPosition = audioPlayer.currentTime;
            // Potentially debounce this or use a more sophisticated save strategy
            localStorage.setItem('audioCache', JSON.stringify(audioCache));
        }
    }, 5000);

    // --- 6. Handle Shared URL on Load ---
    const sharedLink = handleSharedUrl();
    if (sharedLink) {
        console.log('Shared URL detected:', sharedLink);
        processLink(sharedLink);
    } else {
        console.log("No shared URL provided. Waiting for user input or history interaction.");
        // Optionally, load the last played track if available
        const lastTrack = getCurrentTrack();
        if (lastTrack && audioCache[lastTrack]) {
            console.log("Loading last played track:", lastTrack);
            processLink(lastTrack);
        } else {
            ui.hidePlayButton(); // Ensure play button is hidden if nothing to play
        }
    }

    // --- 7. Setup Media Session Handlers ---
    // Pass the actual audio and play button elements
    if (audioPlayer && playButton) {
        setupMediaSessionHandlers(audioPlayer, playButton);
    }

    // --- 8. Online/Offline Status (Optional Enhancement) ---
    // window.addEventListener('online', () => {
    //     ui.showAlert('You are back online!');
    //     refreshHistoryDisplay(); // Refresh, some items might be playable now
    // });
    // window.addEventListener('offline', () => {
    //     ui.showAlert('You are offline. Some features may be limited.');
    // });

    console.log("Application initialized.");
});
