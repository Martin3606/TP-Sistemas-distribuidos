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
    <section>
      <h1>Catálogo de Vehículos</h1>

      <form onSubmit={buscar} className="form-cliente">
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
        <button type="submit" disabled={cargando}>
          {cargando ? "Buscando..." : "Buscar disponibilidad"}
        </button>
      </form>

      {error && <p className="error-cliente">{error}</p>}

      {buscado && !error && vehiculos.length === 0 && (
        <p>No hay vehículos disponibles en ese período.</p>
      )}

      <div className="catalogo__grilla">
        {vehiculos.map((v) => (
          <div key={v.id} className="catalogo__tarjeta">
            <h3>
              {v.marca} {v.modelo}
            </h3>
            <p>
              {v.anio} · {v.tipoVehiculo}
            </p>
            <p className="catalogo__precio">${v.precioDiario} / día</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Catalogo;
