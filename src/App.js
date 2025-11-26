import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./common/AuthContext";
import LoginPage from "./pages/LoginPage";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Parties from "./pages/Parties";
import AccessDenied from "./pages/AccessDenied";
import Payments from "./pages/Payments";

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

function AppRoutes() {
  const { userRole, handleLogin, handleLogout, loading } = useAuth();

  if (loading) return <div>Loading...</div>; 

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
      <Route path="/access-denied" element={<AccessDenied />} />

      {userRole === "admin" || userRole === "employee" || userRole === "master" ? (
        <Route element={<MainLayout role={userRole} onLogout={handleLogout} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          {userRole === "admin" && <Route path="/parties" element={<Parties />} />}
          {userRole === "master" && <Route path="/payments" element={<Payments />} /> }
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}

export default App;
