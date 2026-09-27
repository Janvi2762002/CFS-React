import axios from "axios";
import {
  getAccessToken, getRefreshToken, setTokens, clearSession,
} from "./tokenStore";

/**
 * Base URL must include the `/api` segment, e.g.
 *   REACT_APP_API_BASE_URL=https://example.runasp.net/api
 * The backend exposes no version prefix, so paths here are `/Auth/login`,
 * `/Users`, `/CardInfo`.
 */
export const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

/** Refresh runs on a bare client so it can never re-enter the interceptor. */
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

/* Called when the session can no longer be recovered. AuthContext registers
   here so it can drop the user back to the login screen. */
let onAuthFailure = () => {};
export const setAuthFailureHandler = (fn) => { onAuthFailure = fn || (() => {}); };

/** Normalised error surfaced to callers. */
export class ApiError extends Error {
  constructor(message, { status, statusCode, data } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;          // HTTP status
    this.statusCode = statusCode;  // statusCode from the CRUD wrapper
    this.data = data;
    this.isForbidden = status === 403;
    this.isUnauthorized = status === 401;
  }
}

/** Fallbacks for responses that carry no body — the API returns bare 401s. */
const STATUS_FALLBACK = {
  400: "The request was rejected. Please check the values and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "Your account does not have permission to do that.",
  404: "That record no longer exists.",
  500: "The server hit an error. Please try again.",
};

/** Auth endpoints return `{ message }`; CRUD returns `{ statusMessage }`. */
function messageFrom(error) {
  const data = error.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  const msg = data?.message || data?.statusMessage || data?.title;
  if (msg) return msg;
  if (error.code === "ECONNABORTED") return "The server took too long to respond.";
  if (!error.response) return "Cannot reach the server. Check your connection.";
  return STATUS_FALLBACK[error.response.status] || error.message || "Something went wrong.";
}

/* ── Attach the bearer token ─────────────────────────────────────────────── */
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ── Refresh once on 401, then retry the original request once ───────────── */
let refreshing = null;          // in-flight refresh, shared by concurrent 401s
let queue = [];                 // resolvers waiting on that refresh

const flushQueue = (token, error) => {
  queue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
  queue = [];
};

async function runRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");

  const { data } = await refreshClient.post("/Auth/refresh", { refreshToken });
  if (!data?.accessToken) throw new Error("Refresh returned no access token");

  // The backend rotates the refresh token, so both values must be replaced.
  setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data.accessToken;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // --- FALLBACK LOGIC ---
    // If the server is down (no response), timed out, or returns a 5xx error
    const isNetworkOrServerError = !error.response || (status >= 500 && status <= 599) || error.code === 'ECONNABORTED';
    
    if (isNetworkOrServerError && original && !original._fallbackRetried) {
      original._fallbackRetried = true; // prevent infinite loops
      original.baseURL = "https://smenterprise101.runasp.net/api"; // switch to fallback
      return apiClient(original); // automatically retry the request!
    }
    // ----------------------

    // 403 means the role is insufficient — refreshing would not help...
    // (Keep all the existing code below this)
    const recoverable =
      status === 401 &&
      original &&
      !original._retried &&
      !String(original.url || "").includes("/Auth/") &&
      Boolean(getRefreshToken());

    if (status === 401 && !getRefreshToken()) {
      clearSession();
      onAuthFailure();
    }

    if (!recoverable) {
      return Promise.reject(
        new ApiError(messageFrom(error), {
          status,
          statusCode: error.response?.data?.statusCode,
          data: error.response?.data,
        })
      );
    }

    original._retried = true;

    if (!refreshing) {
      refreshing = runRefresh()
        .then((token) => { flushQueue(token, null); return token; })
        .catch((err) => {
          flushQueue(null, err);
          clearSession();
          onAuthFailure();
          throw err;
        })
        .finally(() => { refreshing = null; });
    }

    try {
      const token = await new Promise((resolve, reject) => {
        queue.push({ resolve, reject });
        refreshing.catch(() => {}); // rejection is delivered through the queue
      });
      original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
      return apiClient(original);
    } catch {
      return Promise.reject(
        new ApiError("Your session has expired. Please sign in again.", { status: 401 })
      );
    }
  }
);

/**
 * Unwrap the standard CRUD envelope:
 *   { statusCode, statusText, statusMessage, resultObject }
 * Auth endpoints return plain objects and must not go through this.
 */
export function unwrap(response) {
  const body = response?.data;
  if (body && typeof body === "object" && "resultObject" in body) {
    const code = body.statusCode;
    // HTTP was 2xx, but the envelope can still report a failure.
    if (typeof code === "number" && code >= 400) {
      throw new ApiError(body.statusMessage || "Request failed.", {
        status: code, statusCode: code, data: body,
      });
    }
    return body.resultObject;
  }
  return body;
}

export { refreshClient };
export default apiClient;
