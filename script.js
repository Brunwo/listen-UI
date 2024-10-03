document.addEventListener("DOMContentLoaded", function() {
    const audioPlayer = document.getElementById('player');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeBtn = document.querySelector('.close');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const apiKeyInput = document.getElementById('apiKey');
    const toggleApiKeyBtn = document.getElementById('toggleApiKey');

    let originalApiKey = '';

    // Load saved API key on page load
    const savedApiKey = localStorage.getItem('openaiApiKey');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
        originalApiKey = savedApiKey;
    }

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
        if (apiKey) {
            localStorage.setItem('openaiApiKey', apiKey);
            originalApiKey = apiKey;  // Update original key
            alert('API key saved successfully!');
            closeModal();
        } else {
            alert('Please enter a valid API key.');
        }
    }

    saveSettingsBtn.onclick = saveSettings;

    // Function to fetch MP3 from API endpoint when a link is shared
    async function fetchMp3(link) {
        try {
            const apiKey = localStorage.getItem('openaiApiKey');
            if (!apiKey) {
                throw new Error("API key not set. Please set your OpenAI API key in the settings.");
            }

            const response = await fetch('/api/generate-audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: link,
                    // Use the saved API key
                    openai_api_key: apiKey,
                    text_model: 'gpt-4o-mini',
                    audio_model: 'tts-1',
                    speaker_1_voice: 'alloy',
                    speaker_2_voice: 'echo',
                    // ... other parameters ...
                }),
            });

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
  
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            // Set the audio player source
            audioPlayer.src = data.audio_file;
            audioPlayer.play();
        } catch (error) {
            console.error('Error fetching MP3:', error);
            alert(error.message);
        }
    }
  
    // Get the link from the shared URL
    const queryParams = new URLSearchParams(window.location.search);
    const sharedLink = queryParams.get('url');
    
    // Only call the API to get MP3 if a valid URL is provided
    if (sharedLink) {
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