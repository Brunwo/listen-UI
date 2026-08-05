/**
 * Sanitizes a string to prevent XSS attacks by escaping HTML entities.
 * @param {string} str - The string to sanitize
 * @returns {string} The sanitized string safe for HTML insertion
 */
export function sanitizeHtml(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function checkOnlineStatus() {
    if (!navigator.onLine) {
        alert('You are currently offline. Some features may be limited.');
    }
}

export function handleSharedUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedUrl = urlParams.get('url');

    if (sharedUrl) {
        console.log('Shared URL detected:', sharedUrl);
        // Basic sanitization - trim whitespace
        return sharedUrl.trim();
    }
    return null;
}
