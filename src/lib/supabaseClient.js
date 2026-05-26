const configuredUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fgtjzegcihspilzuzsbu.supabase.co';
const configuredAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJmZ3RqemVnY2loc3BpbHp1enNidSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc5ODIwMjkxLCJleHAiOjIwOTUzOTYyOTF9.40_r6qkNKrSNg7w9w2A35u17E619pe4I4QvLwjO-dmg';

export const SUPABASE_URL = configuredUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
export const SUPABASE_REST_URL = `${SUPABASE_URL}/rest/v1`;
export const SUPABASE_AUTH_URL = `${SUPABASE_URL}/auth/v1`;
export const SUPABASE_ANON_KEY = configuredAnonKey;

const SESSION_KEY = 'garage-lab:supabase-session';

export function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function writeSession(session) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function authHeaders(session = readSession()) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`
  };
}

async function authRequest(path, options = {}) {
  const response = await fetch(`${SUPABASE_AUTH_URL}${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error_description || payload.msg || payload.message || 'Authentication failed');
  return payload;
}

export const authApi = {
  session: readSession,
  async login(email, password) {
    const session = await authRequest('/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    writeSession(session);
    return session;
  },
  async refresh() {
    const current = readSession();
    if (!current?.refresh_token) return null;
    const session = await authRequest('/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: current.refresh_token })
    });
    writeSession(session);
    return session;
  },
  async logout() {
    const current = readSession();
    if (current?.access_token) {
      await fetch(`${SUPABASE_AUTH_URL}/logout`, {
        method: 'POST',
        headers: {
          ...authHeaders(current),
          'Content-Type': 'application/json'
        }
      }).catch(() => {});
    }
    writeSession(null);
  }
};
