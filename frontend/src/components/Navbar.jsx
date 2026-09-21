import { NavLink } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", gap: "10px", backgroundColor: "#1e293b", boxSizing: "border-box", width: "100%" }}>
      <div className="navbar-logo" style={{ color: "white", fontWeight: "bold", fontSize: "1.3rem" }}>Rentar</div>
      <ul className="navbar-links" style={{ display: "flex", flexWrap: "wrap", gap: "12px", listStyle: "none", margin: 0, padding: 0 }}>
        <li><NavLink to="/" end>Inicio</NavLink></li>
        <li><NavLink to="/vehiculos">Vehículos</NavLink></li>
        <li><NavLink to="/clientes">Clientes</NavLink></li>
        <li><NavLink to="/reservas">Reservas</NavLink></li>
        <li><NavLink to="/historial">Historial</NavLink></li>
      </ul>
    </nav>
  );
}

export default Navbar;