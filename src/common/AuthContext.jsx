import React, { createContext, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true); // 👈 new
  const navigate = useNavigate();

  // ✅ Load saved role once on app start
  useEffect(() => {
    const savedRole = localStorage.getItem("userRole");
    if (savedRole) setUserRole(savedRole);
    setLoading(false); // ✅ finish loading
  }, []);

  useEffect(() => {
    if (userRole) localStorage.setItem("userRole", userRole);
    else localStorage.removeItem("userRole");
  }, [userRole]);

  const handleLogin = (email, password) => {
    if (email === "admin@example.com" && password === "Admin123") {
      setUserRole("admin");
      navigate("/dashboard");
    } else if (email === "employee@example.com" && password === "Emp123") {
      setUserRole("employee");
      navigate("/dashboard");
    } else {
      setUserRole("unauthorized");
      navigate("/access-denied");
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ userRole, handleLogin, handleLogout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
