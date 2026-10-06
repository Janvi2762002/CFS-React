import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AuthService from "../services/AuthService";
import { setAuthFailureHandler } from "../services/apiClient";
import { getUser, hasSession, clearSession } from "../services/tokenStore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /* Restore the session on boot. The stored access token may already be
     expired — the first protected call will refresh it, or drop us here via
     the auth-failure handler below. */
  useEffect(() => {
    const stored = getUser();
    if (hasSession() && stored?.role) {
      setUser(stored);
      setUserRole(stored.role);
    }
    setLoading(false);
  }, []);

  /* The API client calls this when a refresh fails and the session is gone. */
  useEffect(() => {
    setAuthFailureHandler(() => {
      setUser(null);
      setUserRole(null);
      navigate("/login", { replace: true });
    });
    return () => setAuthFailureHandler(null);
  }, [navigate]);

  /**
   * Returns { ok } or { ok: false, message } so the login form can show the
   * server's own wording rather than guessing.
   */
  const handleLogin = useCallback(async (username, password) => {
    try {
      const signedIn = await AuthService.login(username, password);

      if (!signedIn.role) {
        // Authenticated, but the role is not one this app understands.
        clearSession();
        return { ok: false, message: `Unsupported account role: ${signedIn.apiRole ?? "unknown"}.` };
      }

      setUser(signedIn);
      setUserRole(signedIn.role);
      navigate(signedIn.role === "master" ? "/dashboard" : "/swipes", { replace: true });
      return { ok: true };
    } catch (error) {
      const message =
        error?.status === 401
          ? "Invalid username or password."
          : error?.message || "Unable to sign in right now.";
      return { ok: false, message };
    }
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    await AuthService.logout();
    setUser(null);
    setUserRole(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, userRole, handleLogin, handleLogout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
