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
