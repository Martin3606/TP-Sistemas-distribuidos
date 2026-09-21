import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

/*
 * rolesPermitidos: Roles que pueden ver esta ruta.
 * Ej: ["ADMIN"] o ["ADMIN", "CLIENTE"]
 */

function RutaProtegida({ rolesPermitidos, children }) {
  const { rol } = useAuth();

  // Sin sesion, Muestra el login
  if (!rol) return <Navigate to="/login" replace />;

  // Con sesion pero sin permiso va a su home correspondiente
  if (!rolesPermitidos.includes(rol)) {
    return <Navigate to={rol === "ADMIN" ? "/admin" : "/cliente"} replace />;
  }

  return children;
}

export default RutaProtegida;