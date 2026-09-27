import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import ThemeModeProvider from "./theme/ThemeModeProvider";
import { AuthProvider, useAuth } from "./common/AuthContext";
import LoginPage from "./pages/LoginPage";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Payments from "./pages/Payments";
import Parties from "./pages/Parties";
import AccessDenied from "./pages/AccessDenied";
import Restricted from "./pages/Restricted";

function AppRoutes() {
  const { userRole, handleLogin, handleLogout, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  const isLoggedIn = userRole === "admin" || userRole === "employee" || userRole === "master";
  const isMaster   = userRole === "master";

  /* Only the Master sees the analytics dashboard; everyone else starts on
     the swipe register. Used for post-login and catch-all redirects. */
  const landingPath = isMaster ? "/dashboard" : "/transactions";

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isLoggedIn
            ? <Navigate to={landingPath} replace />
            : <LoginPage onLogin={handleLogin} />
        }
      />
      <Route path="/access-denied" element={<AccessDenied />} />

      {isLoggedIn ? (
        <Route element={<MainLayout role={userRole} onLogout={handleLogout} />}>
          {/* Visible to every role; only the Master sees the real thing. */}
          <Route
            path="/dashboard"
            element={isMaster ? <Dashboard /> : <Restricted page="The analytics dashboard" />}
          />

          <Route path="/transactions" element={<Transactions />} />

          {/* Admin + Master: Cash Management */}
          {(userRole === "master" || userRole === "admin") && (
            <Route path="/payments" element={<Payments />} />
          )}

          {/* Master only: User Management */}
          {userRole === "master" && (
            <Route path="/parties" element={<Parties />} />
          )}

          {/* Catch-all → role's landing page */}
          <Route path="*" element={<Navigate to={landingPath} replace />} />
          <Route path="/"  element={<Navigate to={landingPath} replace />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeModeProvider>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ThemeModeProvider>
  );
}
