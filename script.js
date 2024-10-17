import { audioCache, loadAudioCache, removeFromCache, clearAudioCache } from './src/audioCache.js';
import { loadAudioFromCache, setupMediaSessionHandlers } from './src/audioPlayer.js';
import { fetchMp3 } from './src/api.js';
import { checkOnlineStatus, handleSharedUrl } from './src/utils.js';

document.addEventListener("DOMContentLoaded", async function() {
    const audioPlayer = document.getElementById('player');
    const playButton = document.getElementById('playButton');
    const skipBackwardButton = document.getElementById('skipBackward');
    const skipForwardButton = document.getElementById('skipForward');
  
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeBtn = document.querySelector('.close');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const apiKeyInput = document.getElementById('apiKey');
    const toggleApiKeyBtn = document.getElementById('toggleApiKey');
    const apiServerInput = document.getElementById('apiServer');

    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistory');

    let originalApiKey = '';
    let originalApiServer = '';

    //checkOnlineStatus();

    // window.addEventListener('online', () => {
    //     alert('You are back online!');
    //     updateHistoryList();
    // });

    // window.addEventListener('offline', () => {
    //     alert('You are offline. Some features may be limited.');
    // });

    // Load saved settings
    const savedApiKey = localStorage.getItem('openaiApiKey');
    const savedApiServer = localStorage.getItem('apiServer') || DEFAULT_API_SERVER;
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
        originalApiKey = savedApiKey;
    }
    apiServerInput.value = savedApiServer;
    originalApiServer = savedApiServer;

    // Toggle API key visibility
    toggleApiKeyBtn.onclick = function() {
        if (apiKeyInput.type === "password") {
            apiKeyInput.type = "text";
            toggleApiKeyBtn.textContent = "🔒";
        } else {
            apiKeyInput.type = "password";
            toggleApiKeyBtn.textContent = "👁️";
        }
    }

    // Settings modal functionality
    settingsBtn.onclick = function() {
        originalApiKey = apiKeyInput.value;
        originalApiServer = apiServerInput.value;
        settingsModal.style.display = "block";
        apiKeyInput.focus();
    }

    function closeModal() {
        settingsModal.style.display = "none";
        apiKeyInput.value = originalApiKey;
    }

    closeBtn.onclick = closeModal;

    window.onclick = function(event) {
        if (event.target == settingsModal) {
            closeModal();
        }
    }

    document.addEventListener('keydown', function(event) {
        if (settingsModal.style.display === "block") {
            if (event.key === "Escape") {
                closeModal();
            } else if (event.key === "Enter") {
                saveSettings();
            }
        }
    });

    function saveSettings() {
        const apiKey = apiKeyInput.value.trim();
        const apiServer = apiServerInput.value.trim();
        if (apiKey && apiServer) {
            localStorage.setItem('openaiApiKey', apiKey);
            localStorage.setItem('apiServer', apiServer);
            originalApiKey = apiKey;
            originalApiServer = apiServer;
            alert('Settings saved successfully!');
            closeModal();
        } else {
            alert('Please enter both a valid API key and API server.');
        }
    }

    saveSettingsBtn.onclick = saveSettings;

    // Load audio cache and update history list
    await loadAudioCache();
    updateHistoryList();

    function updateHistoryList() {
        historyList.innerHTML = '';
        Object.keys(audioCache).forEach(link => {
            const li = document.createElement('li');
            const playBtn = document.createElement('button');
            playBtn.textContent = 'Play';
            playBtn.onclick = () => loadAudioFromCache(link);
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = () => {
                removeFromCache(link);
                updateHistoryList();
            };
            li.appendChild(document.createTextNode(link + ' '));
            li.appendChild(playBtn);
            li.appendChild(removeBtn);
            historyList.appendChild(li);
        });
    }

    clearHistoryBtn.onclick = async function() {
        await clearAudioCache();
        updateHistoryList();
    };

    // Save current position every 5 seconds
    setInterval(() => {
        if (typeof currentTrack !== 'undefined' && currentTrack && audioPlayer.currentTime > 0) {
            audioCache[currentTrack].lastPosition = audioPlayer.currentTime;
            localStorage.setItem('audioCache', JSON.stringify(audioCache));
        }
    }, 5000);

    // Handle shared URL
    const sharedLink = handleSharedUrl();
    if (sharedLink) {
        console.log('Valid URL provided, calling fetchMp3');
        fetchMp3(sharedLink);
    } else {
        console.log("No URL provided. Waiting for user input.");
    }

    // Set up media session handlers
    setupMediaSessionHandlers(audioPlayer, playButton);
});