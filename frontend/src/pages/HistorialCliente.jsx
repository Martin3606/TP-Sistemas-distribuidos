import { useState } from "react";
import "./ClientePages.css";

const API_GRAPHQL = "http://localhost:8080/graphql";

// TODO (equipo): este query es PROVISORIO. Confirmarlo con quien implemente
// la consulta de historial en el backend GraphQL (nombre exacto, argumentos
// y campos) y ajustar acá si cambia algo.
const QUERY_HISTORIAL = `
  query HistorialAlquileres($clienteId: ID!) {
    historialAlquileres(clienteId: $clienteId) {
      id
      vehiculoId
      fechaInicio
      fechaFin
      importeTotal
      estado
    }
  }
`;

function HistorialCliente() {
  // TODO (equipo): cuando el login real devuelva el id del cliente logueado,
  // sacar este input y leer el id desde el AuthContext en vez de pedirlo acá.
  const [clienteId, setClienteId] = useState("");
  const [historial, setHistorial] = useState([]);
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
          query: QUERY_HISTORIAL,
          variables: { clienteId },
        }),
      });

      const datos = await respuesta.json();

      if (datos.errors) {
        throw new Error(datos.errors[0].message);
      }

      setHistorial(datos.data.historialAlquileres);
    } catch (err) {
      setError(
        "No se pudo consultar el historial. ¿Ya está lista la query de " +
          `historial en el backend GraphQL? (${err.message})`
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <section>
      <h1>Historial de Alquileres</h1>

      <form onSubmit={buscar} className="form-cliente">
        <div className="form-cliente__campo">
          <label htmlFor="clienteId">Cliente ID</label>
          <input
            id="clienteId"
            type="number"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={cargando}>
          {cargando ? "Buscando..." : "Ver historial"}
        </button>
      </form>

      {error && <p className="error-cliente">{error}</p>}

      {buscado && !error && historial.length === 0 && (
        <p>No tenés alquileres registrados.</p>
      )}

      {historial.length > 0 && (
        <table className="tabla-cliente">
          <thead>
            <tr>
              <th>ID</th>
              <th>Vehículo</th>
              <th>Desde</th>
              <th>Hasta</th>
              <th>Importe</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {historial.map((h) => (
              <tr key={h.id}>
                <td>{h.id}</td>
                <td>{h.vehiculoId}</td>
                <td>{new Date(h.fechaInicio).toLocaleString()}</td>
                <td>{new Date(h.fechaFin).toLocaleString()}</td>
                <td>${h.importeTotal}</td>
                <td>{h.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default HistorialCliente;
