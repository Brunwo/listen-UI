import { Client } from "@gradio/client";
import { audioCache, saveAudioCache } from './audioCache.js';
import { loadAudioFromCache, updateMediaSessionMetadata } from './audioPlayer.js';

const DEFAULT_API_SERVER = "Mightypeacock/webtoaudio";
/**
 * Fetches an MP3 file from the specified link.
 * @param {string} link - The URL of the audio content to fetch.
 * @returns {Promise<void>}
 */

export async function fetchMp3(link) {
    if (!navigator.onLine) {
        alert('You are offline. Unable to fetch new audio.');
        return;
    }

    console.log('Starting fetchMp3 function with link:', link);
    const loadingIndicator = document.getElementById('loadingIndicator');
    const audioPlayer = document.getElementById('player');
    const playButton = document.getElementById('playButton');
    const transcriptionContainer = document.getElementById('transcriptionContainer');
    const transcriptionElement = document.getElementById('transcription');

    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (transcriptionContainer) transcriptionContainer.style.display = 'none';

    try {
        if (audioCache[link]) {
            console.log('Loading audio from cache');
            await loadAudioFromCache(link);
            return;
        }

        const apiKey = localStorage.getItem('openaiApiKey');
        const apiServer = localStorage.getItem('apiServer') || DEFAULT_API_SERVER;
        console.log('Retrieved API key and server from localStorage');
        console.log('API Server:', apiServer);

        if (!apiKey) {
            throw new Error("API key not set. Please set your OpenAI API key in the settings.");
        }

        console.log('Attempting to connect to Gradio app...');
        const client = await Client.connect(apiServer);
        console.log('Gradio client created successfully');
        console.log(await client.view_api());
        console.log('Preparing to make prediction...');

        const result = await client.predict("/generate_audio", { 
            url: link,
            openai_api_key: apiKey,
            text_model: "gpt-4o-mini",
            audio_model: "tts-1",
            speaker_1_voice: "alloy",
            speaker_2_voice: "echo",
            api_base: null,
            edited_transcript: "",
            user_feedback: "",
            original_text: "summary"
        });

        console.log('Raw result from predict:', result);
        console.log('Result data:', result.data);
        console.log('Prediction made successfully');

        if (!Array.isArray(result.data) || result.data.length === 0) {
            throw new Error('Unexpected result format from server');
        }

        const audioFileUrl = result.data[0].url;
        console.log('Received audio file URL:', audioFileUrl);

        if (typeof audioFileUrl !== 'string' || !audioFileUrl.startsWith('http')) {
            throw new Error(`Invalid audio file URL received: ${audioFileUrl}`);
        }

        audioCache[link] = {
            audioUrl: audioFileUrl,
            transcription: result.data[1],
            lastPosition: 0
        };
        await saveAudioCache(link, audioFileUrl);
        await loadAudioFromCache(link);

        updateMediaSessionMetadata(link, 'Web to Audio', 'Generated Audio');

    } catch (error) {
        console.error('Error in fetchMp3:', error);
        console.error('Error stack:', error.stack);
        alert(`Error fetching MP3: ${error.message}`);
        
        if (audioPlayer) audioPlayer.src = '';
        if (playButton) playButton.style.display = 'none';
        if (transcriptionContainer) transcriptionContainer.style.display = 'none';
    } finally {
        if (loadingIndicator) 
            loadingIndicator.style.display = 'none';
    }
}