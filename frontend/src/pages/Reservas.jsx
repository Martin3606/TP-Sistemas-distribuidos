import { useState } from "react";
import SearchBar from "../components/SearchBar.jsx";
import "./AdminPages.css";

const API_REST = "http://localhost:8000";
const API_GRAPHQL = "http://localhost:8080/graphql";

const QUERY_RESERVAS = `
  query ConsultarReservas($filtro: FiltroReservaInput) {
    consultarReservas(filtro: $filtro) {
      id
      clienteId
      vehiculo { id patente marca modelo }
      fechaInicio fechaFin importeTotal estado cantidadDias
    }
  }
`;

const formatDate = (d) =>
  new Date(d).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

function Reservas() {
  const [reservas, setReservas] = useState([]);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [nueva, setNueva] = useState({
    cliente_id: "", vehiculo_id: "", fecha_inicio: "", fecha_fin: ""
  });
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [buscado, setBuscado] = useState(false);

  async function listar() {
    setError(""); setCargando(true); setBuscado(true);
    try {
      const variables = filtroCliente
        ? { filtro: { clienteId: Number(filtroCliente) } }
        : {};
      const r = await fetch(API_GRAPHQL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: QUERY_RESERVAS, variables }),
      });
      const datos = await r.json();
      if (datos.errors) throw new Error(datos.errors[0].message);
      setReservas(datos.data.consultarReservas);
    } catch (err) {
      setError(`No se pudieron consultar las reservas. (${err.message})`);
    } finally { setCargando(false); }
  }

  async function crear(e) {
    e.preventDefault();
    setError(""); setMensaje(""); setCargando(true);
    try {
      const r = await fetch(`${API_REST}/reservas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: Number(nueva.cliente_id),
          vehiculo_id: Number(nueva.vehiculo_id),
          fecha_inicio: nueva.fecha_inicio,
          fecha_fin: nueva.fecha_fin,
        }),
      });
      const datos = await r.json();
      if (!r.ok) throw new Error(datos.detail || "No se pudo crear la reserva");
      setMensaje("Reserva creada.");
      setNueva({ cliente_id: "", vehiculo_id: "", fecha_inicio: "", fecha_fin: "" });
      listar();
    } catch (err) { setError(err.message); }
    finally { setCargando(false); }
  }

  async function cancelar(id) {
    if (!confirm(`¿Cancelar la reserva #${id}?`)) return;
    setError(""); setMensaje("");
    try {
      const r = await fetch(`${API_REST}/reservas/${id}/cancelar`, { method: "PATCH" });
      const datos = await r.json();
      if (!r.ok) throw new Error(datos.detail || "No se pudo cancelar");
      setReservas((prev) =>
        prev.map((x) => (x.id === id ? { ...x, estado: datos.estado } : x))
      );
      setMensaje("Reserva cancelada.");
    } catch (err) { setError(err.message); }
  }

  const filtradas = reservas.filter((r) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return [
      r.id, r.estado, r.vehiculo?.patente,
      r.vehiculo?.marca, r.vehiculo?.modelo,
    ].some((c) => String(c ?? "").toLowerCase().includes(q));
  });

  return (
    <section className="admin-panel">
      <div className="page-heading">
        <p className="eyebrow">Administración</p>
        <h1>Reservas</h1>
        <p>Creá reservas, listalas por cliente y cancelá las que todavía no comenzaron.</p>
      </div>

      <div className="section-heading">
        <h2>Nueva reserva</h2>
        <p>Indicá cliente, vehículo y el rango de fechas.</p>
      </div>

      <form onSubmit={crear} className="form-admin">
        <div className="form-admin__campo">
          <label>ID cliente</label>
          <input type="number" value={nueva.cliente_id}
                 onChange={(e) => setNueva({ ...nueva, cliente_id: e.target.value })} required />
        </div>
        <div className="form-admin__campo">
          <label>ID vehículo</label>
          <input type="number" value={nueva.vehiculo_id}
                 onChange={(e) => setNueva({ ...nueva, vehiculo_id: e.target.value })} required />
        </div>
        <div className="form-admin__campo">
          <label>Desde</label>
          <input type="datetime-local" value={nueva.fecha_inicio}
                 onChange={(e) => setNueva({ ...nueva, fecha_inicio: e.target.value })} required />
        </div>
        <div className="form-admin__campo">
          <label>Hasta</label>
          <input type="datetime-local" value={nueva.fecha_fin}
                 onChange={(e) => setNueva({ ...nueva, fecha_fin: e.target.value })} required />
        </div>
        <button className="button" type="submit" disabled={cargando}>
          {cargando ? "Guardando..." : "Crear reserva"}
        </button>
      </form>

      {error && <p className="error-cliente">{error}</p>}
      {mensaje && <p className="success-cliente">{mensaje}</p>}

      <div className="section-heading">
        <h2>Listado</h2>
        <p>Podés filtrar por cliente (opcional) y buscar dentro del resultado.</p>
      </div>

      <div className="form-admin form-admin--search">
        <div className="form-admin__campo">
          <label>ID cliente (opcional)</label>
          <input type="number" value={filtroCliente}
                 onChange={(e) => setFiltroCliente(e.target.value)}
                 placeholder="Todos" />
        </div>
        <button className="button" type="button" onClick={listar} disabled={cargando}>
          {cargando ? "Cargando..." : "Listar reservas"}
        </button>
      </div>

      <SearchBar
        value={busqueda}
        onChange={setBusqueda}
        placeholder="Buscar por ID, estado, patente, marca o modelo..."
      />

      {buscado && !error && filtradas.length === 0 && (
        <div className="empty-state">
          <span>▣</span>
          <h2>Sin reservas</h2>
          <p>No hay reservas que coincidan con el filtro y la búsqueda.</p>
        </div>
      )}

      {filtradas.length > 0 && (
        <div className="tabla-contenedor">
          <table className="tabla-cliente">
            <thead>
              <tr>
                <th>Reserva</th><th>Cliente</th><th>Vehículo</th>
                <th>Desde</th><th>Hasta</th><th>Días</th>
                <th>Importe</th><th>Estado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((r) => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td>#{r.clienteId}</td>
                  <td>
                    <strong>{r.vehiculo.marca} {r.vehiculo.modelo}</strong>
                    <small>{r.vehiculo.patente}</small>
                  </td>
                  <td>{formatDate(r.fechaInicio)}</td>
                  <td>{formatDate(r.fechaFin)}</td>
                  <td>{r.cantidadDias ?? "–"}</td>
                  <td>${r.importeTotal}</td>
                  <td>
                    <span className={`estado estado--${r.estado.toLowerCase()}`}>
                      {r.estado}
                    </span>
                  </td>
                  <td>
                    {r.estado === "CONFIRMADA" && (
                      <button className="button button--danger button--small"
                              onClick={() => cancelar(r.id)}>
                        Cancelar
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

export default Reservas;