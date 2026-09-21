import { useState, useEffect } from "react";
import { fetchREST } from "../services/api";

const DRAFT_KEY_CLIENTES = "borrador_cliente";

const INITIAL_FORM_CLIENTE = {
  id: null,
  documento: "",
  nombre: "",
  apellido: "",
  email: "",
  telefono: "",
  fecha_nacimiento: "",
};

const getInitialClienteDraft = () => {
  try {
    const saved = sessionStorage.getItem(DRAFT_KEY_CLIENTES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object" && parsed.form) {
        return {
          form: { ...INITIAL_FORM_CLIENTE, ...parsed.form },
          editando: Boolean(parsed.editando),
        };
      }
    }
  } catch (e) {
    console.error("Error cargando borrador de cliente:", e);
  }
  return { form: INITIAL_FORM_CLIENTE, editando: false };
};

function Clientes() {
  const initialDraft = getInitialClienteDraft();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState(initialDraft.form);
  const [editando, setEditando] = useState(initialDraft.editando);

  useEffect(() => {
    cargarClientes();
  }, []);

  useEffect(() => {
    try {
      const hasContent = form.documento || form.nombre || form.apellido || form.email || form.telefono || form.fecha_nacimiento || form.id !== null;
      if (hasContent || editando) {
        sessionStorage.setItem(DRAFT_KEY_CLIENTES, JSON.stringify({ form, editando }));
      } else {
        sessionStorage.removeItem(DRAFT_KEY_CLIENTES);
      }
    } catch (e) {
      console.error("Error guardando borrador de cliente:", e);
    }
  }, [form, editando]);

  const cargarClientes = async () => {
    setLoading(true);
    setError("");
    try {
      let data;
      try {
        data = await fetchREST("/api/clientes");
      } catch {
        data = await fetchREST("/clientes");
      }
      setClientes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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

    const documentoTrim = form.documento ? form.documento.trim() : "";
    const nombreTrim = form.nombre ? form.nombre.trim() : "";
    const apellidoTrim = form.apellido ? form.apellido.trim() : "";
    const emailTrim = form.email ? form.email.trim() : "";
    const telefonoTrim = form.telefono ? form.telefono.trim() : "";
    const fechaNacimientoTrim = form.fecha_nacimiento ? form.fecha_nacimiento.trim() : "";

    // 1. Bloqueo de espacios vacíos para campos obligatorios
    if (!documentoTrim) newFieldErrors.documento = true;
    if (!nombreTrim) newFieldErrors.nombre = true;
    if (!apellidoTrim) newFieldErrors.apellido = true;
    if (!emailTrim) newFieldErrors.email = true;

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError("Los campos obligatorios no pueden estar vacíos.");
      return;
    }

    // 2. Validación Numérica (Regex) para documento
    const regexDocumento = /^\d+$/;
    if (!regexDocumento.test(documentoTrim)) {
      setFieldErrors({ documento: true });
      setError("El documento solo debe contener números.");
      return;
    }

    // 2b. Validación Numérica (Regex) para teléfono
    if (telefonoTrim) {
      const regexTelefono = /^\+?\d+$/;
      if (!regexTelefono.test(telefonoTrim)) {
        setFieldErrors({ telefono: true });
        setError("El teléfono solo debe contener números (opcionalmente iniciando con +).");
        return;
      }
    }

    // 3. Validación de Nombres (Regex) para nombre y apellido
    const regexNombres = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-]+$/;
    let hasNameError = false;
    if (!regexNombres.test(nombreTrim)) {
      newFieldErrors.nombre = true;
      hasNameError = true;
    }
    if (!regexNombres.test(apellidoTrim)) {
      newFieldErrors.apellido = true;
      hasNameError = true;
    }
    if (hasNameError) {
      setFieldErrors(newFieldErrors);
      setError("El nombre y el apellido contienen caracteres no permitidos.");
      return;
    }

    setFieldErrors({});

    try {
      const payload = {
        documento: documentoTrim,
        nombre: nombreTrim,
        apellido: apellidoTrim,
        email: emailTrim,
        telefono: telefonoTrim || null,
        fecha_nacimiento: fechaNacimientoTrim || null,
      };

      if (editando) {
        try {
          await fetchREST(`/api/clientes/${form.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch {
          await fetchREST(`/clientes/${form.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
        setSuccess("Cliente actualizado con éxito.");
      } else {
        try {
          await fetchREST("/api/clientes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch {
          await fetchREST("/clientes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
        setSuccess("Cliente registrado con éxito.");
      }

      limpiarFormulario();
      cargarClientes();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (cliente) => {
    const newForm = {
      id: cliente.id,
      documento: cliente.documento,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      email: cliente.email,
      telefono: cliente.telefono || "",
      fecha_nacimiento: cliente.fecha_nacimiento || "",
    };
    setForm(newForm);
    setFieldErrors({});
    setEditando(true);
    try {
      sessionStorage.setItem(DRAFT_KEY_CLIENTES, JSON.stringify({ form: newForm, editando: true }));
    } catch {}
  };

  const handleBajaLogica = async (id) => {
    if (!window.confirm("¿Seguro que deseas dar de baja este cliente?")) return;
    setError("");
    setSuccess("");

    try {
      try {
        await fetchREST(`/api/clientes/${id}`, { method: "DELETE" });
      } catch {
        await fetchREST(`/clientes/${id}`, { method: "DELETE" });
      }
      setSuccess("Cliente dado de baja lógicamente.");
      cargarClientes();
    } catch (err) {
      setError(err.message);
    }
  };

  const limpiarFormulario = () => {
    setForm(INITIAL_FORM_CLIENTE);
    setFieldErrors({});
    setEditando(false);
    try {
      sessionStorage.removeItem(DRAFT_KEY_CLIENTES);
    } catch {
      // Ignorar
    }
  };

  return (
    <section style={{ padding: "15px", width: "100%", boxSizing: "border-box" }}>
      <h1>Gestión de Clientes (REST)</h1>

      {error && <div style={{ color: "#721c24", backgroundColor: "#f8d7da", borderColor: "#f5c6cb", padding: "12px", borderRadius: "6px", marginBottom: "15px" }}>⚠️ {error}</div>}
      {success && <div style={{ color: "#155724", backgroundColor: "#d4edda", borderColor: "#c3e6cb", padding: "12px", borderRadius: "6px", marginBottom: "15px" }}>✅ {success}</div>}

      <form onSubmit={handleSubmit} style={{ backgroundColor: "#ffffff", padding: "20px 15px", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", border: "none", marginBottom: "25px", width: "100%", boxSizing: "border-box" }}>
        <h3 style={{ marginTop: 0, color: "#333" }}>{editando ? "Modificar Cliente" : "Nuevo Cliente"}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>Documento *</label>
            <input
              type="text"
              name="documento"
              value={form.documento}
              onChange={handleChange}
              disabled={editando}
              required
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: editando ? "#e9ecef" : "#fff",
                border: fieldErrors.documento ? "2px solid #dc3545" : "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
                fontSize: "0.95em",
                transition: "border-color 0.3s",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>Nombre *</label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "10px",
                border: fieldErrors.nombre ? "2px solid #dc3545" : "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
                fontSize: "0.95em",
                transition: "border-color 0.3s",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>Apellido *</label>
            <input
              type="text"
              name="apellido"
              value={form.apellido}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "10px",
                border: fieldErrors.apellido ? "2px solid #dc3545" : "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
                fontSize: "0.95em",
                transition: "border-color 0.3s",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>Email *</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "10px",
                border: fieldErrors.email ? "2px solid #dc3545" : "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
                fontSize: "0.95em",
                transition: "border-color 0.3s",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>Teléfono</label>
            <input
              type="text"
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
                border: fieldErrors.telefono ? "2px solid #dc3545" : "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
                fontSize: "0.95em",
                transition: "border-color 0.3s",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9em", color: "#333" }}>Fecha de Nacimiento</label>
            <input
              type="date"
              name="fecha_nacimiento"
              value={form.fecha_nacimiento}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
                border: fieldErrors.fecha_nacimiento ? "2px solid #dc3545" : "1px solid #ccc",
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
            {editando ? "Guardar Cambios" : "Crear Cliente"}
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

      <h3 style={{ color: "#333" }}>Padrón de Clientes</h3>
      {loading ? (
        <p>Cargando clientes...</p>
      ) : (
        <div style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", minWidth: "600px", borderCollapse: "collapse", textAlign: "left", backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>ID</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Documento</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Nombre y Apellido</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Email</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Teléfono</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Estado</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #eaeaea", color: "#495057", fontWeight: "bold" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: "12px", borderBottom: "1px solid #eaeaea", textAlign: "center" }}>No hay clientes registrados.</td></tr>
              ) : (
                clientes.map((c) => (
                  <tr key={c.id} style={{ backgroundColor: c.activo ? "#ffffff" : "#fff5f5" }}>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>{c.id}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>{c.documento}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>{c.nombre} {c.apellido}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>{c.email}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>{c.telefono || "-"}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          color: c.activo ? "#155724" : "#721c24",
                          backgroundColor: c.activo ? "#d4edda" : "#f8d7da",
                          fontSize: "12px",
                          fontWeight: "bold",
                          display: "inline-block",
                        }}
                      >
                        {c.activo ? "ACTIVO" : "INACTIVO"}
                      </span>
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eaeaea", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          onClick={() => handleEdit(c)}
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
                        {c.activo && (
                          <button
                            onClick={() => handleBajaLogica(c.id)}
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

export default Clientes;