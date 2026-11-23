const API_URL = '/api';

export async function api(path, options = {}) {
  const csrf = getCookie('mindspace_csrf');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (csrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET')) {
    headers['X-CSRF-Token'] = csrf;
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  });
  const payload = await response.json().catch(() => ({ success: false, error: { code: 'INVALID_RESPONSE', message: 'The server returned an unreadable response.' } }));
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'Request failed.');
    error.code = payload.error?.code;
    throw error;
  }
  return payload.data;
}

export function getCookie(name) {
  return document.cookie.split('; ').find(row => row.startsWith(`${name}=`))?.split('=')[1];
}

export async function ensureCsrf() {
  await api('/auth/csrf');
}
