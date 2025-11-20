// src/ui.js

// --- Element Selectors ---
let audioPlayer, playButton, skipBackwardButton, skipForwardButton;
let settingsBtn, settingsModal, closeModalBtn, saveSettingsBtn, apiKeyInput, toggleApiKeyBtn, apiServerInput;
let historyListEl, clearHistoryBtn;
let loadingIndicatorEl, transcriptionContainerEl, transcriptionElementEl;
let urlInput, generateBtn;

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
    closeModalBtn = document.querySelector('#settingsModal .close');
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

    // URL Input Elements
    urlInput = document.getElementById('urlInput');
    generateBtn = document.getElementById('generateBtn');

    // Validate that all elements are found
    const elements = {
        audioPlayer, playButton, skipBackwardButton, skipForwardButton,
        settingsBtn, settingsModal, closeModalBtn, saveSettingsBtn, apiKeyInput, toggleApiKeyBtn, apiServerInput,
        historyListEl, clearHistoryBtn,
        loadingIndicatorEl, transcriptionContainerEl, transcriptionElementEl,
        urlInput, generateBtn
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
        loadingIndicatorEl.classList.remove('hidden');
    }
    if (transcriptionContainerEl) transcriptionContainerEl.classList.add('hidden');
}

export function hideLoading() {
    if (loadingIndicatorEl) loadingIndicatorEl.classList.add('hidden');
}

// --- Transcription Display ---
export function showTranscription(text) {
    if (transcriptionElementEl) transcriptionElementEl.textContent = text;
    if (transcriptionContainerEl) transcriptionContainerEl.classList.remove('hidden');
}

export function hideTranscription() {
    if (transcriptionContainerEl) transcriptionContainerEl.classList.add('hidden');
}

// --- Player Controls ---
export function showPlayButton() {
    if (playButton) playButton.classList.remove('hidden');
}

export function hidePlayButton() {
    if (playButton) playButton.classList.add('hidden');
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
        settingsModal.classList.remove('hidden');
        if (apiKeyInput) apiKeyInput.focus();
    }
}

export function closeSettingsModal(restoreOriginal = true) {
    if (settingsModal) {
        settingsModal.classList.add('hidden');
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
        li.className = 'flex justify-between items-center p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors';

        const textContainer = document.createElement('div');
        textContainer.className = 'flex-1 mr-3 overflow-hidden';

        const textNode = document.createElement('span');
        textNode.className = 'text-muted-foreground truncate block';
        textNode.textContent = entry.title || link;
        textNode.title = link; // Show full link on hover
        textContainer.appendChild(textNode);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex gap-2';

        const playBtn = document.createElement('button');
        playBtn.className = 'bg-primary text-primary-foreground px-3 py-1 rounded text-sm hover:bg-primary/90 transition-colors';
        playBtn.textContent = 'Play';
        playBtn.onclick = () => onPlayCallback(link);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'bg-destructive text-destructive-foreground px-3 py-1 rounded text-sm hover:bg-destructive/90 transition-colors';
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = () => onRemoveCallback(link);

        li.appendChild(textContainer);
        buttonContainer.appendChild(playBtn);
        buttonContainer.appendChild(removeBtn);
        li.appendChild(buttonContainer);
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
export function getUrlInputValue() { return urlInput ? urlInput.value.trim() : ''; }
export function setUrlInputValue(value) { if (urlInput) urlInput.value = value; }

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
        settingsModal, // For Escape key and window click listener
        generateBtn, urlInput
    };
}
