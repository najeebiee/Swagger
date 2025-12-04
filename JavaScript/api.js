const API_BASE_URL = 'http://localhost:4000';

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

  console.log('Calling API:', url.toString()); // debug

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error('API response not OK:', response.status, response.statusText);
      throw new Error(`Request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error('apiGet error:', err);
    throw err;
  }
}


// Expose globally for other modules to consume.
window.apiGet = apiGet;
