import { useState, useEffect } from "react";
import { fetchGraphQL, fetchREST } from "../services/api";

function Historial() {
  const [clientesLista, setClientesLista] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      let data;
      try {
        data = await fetchREST("/api/clientes");
      } catch {
        data = await fetchREST("/clientes");
      }
      setClientesLista(data || []);
      if (data && data.length > 0) {
        setClienteSeleccionado(data[0].documento);
        cargarHistorialPorDocumento(data[0].id);
      }
    } catch (err) {
      console.error("Error al cargar la lista de clientes:", err);
    }
  };

  const handleClienteChange = (e) => {
    const doc = e.target.value;
    setClienteSeleccionado(doc);
    const clienteObj = clientesLista.find((c) => c.documento === doc);
    if (clienteObj) {
      cargarHistorialPorDocumento(clienteObj.id);
    }
  };

  const cargarHistorialPorDocumento = async (clienteId) => {
    setLoading(true);
    setError("");
    setSuccess("");

    const query = `
      query HistorialAlquileres($clienteId: ID!) {
        historialAlquileres(clienteId: $clienteId) {
          id
          fechaInicio
          fechaFin
          cantidadDias
          importeTotal
          estado
          vehiculo {
            patente
            marca
            modelo
          }
        }
      }
    `;

    try {
      const data = await fetchGraphQL(query, { clienteId: clienteId.toString() });
      setReservas(data.historialAlquileres || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarReserva = async (reservaId) => {
    if (!window.confirm("¿Seguro que deseas cancelar esta reserva?")) return;
    setError("");
    setSuccess("");

    try {
      try {
        await fetchREST(`/reservas/${reservaId}/cancelar`, { method: "PATCH" });
      } catch {
        await fetchREST(`/api/reservas/${reservaId}/cancelar`, { method: "PATCH" });
      }

      setSuccess("Reserva cancelada correctamente.");
      const clienteObj = clientesLista.find((c) => c.documento === clienteSeleccionado);
      if (clienteObj) cargarHistorialPorDocumento(clienteObj.id);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section style={{ padding: "15px", width: "100%", boxSizing: "border-box" }}>
      <h1>Historial General de Alquileres</h1>
      <p style={{ color: "#555" }}>
        Consulta el historial de alquileres por cliente mediante GraphQL (`:8080/graphql`).
      </p>

      {error && <div style={{ color: "#721c24", backgroundColor: "#f8d7da", borderColor: "#f5c6cb", padding: "12px", borderRadius: "6px", marginBottom: "15px" }}>⚠️ {error}</div>}
      {success && <div style={{ color: "#155724", backgroundColor: "#d4edda", borderColor: "#c3e6cb", padding: "12px", borderRadius: "6px", marginBottom: "15px" }}>✅ {success}</div>}

      <div style={{ backgroundColor: "#ffffff", padding: "20px 15px", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", border: "none", marginBottom: "25px", width: "100%", boxSizing: "border-box" }}>
        <label style={{ fontWeight: "bold", fontSize: "0.9em", color: "#333", display: "block", marginBottom: "8px" }}>
          Seleccionar Cliente (por Nombre / DNI):
        </label>
        <select
          value={clienteSeleccionado}
          onChange={handleClienteChange}
          style={{ padding: "10px", width: "100%", maxWidth: "400px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "0.95em" }}
        >
          {clientesLista.map((c) => (
            <option key={c.documento} value={c.documento}>
              {c.nombre} {c.apellido} — DNI: {c.documento}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Cargando historial...</p>
      ) : (
        <div style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", minWidth: "650px", borderCollapse: "collapse", textAlign: "left", backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Vehículo</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Patente</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Inicio</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Fin</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Días</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Importe Total</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Estado</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {reservas.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: "12px", borderBottom: "1px solid #eaeaea", textAlign: "center" }}>No se encontraron reservas registradas para este cliente.</td></tr>
              ) : (
                reservas.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea", fontWeight: "bold" }}>
                      {r.vehiculo ? `${r.vehiculo.marca} ${r.vehiculo.modelo}` : "-"}
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>
                      {r.vehiculo ? r.vehiculo.patente : "-"}
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>
                      {r.fechaInicio ? r.fechaInicio.replace("T", " ").substring(0, 16) : "-"}
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>
                      {r.fechaFin ? r.fechaFin.replace("T", " ").substring(0, 16) : "-"}
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>{r.cantidadDias}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea", fontWeight: "bold" }}>${r.importeTotal}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "bold",
                          display: "inline-block",
                          color: r.estado === "CONFIRMADA" ? "#155724" : r.estado === "CANCELADA" ? "#721c24" : "#0c5460",
                          backgroundColor: r.estado === "CONFIRMADA" ? "#d4edda" : r.estado === "CANCELADA" ? "#f8d7da" : "#d1ecf1",
                        }}
                      >
                        {r.estado}
                      </span>
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea", whiteSpace: "nowrap" }}>
                      {r.estado === "CONFIRMADA" ? (
                        <button
                          onClick={() => handleCancelarReserva(r.id)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#dc3545",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          Cancelar Reserva
                        </button>
                      ) : (
                        <span style={{ color: "#999", fontSize: "0.9em" }}>Sin acciones</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default Historial;