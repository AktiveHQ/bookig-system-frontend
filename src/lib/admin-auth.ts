const TOKEN_KEY = 'admin_token';
const EXPIRES_AT_KEY = 'admin_token_expires_at';

export function getAdminToken(): string | null {
  try {
    const expiresAt = localStorage.getItem(EXPIRES_AT_KEY);
    if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
      clearAdminToken();
      return null;
    }
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string, expiresAt?: string | null) {
  localStorage.setItem(TOKEN_KEY, token);
  if (expiresAt) {
    localStorage.setItem(EXPIRES_AT_KEY, expiresAt);
  } else {
    localStorage.removeItem(EXPIRES_AT_KEY);
  }
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
}

export function getAdminAuthHeaderOrThrow(): Record<string, string> {
  const token = getAdminToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  return { Authorization: `Bearer ${token}` };
}
