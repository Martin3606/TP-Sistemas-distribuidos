import { useState, useEffect } from "react";
import { fetchGraphQL, fetchREST } from "../services/api";

const TIPOS_VEHICULO = ["", "SEDAN", "SUV", "PICKUP", "COUPE", "HATCHBACK"];
const DRAFT_KEY_RESERVAS = "borrador_reservas";

const INITIAL_FILTROS_RESERVA = {
  fechaInicio: "",
  fechaFin: "",
  tipoVehiculo: "",
  marca: "",
};

const getInitialReservaDraft = () => {
  try {
    const saved = sessionStorage.getItem(DRAFT_KEY_RESERVAS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        return {
          filtros: parsed.filtros ? { ...INITIAL_FILTROS_RESERVA, ...parsed.filtros } : INITIAL_FILTROS_RESERVA,
          clienteId: parsed.clienteId || "",
          vehiculoSeleccionado: parsed.vehiculoSeleccionado || null,
        };
      }
    }
  } catch (e) {
    console.error("Error cargando borrador de reservas:", e);
  }
  return {
    filtros: INITIAL_FILTROS_RESERVA,
    clienteId: "",
    vehiculoSeleccionado: null,
  };
};

function Reservas() {
  const initialDraft = getInitialReservaDraft();
  const [filtros, setFiltros] = useState(initialDraft.filtros);
  const [clienteId, setClienteId] = useState(initialDraft.clienteId);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(initialDraft.vehiculoSeleccionado);
  const [disponibles, setDisponibles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reservaLoading, setReservaLoading] = useState(false);

  useEffect(() => {
    try {
      const hasContent = filtros.fechaInicio || filtros.fechaFin || filtros.tipoVehiculo || filtros.marca || clienteId || vehiculoSeleccionado;
      if (hasContent) {
        sessionStorage.setItem(
          DRAFT_KEY_RESERVAS,
          JSON.stringify({ filtros, clienteId, vehiculoSeleccionado })
        );
      } else {
        sessionStorage.removeItem(DRAFT_KEY_RESERVAS);
      }
    } catch (e) {
      console.error("Error guardando borrador de reservas:", e);
    }
  }, [filtros, clienteId, vehiculoSeleccionado]);

  const handleFiltroChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  const validarFechas = () => {
    if (!filtros.fechaInicio || !filtros.fechaFin) {
      setError("Las fechas de inicio y finalización son obligatorias.");
      return false;
    }

    const inicio = new Date(filtros.fechaInicio);
    const fin = new Date(filtros.fechaFin);

    if (inicio >= fin) {
      setError("La fecha de inicio debe ser anterior a la fecha de fin");
      return false;
    }

    return true;
  };

  const buscarDisponibilidad = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setVehiculoSeleccionado(null);

    if (!validarFechas()) {
      return;
    }

    setLoading(true);

    const query = `
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
        }
      }
    `;

    const variables = {
      filtro: {
        fechaInicio: filtros.fechaInicio.includes("T") ? filtros.fechaInicio : `${filtros.fechaInicio}T00:00:00`,
        fechaFin: filtros.fechaFin.includes("T") ? filtros.fechaFin : `${filtros.fechaFin}T23:59:59`,
        tipoVehiculo: filtros.tipoVehiculo || null,
        marca: filtros.marca || null,
      },
    };

    try {
      const data = await fetchGraphQL(query, variables);
      const lista = data.consultarDisponibilidad || [];
      setDisponibles(lista);
      if (lista.length === 0) {
        setSuccess("No se encontraron vehículos disponibles en el período seleccionado.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionarVehiculo = (vehiculo) => {
    setVehiculoSeleccionado(vehiculo);
    setError("");
    setSuccess("");
  };

  const handleCrearReserva = async (e) => {
    e.preventDefault();
    if (!clienteId || !vehiculoSeleccionado) {
      setError("Debes ingresar el ID del cliente.");
      return;
    }

    if (!validarFechas()) {
      return;
    }

    setReservaLoading(true);
    setError("");
    setSuccess("");

    const payload = {
      cliente_id: parseInt(clienteId, 10),
      vehiculo_id: parseInt(vehiculoSeleccionado.id, 10),
      fecha_inicio: filtros.fechaInicio.includes("T") ? filtros.fechaInicio : `${filtros.fechaInicio}T00:00:00`,
      fecha_fin: filtros.fechaFin.includes("T") ? filtros.fechaFin : `${filtros.fechaFin}T23:59:59`,
    };

    try {
      let reservaCreada;
      try {
        reservaCreada = await fetchREST("/reservas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        reservaCreada = await fetchREST("/api/reservas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setSuccess(`¡Reserva CONFIRMADA con éxito! ID de Reserva: ${reservaCreada.id} - Importe Total: $${reservaCreada.importe_total}`);
      setVehiculoSeleccionado(null);
      setClienteId("");
      try {
        sessionStorage.removeItem(DRAFT_KEY_RESERVAS);
      } catch {
        // Ignorar
      }
      buscarDisponibilidad(e);
    } catch (err) {
      setError(err.message);
    } finally {
      setReservaLoading(false);
    }
  };

  return (
    <section style={{ padding: "15px", width: "100%", boxSizing: "border-box" }}>
      <h1>Buscador de Disponibilidad y Reservas</h1>
      <p style={{ color: "#555" }}>
        Consultá la flota disponible enviando la consulta GraphQL a Spring Boot (`:8080/graphql`) y luego confirmá el alta mediante la API REST (`:8000/reservas`).
      </p>

      {error && <div style={{ color: "#721c24", backgroundColor: "#f8d7da", borderColor: "#f5c6cb", padding: "12px", borderRadius: "6px", marginBottom: "15px" }}>⚠️ {error}</div>}
      {success && <div style={{ color: "#155724", backgroundColor: "#d4edda", borderColor: "#c3e6cb", padding: "12px", borderRadius: "6px", marginBottom: "15px" }}>✅ {success}</div>}

      <form onSubmit={buscarDisponibilidad} style={{ backgroundColor: "#ffffff", padding: "20px 15px", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", border: "none", marginBottom: "25px", width: "100%", boxSizing: "border-box" }}>
        <h3 style={{ marginTop: 0, color: "#333" }}>1. Consultar Vehículos Disponibles (GraphQL)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>Fecha Inicio *</label>
            <input
              type="datetime-local"
              name="fechaInicio"
              value={filtros.fechaInicio}
              onChange={handleFiltroChange}
              required
              style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box", fontSize: "0.95em", transition: "border-color 0.3s" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>Fecha Fin *</label>
            <input
              type="datetime-local"
              name="fechaFin"
              value={filtros.fechaFin}
              onChange={handleFiltroChange}
              required
              style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box", fontSize: "0.95em", transition: "border-color 0.3s" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>Tipo de Vehículo</label>
            <select
              name="tipoVehiculo"
              value={filtros.tipoVehiculo}
              onChange={handleFiltroChange}
              style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box", fontSize: "0.95em", transition: "border-color 0.3s" }}
            >
              {TIPOS_VEHICULO.map((t) => (
                <option key={t} value={t}>{t === "" ? "Todos los tipos" : t}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>Marca (Filtro opcional)</label>
            <input
              type="text"
              name="marca"
              value={filtros.marca}
              onChange={handleFiltroChange}
              placeholder="Ej: Toyota"
              style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box", fontSize: "0.95em", transition: "border-color 0.3s" }}
            />
          </div>
        </div>
        <button
          type="submit"
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            backgroundColor: "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: "bold",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            cursor: "pointer",
          }}
        >
          {loading ? "Buscando..." : "Buscar Disponibles"}
        </button>
      </form>

      {vehiculoSeleccionado && (
        <form onSubmit={handleCrearReserva} style={{ backgroundColor: "#ffffff", padding: "20px 15px", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", border: "1px solid #ffeba8", marginBottom: "25px", width: "100%", boxSizing: "border-box" }}>
          <h3 style={{ marginTop: 0, color: "#856404" }}>2. Confirmar Reserva (REST FastAPI)</h3>
          <p style={{ color: "#333" }}>
            Vehículo seleccionado: <strong>{vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo} ({vehiculoSeleccionado.patente})</strong> - Precio diario: <strong>${vehiculoSeleccionado.precioDiario}</strong>
          </p>
          <div style={{ maxWidth: "300px", marginBottom: "15px", width: "100%" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>ID del Cliente *</label>
            <input
              type="number"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              placeholder="Ej: 1"
              required
              style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box", fontSize: "0.95em" }}
            />
          </div>
          <button
            type="submit"
            disabled={reservaLoading}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            {reservaLoading ? "Procesando..." : "Confirmar Reserva"}
          </button>
          <button
            type="button"
            onClick={() => setVehiculoSeleccionado(null)}
            style={{
              padding: "10px 20px",
              backgroundColor: "#6c757d",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              cursor: "pointer",
            }}
          >
            Cancelar Selección
          </button>
        </form>
      )}

      <h3 style={{ color: "#333" }}>Resultados de Disponibilidad</h3>
      <div style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", minWidth: "600px", borderCollapse: "collapse", textAlign: "left", backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
          <thead>
            <tr style={{ backgroundColor: "#f8f9fa" }}>
              <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>ID</th>
              <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Patente</th>
              <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Marca / Modelo / Año</th>
              <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Tipo</th>
              <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Precio Diario</th>
              <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {disponibles.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: "12px", borderBottom: "1px solid #eaeaea", textAlign: "center" }}>Realizá una búsqueda para ver los vehículos disponibles.</td></tr>
            ) : (
              disponibles.map((v) => (
                <tr key={v.id}>
                  <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>{v.id}</td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea", fontWeight: "bold" }}>{v.patente}</td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>{v.marca} {v.modelo} ({v.anio})</td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>{v.tipoVehiculo || v.tipo_vehiculo}</td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>${v.precioDiario || v.precio_diario}</td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => handleSeleccionarVehiculo(v)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#007bff",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: "bold",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        cursor: "pointer",
                      }}
                    >
                      Reservar Este Vehículo
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default Reservas;