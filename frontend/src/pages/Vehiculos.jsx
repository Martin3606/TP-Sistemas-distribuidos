import { useState, useEffect } from "react";
import { fetchREST } from "../services/api";

const TIPOS_VEHICULO = ["SEDAN", "SUV", "PICKUP", "COUPE", "HATCHBACK"];
const DRAFT_KEY_VEHICULOS = "borrador_vehiculo";

const INITIAL_FORM_VEHICULO = {
  id: null,
  patente: "",
  marca: "",
  modelo: "",
  anio: 2024,
  color: "",
  tipo_vehiculo: "SEDAN",
  precio_diario: "",
};

const getInitialVehiculoDraft = () => {
  try {
    const saved = sessionStorage.getItem(DRAFT_KEY_VEHICULOS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object" && parsed.form) {
        return {
          form: { ...INITIAL_FORM_VEHICULO, ...parsed.form },
          editando: Boolean(parsed.editando),
        };
      }
    }
  } catch (e) {
    console.error("Error cargando borrador de vehículo:", e);
  }
  return { form: INITIAL_FORM_VEHICULO, editando: false };
};

function Vehiculos() {
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState(() => getInitialVehiculoDraft().form);
  const [editando, setEditando] = useState(() => getInitialVehiculoDraft().editando);

  useEffect(() => {
    cargarVehiculos();
  }, []);

  useEffect(() => {
    try {
      const hasContent =
        Boolean(form.patente) ||
        Boolean(form.marca) ||
        Boolean(form.modelo) ||
        Boolean(form.color) ||
        Boolean(form.precio_diario) ||
        form.anio !== 2024 ||
        form.tipo_vehiculo !== "SEDAN" ||
        form.id !== null;

      if (hasContent || editando) {
        sessionStorage.setItem(DRAFT_KEY_VEHICULOS, JSON.stringify({ form, editando }));
      } else {
        sessionStorage.removeItem(DRAFT_KEY_VEHICULOS);
      }
    } catch (e) {
      console.error("Error guardando borrador de vehículo:", e);
    }
  }, [form, editando]);

  const cargarVehiculos = async () => {
    setLoading(true);
    setError("");
    try {
      let data;
      try {
        data = await fetchREST("/vehiculos");
      } catch {
        data = await fetchREST("/api/vehiculos");
      }
      setVehiculos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const finalValue = name === "patente" ? value.toUpperCase() : value;
    setForm((prev) => ({ ...prev, [name]: finalValue }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const newFieldErrors = {};

    const patenteTrim = form.patente ? form.patente.trim().toUpperCase() : "";
    const marcaTrim = form.marca ? form.marca.trim() : "";
    const modeloTrim = form.modelo ? form.modelo.trim() : "";
    const colorTrim = form.color ? form.color.trim() : "";
    const precioDiarioStr = form.precio_diario !== null && form.precio_diario !== undefined ? String(form.precio_diario).trim() : "";

    // 1. Bloqueo de espacios vacíos para campos obligatorios
    if (!editando && !patenteTrim) newFieldErrors.patente = true;
    if (!marcaTrim) newFieldErrors.marca = true;
    if (!modeloTrim) newFieldErrors.modelo = true;
    if (!precioDiarioStr) newFieldErrors.precio_diario = true;

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError("Los campos obligatorios no pueden estar vacíos.");
      return;
    }

    // 2. Validación de Formato y Unicidad de Patente (solo al crear)
    if (!editando) {
      const regexPatenteFormat = /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/i;
      if (!regexPatenteFormat.test(patenteTrim)) {
        setFieldErrors({ patente: true });
        setError("Formato de patente inválido (ej: AAA123 o AA123AA)");
        return;
      }

      const existe = vehiculos.some(
        (v) => v.patente && v.patente.toUpperCase() === patenteTrim
      );
      if (existe) {
        setFieldErrors({ patente: true });
        setError("La patente ingresada ya se encuentra registrada en la flota");
        return;
      }
    }

    // 3. Validación de Marca, Modelo y Color (Regex)
    const regexTextoVehiculo = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s\-]+$/;
    let hasTextError = false;
    if (!regexTextoVehiculo.test(marcaTrim)) {
      newFieldErrors.marca = true;
      hasTextError = true;
    }
    if (!regexTextoVehiculo.test(modeloTrim)) {
      newFieldErrors.modelo = true;
      hasTextError = true;
    }
    if (colorTrim && !regexTextoVehiculo.test(colorTrim)) {
      newFieldErrors.color = true;
      hasTextError = true;
    }
    if (hasTextError) {
      setFieldErrors(newFieldErrors);
      setError("La marca, modelo o color contienen caracteres no permitidos.");
      return;
    }

    const precioNum = parseFloat(precioDiarioStr);
    if (isNaN(precioNum) || precioNum <= 0) {
      setFieldErrors({ precio_diario: true });
      setError("El precio diario debe ser un número positivo.");
      return;
    }

    const currentYear = new Date().getFullYear();
    const anioNum = parseInt(form.anio, 10);
    if (isNaN(anioNum) || anioNum < 1900 || anioNum > currentYear) {
      setFieldErrors({ anio: true });
      setError("El año del vehículo debe ser válido y no puede ser un año futuro");
      return;
    }

    setFieldErrors({});

    try {
      if (editando) {
        const payloadPut = {
          marca: marcaTrim,
          modelo: modeloTrim,
          anio: anioNum,
          color: colorTrim || null,
          tipo_vehiculo: form.tipo_vehiculo,
          precio_diario: precioNum,
        };

        try {
          await fetchREST(`/vehiculos/${form.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadPut),
          });
        } catch {
          await fetchREST(`/api/vehiculos/${form.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadPut),
          });
        }
        setSuccess("Vehículo actualizado con éxito.");
      } else {
        const payloadPost = {
          patente: patenteTrim,
          marca: marcaTrim,
          modelo: modeloTrim,
          anio: anioNum,
          color: colorTrim || null,
          tipo_vehiculo: form.tipo_vehiculo,
          precio_diario: precioNum,
        };

        try {
          await fetchREST("/vehiculos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadPost),
          });
        } catch {
          await fetchREST("/api/vehiculos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadPost),
          });
        }
        setSuccess("Vehículo registrado en la flota con éxito.");
      }

      limpiarFormulario();
      cargarVehiculos();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (v) => {
    const newForm = {
      id: v.id,
      patente: v.patente,
      marca: v.marca,
      modelo: v.modelo,
      anio: v.anio,
      color: v.color || "",
      tipo_vehiculo: v.tipo_vehiculo,
      precio_diario: v.precio_diario,
    };
    setForm(newForm);
    setFieldErrors({});
    setEditando(true);
    try {
      sessionStorage.setItem(DRAFT_KEY_VEHICULOS, JSON.stringify({ form: newForm, editando: true }));
    } catch {}
  };

  const handleBajaLogica = async (id) => {
    if (!window.confirm("¿Seguro que deseas dar de baja este vehículo?")) return;
    setError("");
    setSuccess("");

    try {
      try {
        await fetchREST(`/vehiculos/${id}`, { method: "DELETE" });
      } catch {
        await fetchREST(`/api/vehiculos/${id}`, { method: "DELETE" });
      }
      setSuccess("Vehículo dado de baja lógicamente.");
      cargarVehiculos();
    } catch (err) {
      setError(err.message);
    }
  };

  const limpiarFormulario = () => {
    setForm(INITIAL_FORM_VEHICULO);
    setFieldErrors({});
    setEditando(false);
    try {
      sessionStorage.removeItem(DRAFT_KEY_VEHICULOS);
    } catch {
      // Ignorar
    }
  };

  return (
    <section style={{ padding: "15px", width: "100%", boxSizing: "border-box" }}>
      <h1>Gestión de Flota de Vehículos (REST)</h1>

      {error && <div style={{ color: "#721c24", backgroundColor: "#f8d7da", borderColor: "#f5c6cb", padding: "12px", borderRadius: "6px", marginBottom: "15px" }}>⚠️ {error}</div>}
      {success && <div style={{ color: "#155724", backgroundColor: "#d4edda", borderColor: "#c3e6cb", padding: "12px", borderRadius: "6px", marginBottom: "15px" }}>✅ {success}</div>}

      <form onSubmit={handleSubmit} style={{ backgroundColor: "#ffffff", padding: "20px 15px", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", border: "none", marginBottom: "25px", width: "100%", boxSizing: "border-box" }}>
        <h3 style={{ marginTop: 0, color: "#333" }}>{editando ? "Modificar Vehículo" : "Nuevo Vehículo"}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>
              Patente * <br /> <span style={{ fontWeight: "normal", fontSize: "0.85em" }}>(Inmutable tras alta)</span>
            </label>
            <input
              type="text"
              name="patente"
              value={form.patente}
              onChange={handleChange}
              disabled={editando}
              required
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: editando ? "#e9ecef" : "#fff",
                border: fieldErrors.patente ? "2px solid #dc3545" : "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
                fontSize: "0.95em",
                transition: "border-color 0.3s",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>Marca *</label>
            <input
              type="text"
              name="marca"
              value={form.marca}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "10px",
                border: fieldErrors.marca ? "2px solid #dc3545" : "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
                fontSize: "0.95em",
                transition: "border-color 0.3s",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>Modelo *</label>
            <input
              type="text"
              name="modelo"
              value={form.modelo}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "10px",
                border: fieldErrors.modelo ? "2px solid #dc3545" : "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
                fontSize: "0.95em",
                transition: "border-color 0.3s",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>Año *</label>
            <input
              type="number"
              name="anio"
              min="1900"
              max={new Date().getFullYear()}
              value={form.anio}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "10px",
                border: fieldErrors.anio ? "2px solid #dc3545" : "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
                fontSize: "0.95em",
                transition: "border-color 0.3s",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>Color</label>
            <input
              type="text"
              name="color"
              value={form.color}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
                border: fieldErrors.color ? "2px solid #dc3545" : "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
                fontSize: "0.95em",
                transition: "border-color 0.3s",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>Tipo de Vehículo *</label>
            <select
              name="tipo_vehiculo"
              value={form.tipo_vehiculo}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
                border: fieldErrors.tipo_vehiculo ? "2px solid #dc3545" : "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
                fontSize: "0.95em",
                transition: "border-color 0.3s",
              }}
            >
              {TIPOS_VEHICULO.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>Precio Diario ($) *</label>
            <input
              type="number"
              step="0.01"
              name="precio_diario"
              value={form.precio_diario}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "10px",
                border: fieldErrors.precio_diario ? "2px solid #dc3545" : "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
                fontSize: "0.95em",
                transition: "border-color 0.3s",
              }}
            />
          </div>
        </div>
        <div style={{ marginTop: "20px" }}>
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
              marginRight: "10px",
            }}
          >
            {editando ? "Guardar Cambios" : "Crear Vehículo"}
          </button>
          {editando && (
            <button
              type="button"
              onClick={limpiarFormulario}
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
              Cancelar
            </button>
          )}
        </div>
      </form>

      <h3 style={{ color: "#333" }}>Catálogo de la Flota</h3>
      {loading ? (
        <p>Cargando catálogo...</p>
      ) : (
        <div style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", minWidth: "650px", borderCollapse: "collapse", textAlign: "left", backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>ID</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Patente</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Marca / Modelo / Año</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Tipo</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Precio Diario</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Estado Operativo</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Activo</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {vehiculos.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: "12px", borderBottom: "1px solid #eaeaea", textAlign: "center" }}>No hay vehículos registrados.</td></tr>
              ) : (
                vehiculos.map((v) => (
                  <tr key={v.id} style={{ backgroundColor: v.activo ? "#ffffff" : "#fff5f5" }}>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>{v.id}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea", fontWeight: "bold" }}>{v.patente}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>{v.marca} {v.modelo} ({v.anio})</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>{v.tipo_vehiculo}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>${v.precio_diario}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          color: v.estado === "DISPONIBLE" ? "#155724" : v.estado === "RESERVADO" || v.estado === "EN_ALQUILER" ? "#856404" : "#383d41",
                          backgroundColor: v.estado === "DISPONIBLE" ? "#d4edda" : v.estado === "RESERVADO" || v.estado === "EN_ALQUILER" ? "#fff3cd" : "#e2e3e5",
                          fontSize: "12px",
                          fontWeight: "bold",
                          display: "inline-block",
                        }}
                      >
                        {v.estado}
                      </span>
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          color: v.activo ? "#155724" : "#721c24",
                          backgroundColor: v.activo ? "#d4edda" : "#f8d7da",
                          fontSize: "12px",
                          fontWeight: "bold",
                          display: "inline-block",
                        }}
                      >
                        {v.activo ? "ACTIVO" : "INACTIVO"}
                      </span>
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          onClick={() => handleEdit(v)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#ffc107",
                            color: "#212529",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            cursor: "pointer",
                          }}
                        >
                          Editar
                        </button>
                        {v.activo && (
                          <button
                            onClick={() => handleBajaLogica(v.id)}
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
                            Dar de Baja
                          </button>
                        )}
                      </div>
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

export default Vehiculos;