import { useState, useEffect } from "react";
import { fetchGraphQL, fetchREST } from "../services/api";

function Historial() {
  const [clienteIdInput, setClienteIdInput] = useState("1");
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async (e) => {
    if (e) e.preventDefault();
    if (!clienteIdInput) {
      setError("Debes ingresar un ID de cliente para consultar.");
      return;
    }

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
      const data = await fetchGraphQL(query, { clienteId: clienteIdInput });
      setReservas(data.historialAlquileres || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarReserva = async (reservaId) => {
    if (!window.confirm(`¿Seguro que deseas cancelar la reserva ID ${reservaId}?`)) return;
    setError("");
    setSuccess("");

    try {
      try {
        await fetchREST(`/reservas/${reservaId}/cancelar`, { method: "PATCH" });
      } catch {
        await fetchREST(`/api/reservas/${reservaId}/cancelar`, { method: "PATCH" });
      }

      setSuccess(`Reserva ID ${reservaId} cancelada correctamente.`);
      cargarHistorial();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section style={{ padding: "15px", width: "100%", boxSizing: "border-box" }}>
      <h1>Historial de Alquileres y Cancelaciones</h1>
      <p style={{ color: "#666" }}>
        Consulta de historial vía <strong>GraphQL (Spring Boot :8080)</strong> y cancelación vía <strong>REST (FastAPI :8000)</strong>.
      </p>

      {error && <div style={{ color: "#721c24", backgroundColor: "#f8d7da", borderColor: "#f5c6cb", padding: "12px", borderRadius: "6px", marginBottom: "15px" }}>⚠️ {error}</div>}
      {success && <div style={{ color: "#155724", backgroundColor: "#d4edda", borderColor: "#c3e6cb", padding: "12px", borderRadius: "6px", marginBottom: "15px" }}>✅ {success}</div>}

      <form onSubmit={cargarHistorial} style={{ backgroundColor: "#ffffff", padding: "20px 15px", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", border: "none", marginBottom: "25px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", width: "100%", boxSizing: "border-box" }}>
        <label style={{ fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>ID de Cliente:</label>
        <input
          type="number"
          value={clienteIdInput}
          onChange={(e) => setClienteIdInput(e.target.value)}
          placeholder="Ej: 1"
          required
          style={{ padding: "10px", width: "140px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "0.95em" }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: "bold",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            cursor: "pointer",
          }}
        >
          Consultar Historial (GraphQL)
        </button>
      </form>

      {loading ? (
        <p>Cargando historial...</p>
      ) : (
        <div style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", minWidth: "650px", borderCollapse: "collapse", textAlign: "left", backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Reserva ID</th>
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
                <tr><td colSpan="9" style={{ padding: "12px", borderBottom: "1px solid #eaeaea", textAlign: "center" }}>No se encontraron reservas registradas para este cliente.</td></tr>
              ) : (
                reservas.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>{r.id}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>{r.vehiculo ? `${r.vehiculo.marca} ${r.vehiculo.modelo}` : "-"}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea", fontWeight: "bold" }}>{r.vehiculo ? r.vehiculo.patente : "-"}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>{r.fechaInicio}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>{r.fechaFin}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>{r.cantidadDias}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>${r.importeTotal}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          color: r.estado === "CONFIRMADA" ? "#004085" : r.estado === "CANCELADA" ? "#721c24" : "#155724",
                          backgroundColor: r.estado === "CONFIRMADA" ? "#cce5ff" : r.estado === "CANCELADA" ? "#f8d7da" : "#d4edda",
                          fontSize: "12px",
                          fontWeight: "bold",
                          display: "inline-block",
                        }}
                      >
                        {r.estado}
                      </span>
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea", whiteSpace: "nowrap" }}>
                      {r.estado === "CONFIRMADA" && (
                        <button
                          onClick={() => handleCancelarReserva(r.id)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#dc3545",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            cursor: "pointer",
                          }}
                        >
                          Cancelar
                        </button>
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