# Web to Podcast PWA

Convert web articles into podcast episodes for offline playback. This PWA uses a Hugging Face Gradio backend for audio generation.

## Features

*   Web to Audio via Share Target
*   Installable PWA with Offline Playback
*   Configurable API Key & Backend URL
*   Playback History & Management
*   Progress Updates for Long Audio Generation Jobs
*   Modern Dark Theme UI

---

## Functional Guide

### 1. Installation (PWA)

*   **Desktop (Chrome, Edge):** Navigate to the app URL, look for an "Install" icon in the address bar or browser menu.
*   **Mobile (Android - Chrome, iOS - Safari):** Navigate to the app URL. Use "Add to Home Screen" option from browser menu (Android) or Share icon (iOS).

### 2. Generating a Podcast

*   **Using the Share Feature:**
    1.  Open a webpage in your browser/app.
    2.  Use the "Share" functionality.
    3.  Select "Web listener" (or "WebPodcast").
    4.  The app will open and start processing the URL.

### 3. Playback

*   Audio loads in the player post-processing.
*   Play button and transcription appear.
*   Access generated podcasts via the "History" section.

### 4. Offline Playback

*   Generated podcasts are cached for offline access through the history.
*   New podcast generation requires an internet connection.

### 5. Settings

1.  Click "Settings".
2.  Configure:
    *   **OpenAI API Key:** For backend services.
    *   **API Server:** Hugging Face Space URL (e.g., `User/SpaceName`).
3.  Click "Save". Settings are stored locally.

### 6. Managing History

*   **Play:** Play item from history.
*   **Remove:** Delete specific podcast and its cache.
*   **Clear History:** Remove all podcasts and cache.

### Troubleshooting

*   **Audio Generation Issues:** Check internet, API Key/Server URL in Settings, backend status.
*   **PWA Installation Fails:** Use modern PWA-supporting browser. Check browser settings.
*   **Share Target Problems:** Ensure URL is valid and public.

---

## Technical Documentation

### Project Structure

*   `index.html`: Main HTML file for the PWA.
*   `styles.css`: Contains all styling for the application, following a dark theme.
*   `script.js`: Main application orchestrator. Handles DOMContentLoaded, initializes UI, sets up event listeners, and coordinates interactions between modules.
*   `public/`: Contains static assets like icons and the `manifest.json`.
    *   `manifest.json`: PWA manifest file.
    *   `share-target.html`, `share-target.js`: Handle the PWA share target mechanism, redirecting to `index.html` with URL parameters.
    *   `offline.html`: Page displayed by the service worker when offline and a cached resource isn't found.
*   `service-worker.js`: Manages PWA caching for offline functionality.
*   `src/`: Contains the core JavaScript modules.
    *   `api.js`: Handles communication with the Hugging Face Gradio backend.
    *   `audioCache.js`: Manages caching of audio metadata and files.
    *   `audioPlayer.js`: Controls audio playback and media session handlers.
    *   `ui.js`: Responsible for all direct DOM manipulations and UI updates.
    *   `utils.js`: Utility functions (e.g., `handleSharedUrl`).
*   `vite.config.js`: Vite build configuration.
*   `playwright.config.js`: Configuration for Playwright E2E tests.
*   `e2e/`: Contains Playwright end-to-end tests.
*   `.github/workflows/vite_npm_gh_pages.yml`: GitHub Actions workflow for CI and deployment.

### Build Process

*   Uses [Vite](https://vitejs.dev/).
*   Dev: `npm run dev`
*   Build: `npm run build` (outputs to `dist/`)
    *   `vite.config.js` handles dynamic `base` path for deployments (GitHub Pages vs. local).
    *   `__APP_BASE__` global constant defined for client-side base path awareness.
*   Preview: `npm run serve` (serves `dist/`)

### Deployment

*   Automated to GitHub Pages via GitHub Actions (`.github/workflows/vite_npm_gh_pages.yml`).
*   Triggered on `main` branch pushes.
*   Workflow: Setup Node -> Build -> Run Unit & E2E Tests -> Deploy `dist/` to GitHub Pages.

### Hugging Face Integration (`src/api.js`)

*   Uses `@gradio/client` library.
*   `fetchMp3` in `src/api.js` connects to the API server (Gradio Space).
*   Uses `client.submit("/generate_audio", payload)` for job submission.
    *   `job.on("status", callback)` for progress updates.
    *   `job.on("data", callback)` for final audio URL and transcription.
*   API server URL and OpenAI API key are configurable in app settings.

### Caching Mechanism (`src/audioCache.js`)

1.  **Metadata Cache (`localStorage`):** Stores `audioCache` object (keyed by content URL) with `audioUrl`, `transcription`, `lastPosition`, `title`. `currentTrack` also stored.
2.  **Audio File Cache (Cache API):** Actual audio files stored in `'audio-cache'`. `saveAudioCache` adds files; `loadAudioFromCache` retrieves them.

### Testing

*   **Unit Tests (Vitest):**
    *   Run: `npm run test` (watch) or `npm run test:unit` (single run for CI).
*   **End-to-End Tests (Playwright):**
    *   In `e2e/`. Config: `playwright.config.js`.
    *   `webServer` in config starts `vite preview` for tests.
    *   Run: `npm run test:e2e`.
    *   CI runs tests across Chromium, Firefox, WebKit.
    *   `share-target.spec.js` mocks Gradio API for reliable testing.

---
An AI assistant contributed to the development and documentation of this project.