import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import ThemeModeProvider from "./theme/ThemeModeProvider";
import BackdropBlur from "./theme/BackdropBlur";
import { AuthProvider, useAuth } from "./common/AuthContext";
import LoginPage from "./pages/LoginPage";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import CardSwipes from "./pages/CardSwipes";
import CardPayments from "./pages/CardPayments";
import Users from "./pages/Users";
import AccessDenied from "./pages/AccessDenied";
import Restricted from "./pages/Restricted";
import StockItems from "./pages/StockItems";
import StockPayments from "./pages/StockPayments";
import CashLedger from "./pages/CashLedger";

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

          {/* Card Management pages */}
          <Route path="/transactions" element={<CardSwipes />} />
          <Route path="/payments"     element={<CardPayments />} />

          {/* Admin + Master: Cash & Stock Management */}
          {(userRole === "master" || userRole === "admin") && (
            <>
              <Route path="/stock-items"   element={<StockItems />} />
              <Route path="/stock-payments" element={<StockPayments />} />
              <Route path="/cash-ledger"   element={<CashLedger />} />
            </>
          )}

          {/* Master only: User Management (previously /parties) */}
          {userRole === "master" && (
            <>
              <Route path="/users"   element={<Users />} />
              {/* Keep /parties alive to avoid hard 404s from old bookmarks */}
              <Route path="/parties" element={<Navigate to="/users" replace />} />
            </>
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
      {/* Blurs the page behind dialogs, confirm prompts and the mobile
          drawer. Belongs in theme.js — see the note in BackdropBlur.jsx. */}
      <BackdropBlur>
        <Router>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </Router>
      </BackdropBlur>
    </ThemeModeProvider>
  );
}
