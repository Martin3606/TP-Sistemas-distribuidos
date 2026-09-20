import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const STORAGE_KEY = "rentar_rol";

export function AuthProvider({ children }) {
  // cuando el backend tenga /login, guardar tambien el token JWT
  const [rol, setRol] = useState(() => localStorage.getItem(STORAGE_KEY));

  useEffect(() => {
    if (rol) localStorage.setItem(STORAGE_KEY, rol);
    else localStorage.removeItem(STORAGE_KEY);
  }, [rol]);

  function loginAdmin() {
    setRol("ADMIN");
  }

  function loginCliente() {
    // TODO: id del cliente logueado
    setRol("CLIENTE");
  }

  function logout() {
    setRol(null);
  }

  return (
    <AuthContext.Provider value={{ rol, loginAdmin, loginCliente, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}