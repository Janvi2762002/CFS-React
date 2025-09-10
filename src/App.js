import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./loginPage";
import Layout from "./layout";
import Dashboard from "./dashboard";
import Transactions from "./transactionGrid";
// import Payments from "./Payments";
// import Parties from "./Parties";
// import Users from "./Users";

function App() {
  const [userRole, setUserRole] = useState(null);

  const handleLogin = (email, password) => {
    if (email === "admin@example.com" && password === "Admin123") setUserRole("admin");
    else if (email === "employee@example.com" && password === "Emp123") setUserRole("employee");
    else alert("Invalid credentials!");
  };

  const handleLogout = () => setUserRole(null);

  return (
    <Router>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />

        {/* Protected routes */}
        <Route path="/" element={<Layout role={userRole} onLogout={handleLogout} />}>
          {userRole ? (
            <>
              <Route index element={<Dashboard />} />
              
              {/* Additional routes */}
              <Route path="transactions" element={<Transactions />} />
              {/* Example: <Route path="payments" element={<Payments />} /> */}
            </>
          ) : (
            // Redirect to login if not logged in
            <Route index element={<LoginPage onLogin={handleLogin} />} />
          )}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
