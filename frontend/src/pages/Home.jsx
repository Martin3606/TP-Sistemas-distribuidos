import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import "./ClientePages.css";
import "./AdminPages.css";

function Home() {
  const { rol } = useAuth();

  if (rol === "CLIENTE") {
    return (
      <section className="cliente-panel">
        <div className="cliente-hero"><div><p className="eyebrow">Área de cliente</p><h1>Tu próximo viaje empieza acá.</h1><p>Consultá disponibilidad, administrá tus reservas y mantené tus datos actualizados.</p></div><Link className="button button--light" to="/cliente/catalogo">Buscar un vehículo</Link></div>
        <div className="accesos-rapidos">
          <Link to="/cliente/catalogo" className="acceso-rapido"><span>⌕</span><strong>Catálogo</strong><small>Encontrá un vehículo disponible.</small></Link>
          <Link to="/cliente/mis-reservas" className="acceso-rapido"><span>▣</span><strong>Mis reservas</strong><small>Creá o cancelá una reserva.</small></Link>
          <Link to="/cliente/historial" className="acceso-rapido"><span>◷</span><strong>Historial</strong><small>Revisá tus alquileres anteriores.</small></Link>
          <Link to="/cliente/perfil" className="acceso-rapido"><span>◉</span><strong>Mi perfil</strong><small>Gestioná tus datos personales.</small></Link>
        </div>
      </section>
    );
  }

 return (
  <section className="admin-panel">
    <div className="admin-hero">
      <div>
        <p className="eyebrow">Área de administrador</p>
        <h1>Panel de control Rentar</h1>
        <p>Gestioná vehículos, clientes, reservas y consultá el historial del sistema.</p>
      </div>
      <Link className="button button--light" to="/admin/clientes">Ir a clientes</Link>
    </div>

    <div className="accesos-rapidos">
      <Link to="/admin/vehiculos" className="acceso-rapido">
        <span>▱</span><strong>Vehículos</strong>
        <small>Consultá la flota disponible.</small>
      </Link>
      <Link to="/admin/clientes" className="acceso-rapido">
        <span>◉</span><strong>Clientes</strong>
        <small>Alta, baja y modificación.</small>
      </Link>
      <Link to="/admin/reservas" className="acceso-rapido">
        <span>▣</span><strong>Reservas</strong>
        <small>Creá y cancelá reservas.</small>
      </Link>
      <Link to="/admin/historial" className="acceso-rapido">
        <span>◷</span><strong>Historial</strong>
        <small>Consultá por cliente.</small>
      </Link>
    </div>
  </section>
);
}

export default Home;
