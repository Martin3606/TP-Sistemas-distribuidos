import { useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import "./ClientePages.css";

const API_REST = "http://localhost:8000";
const API_GRAPHQL = "http://localhost:8080/graphql";
const QUERY_MIS_RESERVAS = `query ConsultarReservas($filtro: FiltroReservaInput) { consultarReservas(filtro: $filtro) { id vehiculo { id patente marca modelo } fechaInicio fechaFin importeTotal estado cantidadDias } }`;
const formatDate = (date) => new Date(date).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

function MisReservas() {
  const { clienteId, setClienteId } = useAuth();
  const [vehiculoId, setVehiculoId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [reservas, setReservas] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [buscado, setBuscado] = useState(false);

  async function buscarMisReservas() {
    if (!clienteId) return;
    setError(""); setCargando(true); setBuscado(true);
    try {
      const respuesta = await fetch(API_GRAPHQL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: QUERY_MIS_RESERVAS, variables: { filtro: { clienteId: Number(clienteId) } } }) });
      const datos = await respuesta.json();
      if (datos.errors) throw new Error(datos.errors[0].message);
      setReservas(datos.data.consultarReservas);
    } catch (err) { setError(`No se pudo consultar tus reservas. (${err.message})`); } finally { setCargando(false); }
  }

  async function handleSubmit(evento) {
    evento.preventDefault(); setError(""); setCargando(true);
    try {
      const respuesta = await fetch(`${API_REST}/reservas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cliente_id: Number(clienteId), vehiculo_id: Number(vehiculoId), fecha_inicio: fechaInicio, fecha_fin: fechaFin }) });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.detail || "No se pudo crear la reserva");
      setReservas((previas) => [...previas, { id: datos.id, vehiculo: { id: datos.vehiculo_id, marca: "Vehículo", modelo: `#${datos.vehiculo_id}`, patente: "" }, fechaInicio: datos.fecha_inicio, fechaFin: datos.fecha_fin, importeTotal: datos.importe_total, estado: datos.estado, cantidadDias: null }]);
      setVehiculoId(""); setFechaInicio(""); setFechaFin(""); setBuscado(true);
    } catch (err) { setError(err.message); } finally { setCargando(false); }
  }

  async function cancelarReserva(id) {
    setError("");
    try {
      const respuesta = await fetch(`${API_REST}/reservas/${id}/cancelar`, { method: "PATCH" });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.detail || "No se pudo cancelar la reserva");
      setReservas((previas) => previas.map((reserva) => reserva.id === id ? { ...reserva, estado: datos.estado } : reserva));
    } catch (err) { setError(err.message); }
  }

  return <section className="cliente-panel">
    <div className="page-heading"><p className="eyebrow">Administrá tu viaje</p><h1>Mis reservas</h1><p>Consultá tus próximas reservas, creá una nueva o cancelala antes de su inicio.</p></div>
    <div className="form-cliente form-cliente--compact"><div className="form-cliente__campo"><label htmlFor="clienteId">Identificador de cliente</label><input id="clienteId" type="number" value={clienteId || ""} onChange={(e) => setClienteId(e.target.value)} required /></div><button className="button" type="button" onClick={buscarMisReservas} disabled={cargando}>{cargando ? "Buscando..." : "Ver mis reservas"}</button></div>
    <div className="section-heading"><h2>Nueva reserva</h2><p>Ingresá el vehículo elegido y las fechas de alquiler.</p></div>
    <form onSubmit={handleSubmit} className="form-cliente form-cliente--booking"><div className="form-cliente__campo"><label htmlFor="vehiculoId">Identificador del vehículo</label><input id="vehiculoId" type="number" value={vehiculoId} onChange={(e) => setVehiculoId(e.target.value)} required /></div><div className="form-cliente__campo"><label htmlFor="fechaInicio">Desde</label><input id="fechaInicio" type="datetime-local" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} required /></div><div className="form-cliente__campo"><label htmlFor="fechaFin">Hasta</label><input id="fechaFin" type="datetime-local" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} required /></div><button className="button" type="submit" disabled={cargando || !clienteId}>{cargando ? "Reservando..." : "Confirmar reserva"}</button></form>
    {error && <p className="error-cliente">{error}</p>}
    {buscado && !error && reservas.length === 0 && <div className="empty-state"><span>▣</span><h2>Todavía no tenés reservas</h2><p>Consultá el catálogo y reservá el vehículo ideal para tu viaje.</p></div>}
    {reservas.length > 0 && <div className="tabla-contenedor"><table className="tabla-cliente"><thead><tr><th>Reserva</th><th>Vehículo</th><th>Desde</th><th>Hasta</th><th>Días</th><th>Importe</th><th>Estado</th><th></th></tr></thead><tbody>{reservas.map((r) => <tr key={r.id}><td>#{r.id}</td><td><strong>{r.vehiculo.marca} {r.vehiculo.modelo}</strong><small>{r.vehiculo.patente}</small></td><td>{formatDate(r.fechaInicio)}</td><td>{formatDate(r.fechaFin)}</td><td>{r.cantidadDias ?? "–"}</td><td>${r.importeTotal}</td><td><span className={`estado estado--${r.estado.toLowerCase()}`}>{r.estado}</span></td><td>{r.estado === "CONFIRMADA" && <button className="button button--danger button--small" onClick={() => cancelarReserva(r.id)}>Cancelar</button>}</td></tr>)}</tbody></table></div>}
  </section>;
}

export default MisReservas;
