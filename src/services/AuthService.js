import apiClient, { refreshClient, ApiError } from "./apiClient";
import { setSession, clearSession, getRefreshToken, getUser } from "./tokenStore";

/**
 * The API speaks `Master` / `Admin` / `User`; the UI has always used
 * `master` / `admin` / `employee`. Translate at this boundary so nothing
 * downstream has to care.
 */
const API_TO_APP = { master: "master", admin: "admin", user: "employee" };
const APP_TO_API = { master: "Master", admin: "Admin", employee: "User" };

export const toAppRole = (apiRole) => API_TO_APP[String(apiRole || "").toLowerCase()] || null;
export const toApiRole = (appRole) => APP_TO_API[String(appRole || "").toLowerCase()] || "User";

/** Labels for the three API roles, used wherever a role is displayed. */
export const ROLE_OPTIONS = [
  { value: "master",   label: "Master" },
  { value: "admin",    label: "Admin" },
  { value: "employee", label: "User" },
];

/**
 * Read the claims out of a JWT without verifying it — the server remains the
 * only authority. This is a fallback for deployments whose login response
 * omits a `user` object, so the role can still be resolved.
 */
function decodeJwtClaims(token) {
  try {
    const payload = String(token).split(".")[1];
    if (!payload) return {};
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return {};
  }
}

const MS_ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
const MS_NAME_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";
const MS_ID_CLAIM   = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";

const firstOf = (...values) => values.find((v) => v !== undefined && v !== null && v !== "");

/**
 * Pull the session out of a login response.
 *
 * The deployed API declares no schema for this endpoint, so the token is
 * looked for under the documented name and the usual alternatives, and under
 * a CRUD `resultObject` in case the endpoint is wrapped. A refresh token is
 * treated as optional — the live deployment does not expose /Auth/refresh.
 */
export function normalizeLoginResponse(body, fallbackUsername, headers = {}) {
  const root = body && typeof body === "object" ? body : {};
  // Some deployments wrap auth in the standard CRUD envelope.
  const src = root.resultObject && typeof root.resultObject === "object" ? root.resultObject : root;

  // A few implementations hand the token back in a header rather than the body.
  const headerToken = firstOf(
    headers.authorization, headers.Authorization,
    headers["x-access-token"], headers["x-auth-token"]
  );

  const accessToken = firstOf(
    src.accessToken, src.access_token, src.token, src.jwt, src.jwtToken, src.bearerToken,
    root.accessToken, root.access_token, root.token,
    headerToken ? String(headerToken).replace(/^Bearer\s+/i, "") : undefined
  );
  if (!accessToken) return { accessToken: null, keys: Object.keys(root) };

  const refreshToken = firstOf(src.refreshToken, src.refresh_token, root.refreshToken) ?? null;

  const rawUser = src.user || src.userInfo || root.user || {};
  const claims = decodeJwtClaims(accessToken);

  const apiRole = firstOf(rawUser.role, claims.role, claims[MS_ROLE_CLAIM]);

  const user = {
    id: firstOf(rawUser.id, claims.nameid, claims[MS_ID_CLAIM], claims.sub) ?? null,
    username: firstOf(
      rawUser.username, claims.unique_name, claims[MS_NAME_CLAIM], claims.name, fallbackUsername
    ) ?? "",
    fullName: firstOf(rawUser.fullName, rawUser.fullname) ?? "",
    apiRole: apiRole ?? null,
    role: toAppRole(apiRole),
  };

  return { accessToken, refreshToken, user, keys: Object.keys(root) };
}

class AuthService {
  /**
   * POST /api/Auth/login. Stores the session and returns the user with an
   * app-side role.
   */
  async login(username, password) {
    const response = await apiClient.post("/Auth/login", { username, password });
    const { accessToken, refreshToken, user, keys } =
      normalizeLoginResponse(response.data, username, response.headers || {});

    if (!accessToken) {
      /* Credentials were accepted, but nothing came back that can authorise
         the protected endpoints. That is a backend gap, not a user error, so
         say so plainly and name the fields received (never their values). */
      const seen = keys.length ? ` The server returned only: ${keys.join(", ")}.` : "";
      throw new ApiError(
        `Your credentials were accepted, but the server did not issue an access token, ` +
        `so your data cannot be loaded.${seen} The backend's /api/Auth/login needs to ` +
        `return "accessToken". Please pass this to your API team.`,
        { status: 502 }
      );
    }

    setSession({ accessToken, refreshToken, user });
    return user;
  }

  /**
   * POST /api/Auth/logout — best effort, and skipped entirely when there is
   * no refresh token to revoke. The local session is cleared either way, so
   * a missing or failing endpoint cannot strand the user.
   */
  async logout() {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) await apiClient.post("/Auth/logout", { refreshToken });
    } catch {
      /* already revoked, not deployed, or unreachable */
    } finally {
      clearSession();
    }
  }

  /** POST /api/Auth/refresh. Normally driven by the 401 interceptor. */
  async refresh() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new ApiError("No refresh token available.", { status: 401 });

    const { data } = await refreshClient.post("/Auth/refresh", { refreshToken });
    setSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: getUser(),
    });
    return data;
  }

  /**
   * POST /api/Auth/seed — creates the first master user when the Users table
   * is empty. Setup only; the response carries a plaintext password, so the
   * caller must treat it as sensitive and never log it.
   */
  async seed() {
    const { data } = await apiClient.post("/Auth/seed");
    return data;
  }

  getStoredUser = getUser;
}

const authService = new AuthService();
export default authService;
