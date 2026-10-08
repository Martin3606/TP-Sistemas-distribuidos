import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

/*
 * rolesPermitidos: Lista de roles autorizados para ver la ruta.
 * Ej: ["ADMIN"] o ["CLIENTE"] o ["ADMIN", "CLIENTE"]
 */
function RutaProtegida({ rolesPermitidos, children }) {
  const { isAuthenticated, rol } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(rol)) {
    return <Navigate to={rol === "ADMIN" ? "/vehiculos" : "/catalogo"} replace />;
  }

  return children;
}

export default RutaProtegida;