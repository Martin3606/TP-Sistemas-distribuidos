import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";


function Navbar() {
  const { rol, logout } = useAuth();
  const navigate = useNavigate();

  function cerrarSesion() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <div className="navbar-logo">Rentar</div>

      <ul className="navbar-links">
        {rol === "ADMIN" && (
          <>
            <li><NavLink to="/admin" end>Inicio</NavLink></li>
            <li><NavLink to="/admin/vehiculos">Vehículos</NavLink></li>
            <li><NavLink to="/admin/clientes">Clientes</NavLink></li>
            <li><NavLink to="/admin/reservas">Reservas</NavLink></li>
            <li><NavLink to="/admin/historial">Historial</NavLink></li>
          </>
        )}

        {rol === "CLIENTE" && (
          <>
            <li><NavLink to="/cliente" end>Inicio</NavLink></li>
            <li><NavLink to="/cliente/catalogo">Catálogo</NavLink></li>
            <li><NavLink to="/cliente/mis-reservas">Mis reservas</NavLink></li>
            <li><NavLink to="/cliente/historial">Historial</NavLink></li>
            <li><NavLink to="/cliente/perfil">Mi perfil</NavLink></li>
          </>
        )}
      </ul>

      {rol && (
        <div className="navbar-user">
          <span className="navbar-rol">{rol === "ADMIN" ? "Admin" : "Cliente"}</span>
          <button className="btn-logout" onClick={cerrarSesion}>Salir</button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;