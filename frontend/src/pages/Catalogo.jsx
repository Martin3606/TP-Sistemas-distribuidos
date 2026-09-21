import { useState } from "react";
import "./ClientePages.css";

const API_GRAPHQL = "http://localhost:8080/graphql";

// Query real, confirmada contra backend-graphql/schema.graphqls
const QUERY_DISPONIBILIDAD = `
  query ConsultarDisponibilidad($filtro: FiltroDisponibilidadInput!) {
    consultarDisponibilidad(filtro: $filtro) {
      id
      patente
      marca
      modelo
      anio
      color
      tipoVehiculo
      precioDiario
      estado
    }
  }
`;

function Catalogo() {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [vehiculos, setVehiculos] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [buscado, setBuscado] = useState(false);

  async function buscar(evento) {
    evento.preventDefault();
    setError("");
    setCargando(true);
    setBuscado(true);

    try {
      const respuesta = await fetch(API_GRAPHQL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: QUERY_DISPONIBILIDAD,
          variables: {
            filtro: { fechaInicio, fechaFin },
          },
        }),
      });

      const datos = await respuesta.json();

      if (datos.errors) {
        throw new Error(datos.errors[0].message);
      }

      setVehiculos(datos.data.consultarDisponibilidad);
    } catch (err) {
      setError(`No se pudo consultar el catálogo. (${err.message})`);
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="cliente-panel">
      <div className="page-heading"><div><p className="eyebrow">Encontrá tu vehículo</p><h1>Catálogo de vehículos</h1><p>Elegí las fechas de tu viaje para ver opciones disponibles.</p></div></div>

      <form onSubmit={buscar} className="form-cliente form-cliente--search">
        <div className="form-cliente__campo">
          <label htmlFor="fechaInicio">Desde</label>
          <input
            id="fechaInicio"
            type="datetime-local"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            required
          />
        </div>
        <div className="form-cliente__campo">
          <label htmlFor="fechaFin">Hasta</label>
          <input
            id="fechaFin"
            type="datetime-local"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            required
          />
        </div>
        <button className="button" type="submit" disabled={cargando}>
          {cargando ? "Buscando..." : "Buscar disponibilidad"}
        </button>
      </form>

      {error && <p className="error-cliente">{error}</p>}

      {buscado && !error && vehiculos.length === 0 && (
        <div className="empty-state"><span>⌕</span><h2>Sin vehículos disponibles</h2><p>Probá con otras fechas para encontrar más alternativas.</p></div>
      )}

      <div className="catalogo__grilla">
        {vehiculos.map((v) => (
          <div key={v.id} className="catalogo__tarjeta">
            <div className="vehiculo-icon">▱</div><span className="tag">{v.tipoVehiculo}</span>
            <h2>{v.marca} {v.modelo}</h2><p className="vehiculo-meta">{v.anio} · {v.color || "Color no informado"} · {v.patente}</p>
            <div className="catalogo__precio"><small>Desde</small>${v.precioDiario} <span>/ día</span></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Catalogo;
