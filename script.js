document.addEventListener("DOMContentLoaded", function() {
    const audioPlayer = document.getElementById('player');
    
    // Function to fetch MP3 from API endpoint when a link is shared
    async function fetchMp3(link) {
      try {
        const response = await fetch('/api/generate-audio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: link,
            // Add other necessary parameters here
            openai_api_key: 'your_api_key_here', // Be cautious with API keys in client-side code
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
      }
    }
  
    // Get the link from the shared URL or use a default one
    const queryParams = new URLSearchParams(window.location.search);
    const sharedLink = queryParams.get('link') || 'https://example.com/default-text';
    
    // Call the API to get MP3
    fetchMp3(sharedLink);
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