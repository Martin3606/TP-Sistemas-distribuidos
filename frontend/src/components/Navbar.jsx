import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

function Navbar() {
  const { isAuthenticated, user, rol, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav
      className="navbar"
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.85rem 1.75rem",
        gap: "12px",
        backgroundColor: "#0f172a",
        borderBottom: "1px solid #1e293b",
        boxSizing: "border-box",
        width: "100%",
        color: "white"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <NavLink to="/" style={{ color: "#38bdf8", fontWeight: "bold", fontSize: "1.4rem", textDecoration: "none" }}>
          Rentar
        </NavLink>
        {isAuthenticated && (
          <span
            style={{
              fontSize: "0.75rem",
              padding: "0.2rem 0.55rem",
              borderRadius: "12px",
              fontWeight: "600",
              backgroundColor: rol === "ADMIN" ? "#ef4444" : "#10b981",
              color: "white"
            }}
          >
            {rol === "ADMIN" ? "ADMINISTRADOR" : "CLIENTE"}
          </span>
        )}
      </div>

      <ul
        className="navbar-links"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "16px",
          listStyle: "none",
          margin: 0,
          padding: 0
        }}
      >
        {isAuthenticated && rol === "ADMIN" && (
          <>
            <li><NavLink to="/vehiculos">Vehículos (ABM)</NavLink></li>
            <li><NavLink to="/clientes">Clientes (ABM)</NavLink></li>
            <li><NavLink to="/reservas">Todas las Reservas</NavLink></li>
          </>
        )}

        {isAuthenticated && rol === "CLIENTE" && (
          <>
            <li><NavLink to="/catalogo">Catálogo y Reservas</NavLink></li>
            <li><NavLink to="/mis-reservas">Mis Reservas</NavLink></li>
            <li><NavLink to="/historial-cliente">Mi Historial</NavLink></li>
          </>
        )}

        {isAuthenticated ? (
          <li style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "8px" }}>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
              {user?.nombre || user?.email}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: "0.4rem 0.85rem",
                borderRadius: "6px",
                border: "1px solid #475569",
                backgroundColor: "#1e293b",
                color: "#f87171",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: "600"
              }}
            >
              Cerrar sesión
            </button>
          </li>
        ) : (
          <li>
            <NavLink to="/login" style={{ textDecoration: "none", color: "#38bdf8", fontWeight: "bold" }}>
              Iniciar sesión
            </NavLink>
          </li>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;