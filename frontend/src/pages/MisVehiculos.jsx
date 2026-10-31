import { useState, useEffect } from "react";
import { listarMisVehiculosExternos } from "../services/api";
import { useNavigate } from "react-router-dom";
import "./ClientePages.css"; // Aseguramos que tome los mismos estilos globales

function MisVehiculos() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const cargarSolicitudes = async () => {
    try {
      const data = await listarMisVehiculosExternos();
      setSolicitudes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const limpiarEnum = (valor) => {
    if (!valor || valor.includes('UNSPECIFIED')) return '-';
    return valor.replace('EXTERNAL_VEHICLE_REQUEST_STATUS_', '')
                .replace('EXTERNAL_VEHICLE_VALIDATION_RESULT_', '');
  };

  // Función auxiliar para mantener la coherencia visual de los "badges" o píldoras de estado
  const getBadgeStyle = (estadoLimpio) => {
    const estado = estadoLimpio.toUpperCase();
    if (estado === "INCORPORADO" || estado === "VALIDADO") {
      return { backgroundColor: "#dcfce7", color: "#15803d" }; // Verde
    }
    if (estado === "RECHAZADO" || estado === "ROBADO") {
      return { backgroundColor: "#fee2e2", color: "#b91c1c" }; // Rojo
    }
    return { backgroundColor: "#e0f2fe", color: "#0369a1" }; // Azul para PENDIENTE u otros
  };

  return (
    <section className="cliente-panel" style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div className="page-heading" style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p className="eyebrow" style={{ color: "#38bdf8", fontWeight: "bold", textTransform: "uppercase", fontSize: "0.85rem" }}>
            Asociá tu flota
          </p>
          <h1 style={{ margin: "0.25rem 0", fontSize: "2rem", color: "#0f172a" }}>Mis Vehículos</h1>
          <p style={{ color: "#64748b" }}>Consultá el estado de verificación de los vehículos que solicitaste dar de alta en Rentar.</p>
        </div>
        <button 
          onClick={() => navigate("/registrar-vehiculo")} 
          style={{
            padding: "0.65rem 1.25rem",
            backgroundColor: "#0ea5e9",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold",
            fontSize: "0.95rem",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(14, 165, 233, 0.2)"
          }}
        >
          + Registrar Nuevo Vehículo
        </button>
      </div>

      {error && (
        <div style={{ padding: "1rem", backgroundColor: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: "8px", marginBottom: "1.5rem" }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#64748b" }}>Cargando solicitudes...</p>
      ) : solicitudes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
          <h2 style={{ color: "#475569", margin: "0 0 0.5rem 0" }}>Todavía no tenés vehículos en revisión</h2>
          <p style={{ color: "#64748b", margin: 0 }}>Registrá tu primer vehículo para comenzar a alquilarlo en nuestra plataforma.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", minWidth: "700px", borderCollapse: "collapse", textAlign: "left", backgroundColor: "#ffffff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px 16px", color: "#475569", fontWeight: "bold" }}>ID</th>
                <th style={{ padding: "12px 16px", color: "#475569", fontWeight: "bold" }}>Vehículo</th>
                <th style={{ padding: "12px 16px", color: "#475569", fontWeight: "bold" }}>Patente</th>
                <th style={{ padding: "12px 16px", color: "#475569", fontWeight: "bold" }}>Estado General</th>
                <th style={{ padding: "12px 16px", color: "#475569", fontWeight: "bold" }}>Validación Patente</th>
                <th style={{ padding: "12px 16px", color: "#475569", fontWeight: "bold" }}>Validación Titularidad</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((sol) => {
                const estadoGeneral = limpiarEnum(sol.estado);
                const valPatente = limpiarEnum(sol.resultado_patente);
                const valTitularidad = limpiarEnum(sol.resultado_titularidad);
                
                return (
                  <tr key={sol.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", color: "#64748b", fontWeight: "500" }}>
                      #{sol.id}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: "bold", color: "#0f172a" }}>
                      {sol.marca} {sol.modelo} ({sol.anio})
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748b" }}>
                      {sol.patente}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "0.25rem 0.65rem",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        ...getBadgeStyle(estadoGeneral)
                      }}>
                        {estadoGeneral}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "0.25rem 0.65rem",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        ...getBadgeStyle(valPatente)
                      }}>
                        {valPatente}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "0.25rem 0.65rem",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        ...getBadgeStyle(valTitularidad)
                      }}>
                        {valTitularidad}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default MisVehiculos;