import { NavLink } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-logo">Rentar</div>
      <ul className="navbar-links">
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