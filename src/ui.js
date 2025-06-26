// src/ui.js

// --- Element Selectors ---
let audioPlayer, playButton, skipBackwardButton, skipForwardButton;
let settingsBtn, settingsModal, closeModalBtn, saveSettingsBtn, apiKeyInput, toggleApiKeyBtn, apiServerInput;
let historyListEl, clearHistoryBtn;
let loadingIndicatorEl, transcriptionContainerEl, transcriptionElementEl;

// --- Initialization ---
export function initializeUI() {
    // Audio Player Elements
    audioPlayer = document.getElementById('player');
    playButton = document.getElementById('playButton');
    skipBackwardButton = document.getElementById('skipBackward');
    skipForwardButton = document.getElementById('skipForward');

    // Settings Modal Elements
    settingsBtn = document.getElementById('settingsBtn');
    settingsModal = document.getElementById('settingsModal');
    closeModalBtn = document.querySelector('.modal .close'); // More specific selector
    saveSettingsBtn = document.getElementById('saveSettings');
    apiKeyInput = document.getElementById('apiKey');
    toggleApiKeyBtn = document.getElementById('toggleApiKey');
    apiServerInput = document.getElementById('apiServer');

    // History List Elements
    historyListEl = document.getElementById('historyList');
    clearHistoryBtn = document.getElementById('clearHistory');

    // Other UI Elements
    loadingIndicatorEl = document.getElementById('loadingIndicator');
    transcriptionContainerEl = document.getElementById('transcriptionContainer');
    transcriptionElementEl = document.getElementById('transcription');

    // Validate that all elements are found
    const elements = {
        audioPlayer, playButton, skipBackwardButton, skipForwardButton,
        settingsBtn, settingsModal, closeModalBtn, saveSettingsBtn, apiKeyInput, toggleApiKeyBtn, apiServerInput,
        historyListEl, clearHistoryBtn,
        loadingIndicatorEl, transcriptionContainerEl, transcriptionElementEl
    };

    for (const key in elements) {
        if (!elements[key]) {
            console.warn(`UI element not found: ${key}. Some UI features may not work.`);
        }
    }

    return elements;
}

// --- Loading Indicator ---
export function showLoading(message = 'Loading audio...') {
    if (loadingIndicatorEl) {
        loadingIndicatorEl.textContent = message;
        loadingIndicatorEl.style.display = 'block';
    }
    if (transcriptionContainerEl) transcriptionContainerEl.style.display = 'none';
}

export function hideLoading() {
    if (loadingIndicatorEl) loadingIndicatorEl.style.display = 'none';
}

// --- Transcription Display ---
export function showTranscription(text) {
    if (transcriptionElementEl) transcriptionElementEl.textContent = text;
    if (transcriptionContainerEl) transcriptionContainerEl.style.display = 'block';
}

export function hideTranscription() {
    if (transcriptionContainerEl) transcriptionContainerEl.style.display = 'none';
}

// --- Player Controls ---
export function showPlayButton() {
    if (playButton) playButton.style.display = 'block';
}

export function hidePlayButton() {
    if (playButton) playButton.style.display = 'none';
}

export function updatePlayButtonState(isPlaying) {
    if (playButton) playButton.textContent = isPlaying ? 'Pause' : 'Play';
}

export function resetPlayerSrc() {
    if (audioPlayer) audioPlayer.src = '';
}

// --- Settings Modal ---
export function openSettingsModal() {
    if (settingsModal) {
        // Store current values before opening, in case of cancel
        if (apiKeyInput) settingsModal.dataset.originalApiKey = apiKeyInput.value;
        if (apiServerInput) settingsModal.dataset.originalApiServer = apiServerInput.value;
        settingsModal.style.display = 'block';
        if (apiKeyInput) apiKeyInput.focus();
    }
}

export function closeSettingsModal(restoreOriginal = true) {
    if (settingsModal) {
        settingsModal.style.display = 'none';
        if (restoreOriginal) {
            if (apiKeyInput && typeof settingsModal.dataset.originalApiKey !== 'undefined') {
                apiKeyInput.value = settingsModal.dataset.originalApiKey;
            }
            // No need to restore apiServerInput if not changed or saved
        }
    }
}

export function toggleApiKeyVisibility() {
    if (apiKeyInput && toggleApiKeyBtn) {
        if (apiKeyInput.type === "password") {
            apiKeyInput.type = "text";
            toggleApiKeyBtn.textContent = "🔒";
        } else {
            apiKeyInput.type = "password";
            toggleApiKeyBtn.textContent = "👁️";
        }
    }
}

// --- History List ---
export function updateHistoryListUI(history, onPlayCallback, onRemoveCallback) {
    if (!historyListEl) return;
    historyListEl.innerHTML = '';
    Object.keys(history).forEach(link => {
        const entry = history[link];
        const li = document.createElement('li');

        const textNode = document.createElement('span');
        textNode.textContent = entry.title || link; // Use title if available
        textNode.title = link; // Show full link on hover
        li.appendChild(textNode);

        const playBtn = document.createElement('button');
        playBtn.textContent = 'Play';
        playBtn.onclick = () => onPlayCallback(link);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = () => onRemoveCallback(link);

        li.appendChild(playBtn);
        li.appendChild(removeBtn);
        historyListEl.appendChild(li);
    });
}

// --- Alerts ---
export function showAlert(message) {
    alert(message); // Simple alert, can be replaced with a custom modal later
}

// --- Getters for elements needed by other modules (use sparingly) ---
// Only if other modules absolutely need direct access after initialization
export function getAudioPlayerElement() { return audioPlayer; }
export function getPlayButtonElement() { return playButton; }
export function getApiKeyInputValue() { return apiKeyInput ? apiKeyInput.value.trim() : ''; }
export function getApiServerInputValue() { return apiServerInput ? apiServerInput.value.trim() : ''; }
export function setApiKeyInputValue(value) { if (apiKeyInput) apiKeyInput.value = value; }
export function setApiServerInputValue(value) { if (apiServerInput) apiServerInput.value = value; }

// --- Initial values for settings modal (to be called from script.js) ---
export function setOriginalSettingsForModal(apiKey, apiServer) {
    if (settingsModal) {
        settingsModal.dataset.originalApiKey = apiKey;
        settingsModal.dataset.originalApiServer = apiServer;
    }
}

export function getOriginalApiKeyForModal() {
    return settingsModal ? settingsModal.dataset.originalApiKey : '';
}

export function getOriginalApiServerForModal() {
     return settingsModal ? settingsModal.dataset.originalApiServer : '';
}

// Add a function to get all necessary elements for event listeners in script.js
export function getElementsForEventListeners() {
    return {
        settingsBtn, closeModalBtn, saveSettingsBtn, toggleApiKeyBtn, clearHistoryBtn,
        apiKeyInput, // For Enter key listener
        settingsModal // For Escape key and window click listener
    };
}
