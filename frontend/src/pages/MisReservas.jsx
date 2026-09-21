import { useState } from "react";
import "./ClientePages.css";

const API_REST = "http://localhost:8000";
const API_GRAPHQL = "http://localhost:8080/graphql";

// TODO (equipo): este query es PROVISORIO. Confirmarlo con quien implemente
// la consulta de reservas del cliente en el backend GraphQL (nombre exacto,
// argumentos y campos) y ajustar acá si cambia algo.
const QUERY_MIS_RESERVAS = `
  query ReservasPorCliente($clienteId: ID!) {
    reservasPorCliente(clienteId: $clienteId) {
      id
      vehiculoId
      fechaInicio
      fechaFin
      importeTotal
      estado
    }
  }
`;

function MisReservas() {
  // TODO (equipo): cuando el login real devuelva el id del cliente logueado,
  // sacar este input y leer el id desde el AuthContext en vez de pedirlo acá.
  const [clienteId, setClienteId] = useState("");
  const [vehiculoId, setVehiculoId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [reservas, setReservas] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [buscado, setBuscado] = useState(false);

  // Trae las reservas del cliente vía GraphQL (consulta reservas)
  async function buscarMisReservas() {
    if (!clienteId) return;

    setError("");
    setCargando(true);
    setBuscado(true);

    try {
      const respuesta = await fetch(API_GRAPHQL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: QUERY_MIS_RESERVAS,
          variables: { clienteId },
        }),
      });

      const datos = await respuesta.json();

      if (datos.errors) {
        throw new Error(datos.errors[0].message);
      }

      setReservas(datos.data.reservasPorCliente);
    } catch (err) {
      setError(
        "No se pudo consultar tus reservas. ¿Ya está lista la query en " +
          `el backend GraphQL? (${err.message})`
      );
    } finally {
      setCargando(false);
    }
  }

  // Alta de reserva: POST /reservas (backend REST, ya funcionando)
  async function handleSubmit(evento) {
    evento.preventDefault();
    setError("");
    setCargando(true);

    try {
      const respuesta = await fetch(`${API_REST}/reservas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: Number(clienteId),
          vehiculo_id: Number(vehiculoId),
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.detail || "No se pudo crear la reserva");
      }

      // La agregamos a la lista local (además de buscarMisReservas,
      // por si la query de GraphQL todavía no está lista)
      setReservas((anteriores) => [
        ...anteriores,
        {
          id: datos.id,
          vehiculoId: datos.vehiculo_id,
          fechaInicio: datos.fecha_inicio,
          fechaFin: datos.fecha_fin,
          importeTotal: datos.importe_total,
          estado: datos.estado,
        },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  // Cancelación: PATCH /reservas/{id}/cancelar (backend REST, ya funcionando)
  async function cancelarReserva(id) {
    setError("");

    try {
      const respuesta = await fetch(`${API_REST}/reservas/${id}/cancelar`, {
        method: "PATCH",
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.detail || "No se pudo cancelar la reserva");
      }

      setReservas((anteriores) =>
        anteriores.map((r) => (r.id === id ? { ...r, estado: datos.estado } : r))
      );
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <h1>Mis Reservas</h1>

      <div className="form-cliente">
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
        <button type="button" onClick={buscarMisReservas} disabled={cargando}>
          {cargando ? "Buscando..." : "Ver mis reservas"}
        </button>
      </div>

      <h2>Nueva reserva</h2>
      <form onSubmit={handleSubmit} className="form-cliente">
        <div className="form-cliente__campo">
          <label htmlFor="vehiculoId">Vehículo ID</label>
          <input
            id="vehiculoId"
            type="number"
            value={vehiculoId}
            onChange={(e) => setVehiculoId(e.target.value)}
            required
          />
        </div>
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
        <button type="submit" disabled={cargando || !clienteId}>
          {cargando ? "Reservando..." : "Reservar"}
        </button>
      </form>

      {error && <p className="error-cliente">{error}</p>}

      {buscado && !error && reservas.length === 0 && (
        <p>No tenés reservas registradas.</p>
      )}

      {reservas.length > 0 && (
        <table className="tabla-cliente">
          <thead>
            <tr>
              <th>ID</th>
              <th>Vehículo</th>
              <th>Desde</th>
              <th>Hasta</th>
              <th>Importe</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reservas.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.vehiculoId}</td>
                <td>{new Date(r.fechaInicio).toLocaleString()}</td>
                <td>{new Date(r.fechaFin).toLocaleString()}</td>
                <td>${r.importeTotal}</td>
                <td>{r.estado}</td>
                <td>
                  {r.estado === "CONFIRMADA" && (
                    <button onClick={() => cancelarReserva(r.id)}>
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default MisReservas;
