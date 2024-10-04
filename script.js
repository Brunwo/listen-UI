 import { Client } from "@gradio/client";

document.addEventListener("DOMContentLoaded", function() {
    const audioPlayer = document.getElementById('player');
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

    // Function to fetch MP3 from API endpoint when a link is shared
    async function fetchMp3(link) {
        console.log('Starting fetchMp3 function with link:', link);
        try {
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

        console.log(result.data);


            console.log('Prediction made successfully');

            // Assuming the audio file URL is the first item in the result
            const audioFileUrl = result.data[0];
            console.log('Received audio file URL:', audioFileUrl);

            // Set the audio player source
            audioPlayer.src = audioFileUrl;
            audioPlayer.play();
            console.log('Audio playback started');
        } catch (error) {
            console.error('Error in fetchMp3:', error);
            console.error('Error stack:', error.stack);
            alert(`Error fetching MP3: ${error.message}`);
        }
    }
  
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
    });
    
    navigator.mediaSession.setActionHandler('pause', function() {
        audioPlayer.pause();
    });
  
    navigator.mediaSession.setActionHandler('seekbackward', function() {
        audioPlayer.currentTime = Math.max(audioPlayer.currentTime - 10, 0);
    });
  
    navigator.mediaSession.setActionHandler('seekforward', function() {
        audioPlayer.currentTime = Math.min(audioPlayer.currentTime + 10, audioPlayer.duration);
    });
}

// JavaScript code to read URL parameters
const urlParams = new URLSearchParams(window.location.search);
  
// Retrieve specific parameters
const name = urlParams.get('name'); // "John"
const age = urlParams.get('age');   // "30"

// Display the parameters in the output div
document.getElementById('shared-content').innerHTML = `
    <p>Name: ${name}</p>
    <p>Age: ${age}</p>
`;