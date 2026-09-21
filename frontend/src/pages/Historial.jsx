import { useState } from "react";
import SearchBar from "../components/SearchBar.jsx";
import "./AdminPages.css";

const API_GRAPHQL = "http://localhost:8080/graphql";

const QUERY_HISTORIAL = `
  query HistorialAlquileres($clienteId: ID!) {
    historialAlquileres(clienteId: $clienteId) {
      id
      vehiculo { patente marca modelo }
      fechaInicio fechaFin importeTotal estado cantidadDias
    }
  }
`;

const formatDate = (d) =>
  new Date(d).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

function Historial() {
  const [clienteId, setClienteId] = useState("");
  const [historial, setHistorial] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [buscado, setBuscado] = useState(false);

  async function buscar(e) {
    e.preventDefault();
    if (!clienteId) return;
    setError(""); setCargando(true); setBuscado(true);
    try {
      const r = await fetch(API_GRAPHQL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: QUERY_HISTORIAL,
          variables: { clienteId },
        }),
      });
      const datos = await r.json();
      if (datos.errors) throw new Error(datos.errors[0].message);
      setHistorial(datos.data.historialAlquileres);
    } catch (err) {
      setError(`No se pudo consultar el historial. (${err.message})`);
    } finally { setCargando(false); }
  }

  const filtrados = historial.filter((h) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return [
      h.id, h.estado,
      h.vehiculo?.patente, h.vehiculo?.marca, h.vehiculo?.modelo,
    ].some((c) => String(c ?? "").toLowerCase().includes(q));
  });

  return (
    <section className="admin-panel">
      <div className="page-heading">
        <p className="eyebrow">Consultas</p>
        <h1>Historial de reservas</h1>
        <p>Consultá las reservas canceladas y finalizadas de un cliente.</p>
      </div>

      <form onSubmit={buscar} className="form-admin">
        <div className="form-admin__campo">
          <label>ID de cliente</label>
          <input
            type="number"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            required
          />
        </div>
        <button className="button" type="submit" disabled={cargando}>
          {cargando ? "Buscando..." : "Ver historial"}
        </button>
      </form>

      {error && <p className="error-cliente">{error}</p>}

      {buscado && !error && historial.length === 0 && (
        <div className="empty-state">
          <span>◷</span>
          <h2>Sin historial</h2>
          <p>Este cliente todavía no tiene reservas canceladas ni finalizadas.</p>
        </div>
      )}

      {historial.length > 0 && (
        <>
          <SearchBar
            value={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar por reserva, vehículo o estado..."
          />

          {filtrados.length === 0 ? (
            <div className="empty-state">
              <span>⌕</span>
              <h2>Sin coincidencias</h2>
              <p>Probá con otro término de búsqueda.</p>
            </div>
          ) : (
            <div className="tabla-contenedor">
              <table className="tabla-cliente">
                <thead>
                  <tr>
                    <th>Reserva</th>
                    <th>Vehículo</th>
                    <th>Desde</th>
                    <th>Hasta</th>
                    <th>Días</th>
                    <th>Importe</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((h) => (
                    <tr key={h.id}>
                      <td>#{h.id}</td>
                      <td>
                        <strong>{h.vehiculo.marca} {h.vehiculo.modelo}</strong>
                        <small>{h.vehiculo.patente}</small>
                      </td>
                      <td>{formatDate(h.fechaInicio)}</td>
                      <td>{formatDate(h.fechaFin)}</td>
                      <td>{h.cantidadDias ?? "–"}</td>
                      <td>${h.importeTotal}</td>
                      <td>
                        <span className={`estado estado--${h.estado.toLowerCase()}`}>
                          {h.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default Historial;