import { useState, useEffect } from "react";
import { fetchGraphQL, fetchREST } from "../services/api";
import { useAuth } from "../auth/AuthContext";
import "./ClientePages.css";

const QUERY_MIS_RESERVAS = `
  query ConsultarReservas($filtro: FiltroReservaInput) {
    consultarReservas(filtro: $filtro) {
      id
      vehiculo {
        patente
        marca
        modelo
        tipoVehiculo
      }
      fechaInicio
      fechaFin
      importeTotal
      estado
      cantidadDias
    }
  }
`;

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
};

function MisReservas() {
  const { user, clienteId } = useAuth();

  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    cargarReservas();
  }, []);

  async function cargarReservas() {
    setCargando(true);
    setError("");
    setSuccess("");

    try {
      // El backend de GraphQL restringe automáticamente por clienteId si es rol CLIENTE
      const variables = clienteId ? { filtro: { clienteId: parseInt(clienteId, 10) } } : { filtro: {} };
      const data = await fetchGraphQL(QUERY_MIS_RESERVAS, variables);
      setReservas(data.consultarReservas || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleCancelarReserva(reservaId) {
    if (!window.confirm("¿Estás seguro de que deseas cancelar esta reserva?")) return;
    setError("");
    setSuccess("");

    try {
      try {
        await fetchREST(`/reservas/${reservaId}/cancelar`, { method: "PATCH" });
      } catch {
        await fetchREST(`/api/reservas/${reservaId}/cancelar`, { method: "PATCH" });
      }

      setSuccess("La reserva ha sido cancelada correctamente.");
      cargarReservas();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="cliente-panel" style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div className="page-heading" style={{ marginBottom: "1.5rem" }}>
        <div>
          <p className="eyebrow" style={{ color: "#38bdf8", fontWeight: "bold", textTransform: "uppercase", fontSize: "0.85rem" }}>
            Administrá tus viajes
          </p>
          <h1 style={{ margin: "0.25rem 0", fontSize: "2rem", color: "#0f172a" }}>Mis Reservas</h1>
          <p style={{ color: "#64748b" }}>Consultá tus próximas reservas registradas o cancelalas antes del inicio de tu alquiler.</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: "1rem", backgroundColor: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: "8px", marginBottom: "1.5rem" }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{ padding: "1rem", backgroundColor: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: "8px", marginBottom: "1.5rem" }}>
          ✅ {success}
        </div>
      )}

      {cargando ? (
        <p style={{ color: "#64748b" }}>Cargando tus reservas...</p>
      ) : reservas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
          <h2 style={{ color: "#475569", margin: "0 0 0.5rem 0" }}>Todavía no tenés reservas registradas</h2>
          <p style={{ color: "#64748b", margin: 0 }}>Consultá el catálogo de vehículos y creá tu primera reserva.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", minWidth: "700px", borderCollapse: "collapse", textAlign: "left", backgroundColor: "#ffffff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px 16px", color: "#475569", fontWeight: "bold" }}>Vehículo</th>
                <th style={{ padding: "12px 16px", color: "#475569", fontWeight: "bold" }}>Patente</th>
                <th style={{ padding: "12px 16px", color: "#475569", fontWeight: "bold" }}>Fecha Inicio</th>
                <th style={{ padding: "12px 16px", color: "#475569", fontWeight: "bold" }}>Fecha Fin</th>
                <th style={{ padding: "12px 16px", color: "#475569", fontWeight: "bold" }}>Días</th>
                <th style={{ padding: "12px 16px", color: "#475569", fontWeight: "bold" }}>Importe Total</th>
                <th style={{ padding: "12px 16px", color: "#475569", fontWeight: "bold" }}>Estado</th>
                <th style={{ padding: "12px 16px", color: "#475569", fontWeight: "bold" }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {reservas.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px", fontWeight: "bold", color: "#0f172a" }}>
                    {r.vehiculo ? `${r.vehiculo.marca} ${r.vehiculo.modelo}` : "Vehículo"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#64748b" }}>
                    {r.vehiculo?.patente || "-"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#334155" }}>
                    {formatDate(r.fechaInicio)}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#334155" }}>
                    {formatDate(r.fechaFin)}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#334155" }}>
                    {r.cantidadDias ?? "-"}
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: "bold", color: "#0f172a" }}>
                    ${r.importeTotal}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.65rem",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        backgroundColor: r.estado === "CONFIRMADA" ? "#dcfce7" : r.estado === "CANCELADA" ? "#fee2e2" : "#e0f2fe",
                        color: r.estado === "CONFIRMADA" ? "#15803d" : r.estado === "CANCELADA" ? "#b91c1c" : "#0369a1",
                      }}
                    >
                      {r.estado}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                    {r.estado === "CONFIRMADA" ? (
                      <button
                        onClick={() => handleCancelarReserva(r.id)}
                        style={{
                          padding: "0.4rem 0.85rem",
                          backgroundColor: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          fontWeight: "bold",
                          fontSize: "0.8rem",
                          cursor: "pointer"
                        }}
                      >
                        Cancelar Reserva
                      </button>
                    ) : (
                      <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Sin acciones</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default MisReservas;
