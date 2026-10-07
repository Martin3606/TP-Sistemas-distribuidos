import { useState, useEffect } from "react";
import { fetchGraphQL } from "../services/api";
import { useAuth } from "../auth/AuthContext";
import "./ClientePages.css";

const QUERY_HISTORIAL = `
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
        tipoVehiculo
      }
    }
  }
`;

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
};

function HistorialCliente() {
  const { clienteId } = useAuth();
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarHistorial();
  }, []);

  async function cargarHistorial() {
    setCargando(true);
    setError("");

    try {
      // Si el clienteId está en sesión, lo envía. El backend además restringe por el token JWT si es cliente.
      const targetId = clienteId || "1";
      const data = await fetchGraphQL(QUERY_HISTORIAL, { clienteId: targetId.toString() });
      setHistorial(data.historialAlquileres || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="cliente-panel" style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div className="page-heading" style={{ marginBottom: "1.5rem" }}>
        <div>
          <p className="eyebrow" style={{ color: "#38bdf8", fontWeight: "bold", textTransform: "uppercase", fontSize: "0.85rem" }}>
            Tus viajes anteriores
          </p>
          <h1 style={{ margin: "0.25rem 0", fontSize: "2rem", color: "#0f172a" }}>Mi Historial de Alquileres</h1>
          <p style={{ color: "#64748b" }}>Consultá el historial completo de tus reservas finalizadas y canceladas.</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: "1rem", backgroundColor: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: "8px", marginBottom: "1.5rem" }}>
          ⚠️ {error}
        </div>
      )}

      {cargando ? (
        <p style={{ color: "#64748b" }}>Cargando tu historial...</p>
      ) : historial.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
          <h2 style={{ color: "#475569", margin: "0 0 0.5rem 0" }}>Sin historial registrado</h2>
          <p style={{ color: "#64748b", margin: 0 }}>Cuando realices o me canceles reservas, aparecerán registradas en esta sección.</p>
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
              </tr>
            </thead>
            <tbody>
              {historial.map((h) => (
                <tr key={h.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px", fontWeight: "bold", color: "#0f172a" }}>
                    {h.vehiculo ? `${h.vehiculo.marca} ${h.vehiculo.modelo}` : "Vehículo"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#64748b" }}>
                    {h.vehiculo?.patente || "-"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#334155" }}>
                    {formatDate(h.fechaInicio)}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#334155" }}>
                    {formatDate(h.fechaFin)}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#334155" }}>
                    {h.cantidadDias ?? "-"}
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: "bold", color: "#0f172a" }}>
                    ${h.importeTotal}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.65rem",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        backgroundColor: h.estado === "CONFIRMADA" ? "#dcfce7" : h.estado === "CANCELADA" ? "#fee2e2" : "#e0f2fe",
                        color: h.estado === "CONFIRMADA" ? "#15803d" : h.estado === "CANCELADA" ? "#b91c1c" : "#0369a1",
                      }}
                    >
                      {h.estado}
                    </span>
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

export default HistorialCliente;
