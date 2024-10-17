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
        return sharedUrl;
    }
    return null;
}