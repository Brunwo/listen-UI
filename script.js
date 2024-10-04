import { Client } from "@gradio/client";

// Add these variables at the top of the file
let audioCache = {};
let currentTrack = null;

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


    let originalApiKey = '';
    let originalApiServer = '';

    // Load saved settings on page load
    const savedApiKey = localStorage.getItem('openaiApiKey');
    const savedApiServer = localStorage.getItem('apiServer') || 'http://127.0.0.1:7860';
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

    // Open settings modal
    settingsBtn.onclick = function() {
        originalApiKey = apiKeyInput.value;
        originalApiServer = apiServerInput.value;
        settingsModal.style.display = "block";
        apiKeyInput.focus();
    }

    // Close settings modal
    function closeModal() {
        settingsModal.style.display = "none";
        apiKeyInput.value = originalApiKey;  // Revert to original value
    }

    closeBtn.onclick = closeModal;

    // Close modal if clicked outside
    window.onclick = function(event) {
        if (event.target == settingsModal) {
            closeModal();
        }
    }

    // Handle keydown events
    document.addEventListener('keydown', function(event) {
        if (settingsModal.style.display === "block") {
            if (event.key === "Escape") {
                closeModal();
            } else if (event.key === "Enter") {
                saveSettings();
            }
        }
    });

    // Save settings
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

    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistory');

    // Load audio cache from localStorage and Cache API
    await loadAudioCache();

    // Update history list
    updateHistoryList();

    // Function to fetch MP3 from API endpoint when a link is shared
    async function fetchMp3(link) {
        console.log('Starting fetchMp3 function with link:', link);
        const loadingIndicator = document.getElementById('loadingIndicator');
        const audioPlayer = document.getElementById('player');
        const playButton = document.getElementById('playButton');
        const transcriptionContainer = document.getElementById('transcriptionContainer');
        const transcriptionElement = document.getElementById('transcription');

        if (loadingIndicator) loadingIndicator.style.display = 'block';
        if (transcriptionContainer) transcriptionContainer.style.display = 'none';

        try {
            // Check if the link is already in the cache
            if (audioCache[link]) {
                console.log('Loading audio from cache');
                await loadAudioFromCache(link);
                return;
            }

            const apiKey = localStorage.getItem('openaiApiKey');
            const apiServer = localStorage.getItem('apiServer');
            console.log('Retrieved API key and server from localStorage');
            console.log('API Server:', apiServer);

            if (!apiKey) {
                throw new Error("API key not set. Please set your OpenAI API key in the settings.");
            }
            if (!apiServer) {
                throw new Error("API server not set. Please set the API server in the settings.");
            }

            console.log('Attempting to connect to Gradio app...');

            // Connect to local Gradio app 
            const client = await Client.connect(apiServer);

            //connect to HF deployed one OK
            //const client = await Client.connect("Mightypeacock/webtoaudio");

            console.log('Gradio client created successfully');
            
            console.log(await client.view_api())
         
            console.log('Preparing to make prediction...');
            // Make the prediction

            const result = await client.predict("/generate_audio", { 
              url:link,
              openai_api_key: apiKey,
              text_model:  "gpt-4o-mini",
              audio_model:  "tts-1",
              speaker_1_voice:   "alloy",
              speaker_2_voice:  "echo",
              api_base: null, // api_base
              edited_transcript: "", // edited_transcript
              user_feedback:  "", // user_feedback
              original_text: "summary" // original_text
              // debug: true, 
        });


        console.log('Raw result from predict:', result);
        console.log('Result data:', result.data);


        console.log('Prediction made successfully');

        // Check if result.data is an array and has at least one element
        if (!Array.isArray(result.data) || result.data.length === 0) {
            throw new Error('Unexpected result format from server');
        }

        // Assuming the audio file URL is the second item in the result
        const audioFileUrl = result.data[0].url;
        console.log('Received audio file URL:', audioFileUrl);

        // Check if the URL is valid
        if (typeof audioFileUrl !== 'string' || !audioFileUrl.startsWith('http')) {
            throw new Error(`Invalid audio file URL received: ${audioFileUrl}`);
        }

        // After successful API call, add to cache
        audioCache[link] = {
            audioUrl: audioFileUrl,
            transcription: result.data[1],
            lastPosition: 0
        };
        await saveAudioCache(link, audioFileUrl);
        updateHistoryList();

        await loadAudioFromCache(link);

    } catch (error) {
        console.error('Error in fetchMp3:', error);
        console.error('Error stack:', error.stack);
        alert(`Error fetching MP3: ${error.message}`);
        
        // Clear the audio player source and hide the play button
        if (audioPlayer) audioPlayer.src = '';
        if (playButton) playButton.style.display = 'none';
        if (transcriptionContainer) transcriptionContainer.style.display = 'none';
    } finally {
        if (loadingIndicator) 
            loadingIndicator.style.display = 'none';
    }
    }

    async function loadAudioFromCache(link) {
        const cachedAudio = audioCache[link];
        if (!cachedAudio) return;

        const audioPlayer = document.getElementById('player');
        const playButton = document.getElementById('playButton');
        const transcriptionContainer = document.getElementById('transcriptionContainer');
        const transcriptionElement = document.getElementById('transcription');

        // Fetch the audio file from the Cache API
        const cache = await caches.open('audio-cache');
        const response = await cache.match(cachedAudio.audioUrl);
        if (response) {
            const blob = await response.blob();
            audioPlayer.src = URL.createObjectURL(blob);
        } else {
            audioPlayer.src = cachedAudio.audioUrl;
        }

        audioPlayer.currentTime = cachedAudio.lastPosition;
        currentTrack = link;

        if (playButton) {
            playButton.style.display = 'block';
            playButton.onclick = () => audioPlayer.play();
        }

        if (transcriptionElement && transcriptionContainer) {
            transcriptionElement.textContent = cachedAudio.transcription;
            transcriptionContainer.style.display = 'block';
        }

        console.log('Audio loaded from cache and ready for playback');
    }

    async function saveAudioCache(link, audioUrl) {
        // Save metadata to localStorage
        localStorage.setItem('audioCache', JSON.stringify(audioCache));

        // Save audio file to Cache API
        const cache = await caches.open('audio-cache');
        await cache.add(audioUrl);
    }

    async function loadAudioCache() {
        const savedCache = localStorage.getItem('audioCache');
        if (savedCache) {
            audioCache = JSON.parse(savedCache);
        }

        // Verify that all cached audio files are still in the Cache API
        const cache = await caches.open('audio-cache');
        for (const link in audioCache) {
            const response = await cache.match(audioCache[link].audioUrl);
            if (!response) {
                console.log(`Audio file for ${link} not found in cache, removing entry`);
                delete audioCache[link];
            }
        }

        // Save the cleaned-up cache back to localStorage
        localStorage.setItem('audioCache', JSON.stringify(audioCache));
    }

    async function updateHistoryList() {
        historyList.innerHTML = '';
        Object.keys(audioCache).forEach(link => {
            const li = document.createElement('li');
            const playBtn = document.createElement('button');
            playBtn.textContent = 'Play';
            playBtn.onclick = () => loadAudioFromCache(link);
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = () => removeFromCache(link);
            li.appendChild(document.createTextNode(link + ' '));
            li.appendChild(playBtn);
            li.appendChild(removeBtn);
            historyList.appendChild(li);
        });
    }

    async function removeFromCache(link) {
        const cache = await caches.open('audio-cache');
        await cache.delete(audioCache[link].audioUrl);
        delete audioCache[link];
        localStorage.setItem('audioCache', JSON.stringify(audioCache));
        updateHistoryList();
    }

    clearHistoryBtn.onclick = async function() {
        const cache = await caches.open('audio-cache');
        for (const link in audioCache) {
            await cache.delete(audioCache[link].audioUrl);
        }
        audioCache = {};
        localStorage.setItem('audioCache', JSON.stringify(audioCache));
        updateHistoryList();
    };

    // Save current position every 5 seconds
    setInterval(() => {
        if (currentTrack && audioPlayer.currentTime > 0) {
            audioCache[currentTrack].lastPosition = audioPlayer.currentTime;
            localStorage.setItem('audioCache', JSON.stringify(audioCache));
        }
    }, 5000);

    // Get the link from the shared URL
    const queryParams = new URLSearchParams(window.location.search);
    const sharedLink = queryParams.get('url');

    console.log('Shared link from URL:', sharedLink);

    // Only call the API to get MP3 if a valid URL is provided
    if (sharedLink) {
        console.log('Valid URL provided, calling fetchMp3');
        fetchMp3(sharedLink);
    } else {
        console.log("No URL provided. Waiting for user input.");
        // You might want to update the UI here to indicate that the user needs to provide a URL
    }
});

if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Sample MP3',
        artist: 'Unknown Artist',
        album: 'Demo Album',
        artwork: [
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
    });
  
    navigator.mediaSession.setActionHandler('play', function() {
        audioPlayer.play();
        playButton.textContent = 'Pause';
    });
    
    navigator.mediaSession.setActionHandler('pause', function() {
        audioPlayer.pause();
        playButton.textContent = 'Play';
    });
  
    navigator.mediaSession.setActionHandler('seekbackward', function() {
        audioPlayer.currentTime = Math.max(audioPlayer.currentTime - 10, 0);
    });
  
    navigator.mediaSession.setActionHandler('seekforward', function() {
        audioPlayer.currentTime = Math.min(audioPlayer.currentTime + 10, audioPlayer.duration);
    });
}