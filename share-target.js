// This function will be called when the PWA receives a share
function handleShareTarget() {
  const urlParams = new URLSearchParams(window.location.search);
  const sharedUrl = urlParams.get('url') || urlParams.get('text');

  if (sharedUrl) {
    // Redirect to the main page with the shared URL as a parameter
    window.location.href = `/index.html?url=${encodeURIComponent(sharedUrl)}`;
  } else {
    // If no URL is shared, just go to the main page
    window.location.href = '/index.html';
  }
}

// Call the function when the page loads
handleShareTarget();