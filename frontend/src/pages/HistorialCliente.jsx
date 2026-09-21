import { useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import "./ClientePages.css";

const API_GRAPHQL = "http://localhost:8080/graphql";
const QUERY_HISTORIAL = `query HistorialAlquileres($clienteId: ID!) { historialAlquileres(clienteId: $clienteId) { id vehiculo { patente marca modelo } fechaInicio fechaFin importeTotal estado cantidadDias } }`;
const formatDate = (date) => new Date(date).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

function HistorialCliente() {
  const { clienteId, setClienteId } = useAuth();
  const [historial, setHistorial] = useState([]); const [error, setError] = useState(""); const [cargando, setCargando] = useState(false); const [buscado, setBuscado] = useState(false);
  async function buscar(evento) { evento.preventDefault(); if (!clienteId) return; setError(""); setCargando(true); setBuscado(true); try { const respuesta = await fetch(API_GRAPHQL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: QUERY_HISTORIAL, variables: { clienteId } }) }); const datos = await respuesta.json(); if (datos.errors) throw new Error(datos.errors[0].message); setHistorial(datos.data.historialAlquileres); } catch (err) { setError(`No se pudo consultar el historial. (${err.message})`); } finally { setCargando(false); } }
  return <section className="cliente-panel"><div className="page-heading"><p className="eyebrow">Tus viajes anteriores</p><h1>Historial de alquileres</h1><p>Consultá las reservas canceladas y los alquileres que ya finalizaste.</p></div><form onSubmit={buscar} className="form-cliente form-cliente--compact"><div className="form-cliente__campo"><label htmlFor="clienteIdHistorial">Identificador de cliente</label><input id="clienteIdHistorial" type="number" value={clienteId || ""} onChange={(e) => setClienteId(e.target.value)} required /></div><button className="button" type="submit" disabled={cargando}>{cargando ? "Buscando..." : "Ver historial"}</button></form>{error && <p className="error-cliente">{error}</p>}{buscado && !error && historial.length === 0 && <div className="empty-state"><span>◷</span><h2>Sin historial todavía</h2><p>Cuando finalices o canceles una reserva, aparecerá en esta sección.</p></div>}{historial.length > 0 && <div className="tabla-contenedor"><table className="tabla-cliente"><thead><tr><th>Reserva</th><th>Vehículo</th><th>Desde</th><th>Hasta</th><th>Días</th><th>Importe</th><th>Estado</th></tr></thead><tbody>{historial.map((h) => <tr key={h.id}><td>#{h.id}</td><td><strong>{h.vehiculo.marca} {h.vehiculo.modelo}</strong><small>{h.vehiculo.patente}</small></td><td>{formatDate(h.fechaInicio)}</td><td>{formatDate(h.fechaFin)}</td><td>{h.cantidadDias}</td><td>${h.importeTotal}</td><td><span className={`estado estado--${h.estado.toLowerCase()}`}>{h.estado}</span></td></tr>)}</tbody></table></div>}</section>;
}
export default HistorialCliente;
