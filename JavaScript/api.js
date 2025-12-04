const API_BASE_URL = 'https://gmin.onegrindersguild.com';

/**
 * Perform a GET request against the Swagger backend.
 * @param {string} path - Endpoint path (e.g. "/api.get.sales.php").
 * @param {Record<string, string | number | undefined>} params - Query parameters to append.
 * @returns {Promise<any>} Parsed JSON response.
 */
async function apiGet(path, params = {}) {
  const url = new URL(path, API_BASE_URL);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

// Expose globally for other modules to consume.
window.apiGet = apiGet;
