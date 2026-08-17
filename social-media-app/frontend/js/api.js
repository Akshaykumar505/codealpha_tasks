// Backend server ka base URL
// Local development me localhost use hoga, deploy hone ke baad ye URL badal denge
const API_BASE = 'https://social-media-app-g04p.onrender.com/api';
/**
 * Common function jo har API call ke liye use hoga.
 * Automatically token attach karta hai agar user logged in hai.
 */
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    ...options.headers,
  };

  // Agar body FormData nahi hai, toh JSON content-type set karo
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

// Helper functions har HTTP method ke liye
const api = {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  post: (endpoint, body) =>
    apiRequest(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: (endpoint, body) =>
    apiRequest(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
};
