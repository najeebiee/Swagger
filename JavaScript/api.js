// JavaScript/api.js

// Call the same origin (Vercel will handle /api/*)
const API_BASE_URL = window.location.origin;

async function apiGet(path, params = {}) {
  const url = new URL(path, API_BASE_URL);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  console.log('Calling API:', url.toString());

  const response = await fetch(url.toString());
  const text = await response.text();

  if (!response.ok) {
    console.error('API response not OK:', response.status, response.statusText);
    throw new Error(`Request failed with status ${response.status}`);
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('Failed to parse JSON response:', err, 'Body was:', text);
    return {};
  }
}

window.apiGet = apiGet;
