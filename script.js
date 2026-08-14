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
import { fetchMp3 as fetchAudioData, DEFAULT_API_SERVER } from './src/api.js'; // Renamed for clarity
import { handleSharedUrl } from './src/utils.js'; // checkOnlineStatus might be useful later
import huggingfaceClient, { DEFAULT_HF_ENDPOINT_URL } from './src/huggingface.js';

import * as ui from './src/ui.js';

// --- Validation Utilities ---
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

document.addEventListener("DOMContentLoaded", async function () {
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
        if (!link) {
            ui.showAlert('No URL provided.');
            return;
        }

        if (!isValidUrl(link)) {
            ui.showAlert('Please enter a valid URL starting with http:// or https://');
            return;
        }

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
    const savedHfApiKey = localStorage.getItem('hf_api_key') || '';
    const savedHfToken = localStorage.getItem('hf_token') || '';
    const savedHfEndpointUrl = localStorage.getItem('hf_endpoint_url') || '';

    // A valid HF token can be saved in either the "API Key" or "Token" field — prefer
    // the dedicated API Key field, fall back to the Token field.
    const savedHfKey = savedHfApiKey || savedHfToken;

    ui.setApiKeyInputValue(savedApiKey);
    ui.setApiServerInputValue(savedApiServer);
    ui.setHfApiKeyInputValue(savedHfApiKey);
    ui.setHfTokenInputValue(savedHfToken);
    ui.setHfEndpointUrlInputValue(savedHfEndpointUrl || DEFAULT_HF_ENDPOINT_URL);
    ui.setOriginalSettingsForModal(savedApiKey, '', savedApiServer, savedHfApiKey, savedHfEndpointUrl); // Store for modal 'cancel'
    
    // Initialize Hugging Face client with saved settings
    if (savedHfKey) {
        huggingfaceClient.setApiKey(savedHfKey);
    }
    if (savedHfEndpointUrl) {
        huggingfaceClient.setEndpointUrl(savedHfEndpointUrl);
    }

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

    if (eventListenerElements.toggleHfApiKeyBtn) {
        eventListenerElements.toggleHfApiKeyBtn.onclick = ui.toggleHfApiKeyVisibility;
    }

    if (eventListenerElements.testHfConnectionBtn) {
        eventListenerElements.testHfConnectionBtn.onclick = async function () {
            // A token entered in either the "API Key" or "Token" field works.
            const hfApiKey = ui.getHfApiKeyInputValue();
            const hfToken = ui.getHfTokenInputValue();
            const hfKey = hfApiKey || hfToken;
            const hfEndpointUrl = ui.getHfEndpointUrlInputValue();

            if (!hfKey) {
                ui.showAlert('Please enter a Hugging Face API key or token.');
                return;
            }

            // Temporarily use the entered values for this test (without saving yet)
            huggingfaceClient.apiKey = hfKey;
            huggingfaceClient.endpointUrl = hfEndpointUrl;

            ui.showLoading('Testing HF connection...');
            try {
                // Token smoke test first (works with just a key), then tries the
                // endpoint if one is configured — defaulting to the free embedding endpoint.
                const result = await huggingfaceClient.testConnection(
                    hfEndpointUrl || DEFAULT_HF_ENDPOINT_URL
                );
                console.log('HF Connection test result:', result);
                const endpointNote = result.endpointTested
                    ? ` (endpoint verified: ${result.endpointUrl})`
                    : ` (endpoint not checked: ${result.endpointUrl})`;
                ui.showAlert(`Hugging Face token valid as "${result.user}"!${endpointNote}`);
            } catch (error) {
                console.error('HF Connection test failed:', error);
                ui.showAlert(`HF connection failed: ${error.message}`);
            } finally {
                ui.hideLoading();
            }
        };
    }

    if (eventListenerElements.saveSettingsBtn) {
        eventListenerElements.saveSettingsBtn.onclick = function () {
            const apiKey = ui.getApiKeyInputValue();
            const apiServer = ui.getApiServerInputValue();
            const hfApiKey = ui.getHfApiKeyInputValue();
            const hfToken = ui.getHfTokenInputValue();
            const hfEndpointUrl = ui.getHfEndpointUrlInputValue();

            // Save Hugging Face settings independently from OpenAI settings.
            const hfKey = hfApiKey || hfToken;
            if (hfKey) {
                localStorage.setItem('hf_api_key', hfApiKey);
                localStorage.setItem('hf_token', hfToken);
                huggingfaceClient.setApiKey(hfKey);
            }
            // Only persist a custom endpoint; the free default is implicit and
            // can be updated in code without stale localStorage overrides.
            if (hfEndpointUrl && hfEndpointUrl !== DEFAULT_HF_ENDPOINT_URL) {
                localStorage.setItem('hf_endpoint_url', hfEndpointUrl);
                huggingfaceClient.setEndpointUrl(hfEndpointUrl);
            } else {
                localStorage.removeItem('hf_endpoint_url');
                huggingfaceClient.setEndpointUrl('');
            }

            if (apiKey && apiServer) {
                localStorage.setItem('openaiApiKey', apiKey);
                localStorage.setItem('apiServer', apiServer);
                ui.setOriginalSettingsForModal(apiKey, '', apiServer, hfApiKey, hfEndpointUrl); // Update "original" to current saved
                ui.showAlert('Settings saved successfully!');
                ui.closeSettingsModal(false); // false, don't restore, they are saved
            } else {
                ui.showAlert('OpenAI settings incomplete — saved Hugging Face settings only. Please enter both a valid API key and API server.');
            }
        };
    }

    // Keyboard listeners for settings modal
    if (eventListenerElements.settingsModal) {
        window.onclick = function (event) {
            if (event.target == eventListenerElements.settingsModal) {
                ui.closeSettingsModal(true);
            }
        };
        document.addEventListener('keydown', function (event) {
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
        eventListenerElements.clearHistoryBtn.onclick = async function () {
            await clearAudioCacheData(); // Use renamed cache function
            refreshHistoryDisplay();
            ui.resetPlayerSrc();
            ui.hidePlayButton();
            ui.hideTranscription();
            setCurrentTrack(null);
        };
    }

    // --- Manual URL Generation ---
    if (eventListenerElements.generateBtn) {
        eventListenerElements.generateBtn.onclick = () => {
            const url = ui.getUrlInputValue();
            if (url) {
                processLink(url);
            } else {
                ui.showAlert("Please enter a valid URL.");
            }
        };
    }

    if (eventListenerElements.urlInput) {
        eventListenerElements.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const url = ui.getUrlInputValue();
                if (url) {
                    processLink(url);
                } else {
                    ui.showAlert("Please enter a valid URL.");
                }
            }
        });
    }

    // --- 8. Online/Offline Status (Optional Enhancement) ---
    // window.addEventListener('online', () => {
    //     ui.showAlert('You are back online!');
    //     refreshHistoryDisplay(); // Refresh, some items might be playable now
    // });
    // window.addEventListener('offline', () => {
    //     ui.showAlert('You are offline. Some features may be limited.');
    // });

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

    console.log("Application initialized.");
});
