/**
 * Single place that knows where the session lives.
 *
 * Tokens are kept in localStorage so a refresh survives a page reload. That
 * trades XSS exposure for convenience; if the app later moves to httpOnly
 * cookies, this module is the only thing that has to change.
 *
 * Nothing here is logged — access tokens, refresh tokens and user payloads
 * must never reach the console.
 */

const ACCESS_KEY  = "au.accessToken";
const REFRESH_KEY = "au.refreshToken";
const USER_KEY    = "au.user";

const read = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};

const write = (key, value) => {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* storage unavailable (private mode, blocked) */ }
};

export const getAccessToken  = () => read(ACCESS_KEY);
export const getRefreshToken = () => read(REFRESH_KEY);

export function getUser() {
  const raw = read(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/** Store the whole session after a successful login. */
export function setSession({ accessToken, refreshToken, user }) {
  write(ACCESS_KEY, accessToken ?? null);
  write(REFRESH_KEY, refreshToken ?? null);
  write(USER_KEY, user ? JSON.stringify(user) : null);
}

/** Replace just the token pair, as returned by a refresh. */
export function setTokens({ accessToken, refreshToken }) {
  write(ACCESS_KEY, accessToken ?? null);
  write(REFRESH_KEY, refreshToken ?? null);
}

export function clearSession() {
  write(ACCESS_KEY, null);
  write(REFRESH_KEY, null);
  write(USER_KEY, null);
}

export const hasSession = () => Boolean(getAccessToken());
