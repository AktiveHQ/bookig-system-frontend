export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).trim().replace(/\/$/, '');

export const SERVER_CHECK_TIMEOUT_MS = 4_000;
export const LOGIN_REQUEST_TIMEOUT_MS = 10_000;

export class ServerTimeoutError extends Error {
  constructor(message = 'The server did not respond in time. This looks like a server connection issue, not just a slow network.') {
    super(message);
    this.name = 'ServerTimeoutError';
  }
}

export class ServerUnavailableError extends Error {
  constructor(message = 'The server could not be reached. Please confirm the backend is running and VITE_API_BASE_URL is correct.') {
    super(message);
    this.name = 'ServerUnavailableError';
  }
}

export function isServerConnectivityError(error: unknown) {
  return error instanceof ServerTimeoutError || error instanceof ServerUnavailableError;
}

export function getErrorCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : undefined;
}

export function getErrorMessage(error: unknown, fallback = 'Please try again.') {
  return typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message)
    : fallback;
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = LOGIN_REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ServerTimeoutError();
    }
    throw new ServerUnavailableError();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function checkServerReachable(timeoutMs = SERVER_CHECK_TIMEOUT_MS) {
  const response = await fetchWithTimeout(`${API_BASE}/health`, {
    cache: 'no-store',
  }, timeoutMs);

  if (!response.ok) {
    throw new ServerUnavailableError(`Server health check failed with status ${response.status}.`);
  }
}
