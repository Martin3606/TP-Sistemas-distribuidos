import { useState } from "react";
import { fetchGraphQL, fetchREST } from "../services/api";
import { useAuth } from "../auth/AuthContext";
import "./ClientePages.css";

const TIPOS_VEHICULO = ["", "SEDAN", "SUV", "PICKUP", "COUPE", "HATCHBACK"];

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
  const { user, clienteId } = useAuth();

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [tipoVehiculo, setTipoVehiculo] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");

  const [vehiculos, setVehiculos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Estado del modal de confirmación de reserva
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(null);
  const [reservaCargando, setReservaCargando] = useState(false);

  async function handleBuscar(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCargando(true);
    setBuscado(true);
    setVehiculoSeleccionado(null);

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (inicio >= fin) {
      setError("La fecha de inicio debe ser anterior a la fecha de finalización.");
      setCargando(false);
      return;
    }

    const variables = {
      filtro: {
        fechaInicio: fechaInicio.includes("T") ? fechaInicio : `${fechaInicio}T00:00:00`,
        fechaFin: fechaFin.includes("T") ? fechaFin : `${fechaFin}T23:59:59`,
        tipoVehiculo: tipoVehiculo || null,
        marca: marca.trim() || null,
        modelo: modelo.trim() || null,
        precioMin: precioMin ? parseFloat(precioMin) : null,
        precioMax: precioMax ? parseFloat(precioMax) : null,
      },
    };

    try {
      const data = await fetchGraphQL(QUERY_DISPONIBILIDAD, variables);
      setVehiculos(data.consultarDisponibilidad || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleConfirmarReserva(e) {
    e.preventDefault();
    if (!vehiculoSeleccionado) return;

    setReservaCargando(true);
    setError("");
    setSuccess("");

    const payload = {
      patente: vehiculoSeleccionado.patente,
      cliente_id: clienteId ? parseInt(clienteId, 10) : undefined,
      fecha_inicio: fechaInicio.includes("T") ? fechaInicio : `${fechaInicio}T00:00:00`,
      fecha_fin: fechaFin.includes("T") ? fechaFin : `${fechaFin}T23:59:59`,
    };

    try {
      let res;
      try {
        res = await fetchREST("/reservas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        res = await fetchREST("/api/reservas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setSuccess(`¡Reserva confirmada con éxito para el vehículo ${vehiculoSeleccionado.marca} ${vehiculoSeleccionado.modelo}! Importe total: $${res.importe_total}`);
      setVehiculoSeleccionado(null);
      // Volver a consultar para actualizar la grilla
      handleBuscar(e);
    } catch (err) {
      setError(err.message);
    } finally {
      setReservaCargando(false);
    }
  }

  return (
    <section className="cliente-panel" style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div className="page-heading" style={{ marginBottom: "1.5rem" }}>
        <div>
          <p className="eyebrow" style={{ color: "#38bdf8", fontWeight: "bold", textTransform: "uppercase", fontSize: "0.85rem" }}>
            Bienvenido {user?.nombre || "Cliente"}
          </p>
          <h1 style={{ margin: "0.25rem 0", fontSize: "2rem", color: "#0f172a" }}>Catálogo de Vehículos Disponibles</h1>
          <p style={{ color: "#64748b" }}>Ingresá las fechas de tu viaje y aplicá los filtros para encontrar tu auto ideal.</p>
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

      {/* Formulario de Consulta de Disponibilidad (GraphQL) */}
      <form onSubmit={handleBuscar} style={{ backgroundColor: "#ffffff", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "2rem", border: "1px solid #e2e8f0" }}>
        <h3 style={{ marginTop: 0, marginBottom: "1rem", color: "#1e293b" }}>Filtros de Búsqueda</h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.2rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "bold", fontSize: "0.85rem", color: "#334155" }}>
              Fecha Inicio *
            </label>
            <input
              type="datetime-local"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
              style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "bold", fontSize: "0.85rem", color: "#334155" }}>
              Fecha Fin *
            </label>
            <input
              type="datetime-local"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              required
              style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "bold", fontSize: "0.85rem", color: "#334155" }}>
              Tipo de Vehículo
            </label>
            <select
              value={tipoVehiculo}
              onChange={(e) => setTipoVehiculo(e.target.value)}
              style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
            >
              {TIPOS_VEHICULO.map((t) => (
                <option key={t} value={t}>{t === "" ? "Todos los tipos" : t}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "bold", fontSize: "0.85rem", color: "#334155" }}>
              Marca
            </label>
            <input
              type="text"
              placeholder="Ej: Toyota"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "bold", fontSize: "0.85rem", color: "#334155" }}>
              Modelo
            </label>
            <input
              type="text"
              placeholder="Ej: Corolla"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "bold", fontSize: "0.85rem", color: "#334155" }}>
              Precio Mínimo ($)
            </label>
            <input
              type="number"
              min="0"
              placeholder="Ej: 5000"
              value={precioMin}
              onChange={(e) => setPrecioMin(e.target.value)}
              style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "bold", fontSize: "0.85rem", color: "#334155" }}>
              Precio Máximo ($)
            </label>
            <input
              type="number"
              min="0"
              placeholder="Ej: 30000"
              value={precioMax}
              onChange={(e) => setPrecioMax(e.target.value)}
              style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={cargando}
          style={{
            marginTop: "1.5rem",
            padding: "0.75rem 1.5rem",
            backgroundColor: "#0284c7",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold",
            fontSize: "0.95rem",
            cursor: cargando ? "not-allowed" : "pointer"
          }}
        >
          {cargando ? "Buscando en catálogo..." : "Buscar Vehículos Disponibles"}
        </button>
      </form>

      {/* Modal / Sección de Confirmación de Reserva */}
      {vehiculoSeleccionado && (
        <form onSubmit={handleConfirmarReserva} style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "1.5rem", borderRadius: "12px", marginBottom: "2rem" }}>
          <h3 style={{ marginTop: 0, color: "#1e40af" }}>Confirmar Reserva de Vehículo</h3>
          <p style={{ color: "#1e3a8a", margin: "0.5rem 0 1rem 0" }}>
            Estás por reservar: <strong>{vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}</strong> (Patente: <strong>{vehiculoSeleccionado.patente}</strong>)
            <br />
            Período: <strong>{fechaInicio.replace("T", " ")}</strong> al <strong>{fechaFin.replace("T", " ")}</strong>
            <br />
            Precio por día: <strong>${vehiculoSeleccionado.precioDiario}</strong>
          </p>

          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              type="submit"
              disabled={reservaCargando}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#16a34a",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: reservaCargando ? "not-allowed" : "pointer"
              }}
            >
              {reservaCargando ? "Confirmando..." : "Confirmar Mi Reserva"}
            </button>

            <button
              type="button"
              onClick={() => setVehiculoSeleccionado(null)}
              style={{
                padding: "0.75rem 1.25rem",
                backgroundColor: "#64748b",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Grilla de Resultados */}
      {buscado && !cargando && vehiculos.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
          <h2 style={{ color: "#475569", margin: "0 0 0.5rem 0" }}>No hay vehículos disponibles</h2>
          <p style={{ color: "#64748b", margin: 0 }}>Probá modificando las fechas o los filtros de búsqueda.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
        {vehiculos.map((v) => (
          <div
            key={v.patente}
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "1.5rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", backgroundColor: "#e0f2fe", color: "#0369a1", borderRadius: "12px", fontWeight: "bold" }}>
                  {v.tipoVehiculo || v.tipo_vehiculo}
                </span>
                <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "bold" }}>{v.patente}</span>
              </div>
              
              <h2 style={{ margin: "0 0 0.4rem 0", fontSize: "1.3rem", color: "#0f172a" }}>
                {v.marca} {v.modelo}
              </h2>
              
              <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1rem" }}>
                Año: {v.anio} • Color: {v.color || "No especificado"}
              </p>

              <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#0f172a", marginBottom: "1.2rem" }}>
                ${v.precioDiario} <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "normal" }}>/ día</span>
              </div>
            </div>

            <button
              onClick={() => setVehiculoSeleccionado(v)}
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: "#0284c7",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "background-color 0.2s"
              }}
            >
              Reservar Este Vehículo
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Catalogo;
