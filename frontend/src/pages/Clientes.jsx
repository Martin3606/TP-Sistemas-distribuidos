import { useEffect, useState } from "react";
import SearchBar from "../components/SearchBar.jsx";
import "./AdminPages.css";

const API_REST = "http://localhost:8000";
const emptyForm = {
  documento: "", nombre: "", apellido: "", email: "",
  telefono: "", fecha_nacimiento: ""
};

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editandoId, setEditandoId] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function cargar() {
    setCargando(true); setError("");
    try {
      const r = await fetch(`${API_REST}/api/clientes`);
      const datos = await r.json();
      if (!r.ok) throw new Error(datos.detail || "No se pudo cargar la lista");
      setClientes(datos);
    } catch (err) { setError(err.message); }
    finally { setCargando(false); }
  }

  useEffect(() => { cargar(); }, []);

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function guardar(e) {
    e.preventDefault();
    setError(""); setMensaje("");
    // fecha_nacimiento vacía no debe viajar como "" al backend
    const payload = { ...form };
    if (!payload.fecha_nacimiento) delete payload.fecha_nacimiento;
    if (!payload.telefono) delete payload.telefono;

    try {
      const url = editandoId
        ? `${API_REST}/api/clientes/${editandoId}`
        : `${API_REST}/api/clientes`;
      const metodo = editandoId ? "PUT" : "POST";
      const r = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const datos = await r.json();
      if (!r.ok) throw new Error(datos.detail || "No se pudo guardar");
      setMensaje(editandoId ? "Cliente actualizado." : "Cliente creado.");
      setForm(emptyForm);
      setEditandoId(null);
      cargar();
    } catch (err) { setError(err.message); }
  }

  function editar(c) {
    setEditandoId(c.id);
    setForm({
      documento: c.documento || "",
      nombre: c.nombre || "",
      apellido: c.apellido || "",
      email: c.email || "",
      telefono: c.telefono || "",
      fecha_nacimiento: c.fecha_nacimiento || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function darDeBaja(id) {
    if (!confirm("¿Confirmás la baja lógica de este cliente?")) return;
    setError(""); setMensaje("");
    try {
      const r = await fetch(`${API_REST}/api/clientes/${id}`, { method: "DELETE" });
      const datos = await r.json();
      if (!r.ok) throw new Error(datos.detail || "No se pudo dar de baja");
      setMensaje("Cliente dado de baja.");
      cargar();
    } catch (err) { setError(err.message); }
  }

  const filtrados = clientes.filter((c) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return [c.documento, c.nombre, c.apellido, c.email]
      .some((campo) => String(campo).toLowerCase().includes(q));
  });

  return (
    <section className="admin-panel">
      <div className="page-heading">
        <p className="eyebrow">Administración</p>
        <h1>Clientes</h1>
        <p>Alta, baja y modificación de los clientes registrados.</p>
      </div>

      <div className="section-heading">
        <h2>{editandoId ? `Editando cliente #${editandoId}` : "Nuevo cliente"}</h2>
        <p>Completá los datos y guardá los cambios.</p>
      </div>

      <form onSubmit={guardar} className="form-admin">
        <div className="form-admin__campo">
          <label>Documento</label>
          <input name="documento" value={form.documento} onChange={onChange} required />
        </div>
        <div className="form-admin__campo">
          <label>Nombre</label>
          <input name="nombre" value={form.nombre} onChange={onChange} required />
        </div>
        <div className="form-admin__campo">
          <label>Apellido</label>
          <input name="apellido" value={form.apellido} onChange={onChange} required />
        </div>
        <div className="form-admin__campo">
          <label>Email</label>
          <input name="email" type="email" value={form.email} onChange={onChange} required />
        </div>
        <div className="form-admin__campo">
          <label>Teléfono</label>
          <input name="telefono" value={form.telefono} onChange={onChange} />
        </div>
        <div className="form-admin__campo">
          <label>Fecha de nacimiento</label>
          <input name="fecha_nacimiento" type="date"
                 value={form.fecha_nacimiento} onChange={onChange} />
        </div>
        <button className="button" type="submit">
          {editandoId ? "Guardar cambios" : "Crear cliente"}
        </button>
        {editandoId && (
          <button type="button" className="button button--danger"
                  onClick={() => { setEditandoId(null); setForm(emptyForm); }}>
            Cancelar edición
          </button>
        )}
      </form>

      {error && <p className="error-cliente">{error}</p>}
      {mensaje && <p className="success-cliente">{mensaje}</p>}

      <div className="section-heading">
        <h2>Listado</h2>
        <p>Buscá por documento, nombre, apellido o email.</p>
      </div>

      <SearchBar
        value={busqueda}
        onChange={setBusqueda}
        placeholder="Buscar cliente..."
      />

      {cargando && <p>Cargando...</p>}

      {!cargando && filtrados.length === 0 && (
        <div className="empty-state">
          <span>◉</span>
          <h2>Sin resultados</h2>
          <p>No hay clientes que coincidan con la búsqueda.</p>
        </div>
      )}

      {filtrados.length > 0 && (
        <div className="tabla-contenedor">
          <table className="tabla-cliente">
            <thead>
              <tr>
                <th>ID</th><th>Documento</th><th>Nombre</th>
                <th>Email</th><th>Teléfono</th><th>Activo</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id}>
                  <td>#{c.id}</td>
                  <td>{c.documento}</td>
                  <td><strong>{c.nombre} {c.apellido}</strong></td>
                  <td>{c.email}</td>
                  <td>{c.telefono || "—"}</td>
                  <td>
                    <span className={`estado estado--${c.activo ? "activo" : "inactivo"}`}>
                      {c.activo ? "ACTIVO" : "INACTIVO"}
                    </span>
                  </td>
                  <td>
                    <button className="button button--small" onClick={() => editar(c)}>
                      Editar
                    </button>{" "}
                    {c.activo && (
                      <button className="button button--danger button--small"
                              onClick={() => darDeBaja(c.id)}>
                        Baja
                      </button>
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

export default Clientes;