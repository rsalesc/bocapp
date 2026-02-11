/**
 * Updates the URL search parameters without reloading the page.
 * @param {string} key - The query parameter key.
 * @param {string} value - The query parameter value.
 */
function updateUrlState(key, value) {
  const url = new URL(window.location);
  if (value === null || value === undefined) {
    url.searchParams.delete(key);
  } else {
    url.searchParams.set(key, value);
  }
  window.history.pushState({}, '', url);
}

/**
 * Reads a value from the URL search parameters.
 * @param {string} key - The query parameter key.
 * @returns {string|null} - The value or null if not present.
 */
function getUrlState(key) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(key);
}

/**
 * Reads all URL parameters as an object.
 * @returns {Object} - Key-value pairs of URL parameters.
 */
function getAllUrlState() {
  const urlParams = new URLSearchParams(window.location.search);
  const params = {};
  for (const [key, value] of urlParams.entries()) {
    params[key] = value;
  }
  return params;
}

/**
 * Copies text to the clipboard.
 * @param {string} text - The text to copy.
 * @returns {void}
 */
function copyToClipboard(text) {
    const fallbackCopy = () => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        // Ensure it's not visible but part of DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showToast(`Copied: ${text}`, 'success');
            } else {
                showToast('Copy command failed', 'error');
            }
        } catch (err) {
            showToast('Unable to copy', 'error');
        }
        
        document.body.removeChild(textArea);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`Copied: ${text}`, 'success');
        }).catch(err => {
            console.error('Async: Could not copy text: ', err);
            fallbackCopy();
        });
    } else {
        // Fallback for non-secure contexts (HTTP)
        fallbackCopy();
    }
}

/**
 * Shows a toast notification.
 * @param {string} message - The message to display.
 * @param {string} type - 'success' or 'error' (or 'info').
 */
function showToast(message, type) {
    if (typeof Toastify !== 'undefined') {
        const bg = type === 'success' ? "linear-gradient(to right, #00b09b, #96c93d)" : "linear-gradient(to right, #ff5f6d, #ffc371)";
        Toastify({
            text: message,
            duration: 3000,
            close: true,
            gravity: "top", // `top` or `bottom`
            position: "right", // `left`, `center` or `right`
            style: {
                background: bg,
            }
        }).showToast();
    } else {
        console.log(`[${type}] ${message}`);
    }
}
