import { Client } from "@gradio/client";
import { audioCache, saveAudioCache } from './audioCache.js';
import { loadAudioFromCache, updateMediaSessionMetadata } from './audioPlayer.js';
// No direct UI imports here, ui.js showAlert can be called from script.js if needed

export const DEFAULT_API_SERVER = "Mightypeacock/webtoaudio";

/**
 * @typedef {Object} FetchMp3Result
 * @property {boolean} success - Indicates if the operation was successful.
 * @property {string} [link] - The original link, if successful and new audio was fetched.
 * @property {boolean} [loadedFromCache] - True if audio was loaded from cache.
 * @property {Error} [error] - Error object if the operation failed.
 */

/**
 * Fetches an MP3 file from the specified link or loads it from cache.
 * Manages API communication with the Gradio backend using job submission for status updates.
 * @param {string} link - The URL of the audio content to fetch.
 * @param {function(string): void} [onProgress] - Optional callback for progress messages.
 * @returns {Promise<FetchMp3Result>} - An object indicating success or failure.
 */
export async function fetchMp3(link, onProgress) {
    if (!navigator.onLine) {
        throw new Error('You are offline. Unable to fetch new audio.');
    }

    console.log('Starting fetchMp3 (using submit) for link:', link);
    onProgress = onProgress || ((message) => console.log('Progress:', message)); // Default progress handler

    try {
        if (audioCache[link]) {
            console.log('Audio found in cache for link:', link);
            await loadAudioFromCache(link);
            return { success: true, link: link, loadedFromCache: true };
        }

        onProgress(`Fetching new audio for: ${link.substring(0, 50)}...`);
        const apiKey = localStorage.getItem('openaiApiKey');
        const apiServer = localStorage.getItem('apiServer') || DEFAULT_API_SERVER;

        if (!apiKey) {
            throw new Error("API key not set. Please set your OpenAI API key in the settings.");
        }

        onProgress("Connecting to generation service...");
        const client = await Client.connect(apiServer);
        console.log('Gradio client connected for job submission.');

        const payload = {
            url: link,
            openai_api_key: apiKey,
            text_model: "gpt-4o-mini", // These could be made configurable
            audio_model: "tts-1",
            speaker_1_voice: "alloy",
            speaker_2_voice: "echo",
            api_base: null,
            edited_transcript: "",
            user_feedback: "",
            original_text: "summary"
        };

        console.log('Submitting job to /generate_audio endpoint...');
        onProgress("Submitting request...");

        // Use a Promise to wrap the event-driven job handling
        return new Promise((resolve, reject) => {
            const job = client.submit("/generate_audio", payload);
            let finalDataReceived = false;

            // Add timeout to prevent hanging indefinitely
            const timeoutId = setTimeout(() => {
                if (!finalDataReceived) {
                    reject(new Error('Request timed out. The audio generation is taking too long. Please try again.'));
                }
            }, 120000); // 2 minute timeout

            job.on("status", (statusEvent) => {
                console.log("Job status update:", statusEvent);
                let progressMessage = `Status: ${statusEvent.stage}`;
                if (statusEvent.progress_data) {
                    // Assuming progress_data is an array of { progress, desc } or similar
                    const progData = statusEvent.progress_data[0];
                    if (progData) {
                        progressMessage += ` - ${progData.desc || ''} (${Math.round((progData.progress || 0) * 100)}%)`;
                    }
                } else if (statusEvent.eta) {
                    progressMessage += ` (ETA: ${Math.round(statusEvent.eta)}s)`;
                }
                onProgress(progressMessage);

                if (statusEvent.stage === "error") {
                    finalDataReceived = true; // Prevent further processing
                    reject(new Error(statusEvent.message || "Job failed with an error status."));
                }
                 if (statusEvent.stage === "complete" && !finalDataReceived) {
                    // Sometimes 'complete' arrives before the final 'data' event with the actual output.
                    // We rely on the 'data' event for the final output.
                    // If no 'data' event with output comes, it might be an issue.
                    onProgress("Generation complete, awaiting final data...");
                }
            });

            job.on("data", async (dataEvent) => {
                // Gradio generator functions yield data. The last yield should be the final result.
                // Non-generator functions might send a single "data" event upon completion.
                console.log("Job data received:", dataEvent);

                // Assuming the final data structure matches what client.predict would have returned in its .data field
                // For generate_audio, we expect { data: [ {url: "..."}, "transcription" ] }
                // The dataEvent for a job might be just the output array directly.
                const outputData = dataEvent.data;

                if (outputData && Array.isArray(outputData) && outputData.length >= 2 && outputData[0]?.url) {
                    finalDataReceived = true;
                    clearTimeout(timeoutId);
                    const audioFileUrl = outputData[0].url;
                    const transcription = outputData[1];

                    console.log('Received audio file URL from job:', audioFileUrl);
                    console.log('Received transcription from job:', transcription);

                    if (typeof audioFileUrl !== 'string' || !audioFileUrl.startsWith('http')) {
                        reject(new Error(`Invalid audio file URL received from job: ${audioFileUrl}`));
                        return;
                    }

                    audioCache[link] = {
                        audioUrl: audioFileUrl,
                        transcription: transcription || "Transcription not available.",
                        lastPosition: 0,
                        title: link
                    };

                    try {
                        await saveAudioCache(link, audioFileUrl);
                        await loadAudioFromCache(link); // This will also update UI for player
                        updateMediaSessionMetadata(link, audioCache[link].title || 'Web to Audio', 'Generated Audio');
                        resolve({ success: true, link: link, loadedFromCache: false });
                    } catch (saveError) {
                        reject(saveError);
                    }
                } else {
                    // This might be an intermediate data event if the Gradio fn is a generator
                    // Or, if it's the only data event and doesn't match, it's an issue.
                    console.log("Received intermediate or unexpected data structure from job:", outputData);
                    // We don't reject here yet, waiting for a "complete" status or a correctly structured final data.
                    // If the backend is not a generator, this 'data' event should be the final one.
                    // If it is a generator, we might get multiple 'data' events.
                    // The check for `outputData[0]?.url` is key for identifying the final data.
                }
            });

            // Handle job promise rejection (e.g., connection error before status events)
            job.catch(error => {
                console.error("Job submission/connection error:", error);
                reject(error);
            });
        });

    } catch (error) {
        console.error(`Error in fetchMp3 (submit job) for link "${link}":`, error);
        throw error;
    }
}