// Conversión entre los mensajes gRPC (centavos, enums con prefijo, Timestamp)
// y el formato que consume el frontend (pesos, enums cortos, fechas ISO).
const { HttpError } = require('./errors');

const quitar = (valor, prefijo) => {
    const s = String(valor || '');
    // Si viene como UNSPECIFIED o vacío, devolvemos null para no ensuciar la respuesta
    if (!s || s.includes('UNSPECIFIED')) return null;
    return s.replace(prefijo, '');
};

const aPesos = (centavos) => Number(centavos || 0) / 100;
const aCentavos = (pesos) => Math.round(Number(pesos) * 100);

const TIPOS = ['SEDAN', 'SUV', 'PICKUP', 'COUPE', 'HATCHBACK'];

function tipoAProto(tipo) {
    const t = String(tipo || '').toUpperCase();
    if (!TIPOS.includes(t)) throw new HttpError(400, 'El tipo de vehículo es inválido');
    return `VEHICLE_TYPE_${t}`;
}

// ---- fechas ----
// Las fechas del usuario son "hora de pared" (sin zona). Se transportan como
// segundos tomando esa hora como UTC y se devuelven sin zona (YYYY-MM-DDTHH:mm:ss),
// así se ven igual en cualquier máquina o contenedor.
const TIENE_ZONA = /(Z|[+-]\d{2}:?\d{2})$/i;

function parsearFecha(valor, nombre = 'fecha') {
    if (!valor) throw new HttpError(400, `La ${nombre} es obligatoria`);
    let s = String(valor).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += 'T00:00:00';
    if (!TIENE_ZONA.test(s)) s += 'Z';
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) throw new HttpError(400, `La ${nombre} no tiene un formato válido`);
    return Math.floor(d.getTime() / 1000);
}

const aTimestamp = (segundos) => ({ seconds: segundos });
const deTimestamp = (ts) => (ts && ts.seconds ? new Date(Number(ts.seconds) * 1000).toISOString().slice(0, 19) : null);

function cantidadDias(inicioSeg, finSeg) {
    return Math.max(1, Math.ceil((finSeg - inicioSeg) / 86400));
}

// ---- entidades ----
function vehiculoRest(v) {
    return {
        id: v.id,
        patente: v.patente,
        marca: v.marca,
        modelo: v.modelo,
        anio: v.anio,
        color: v.color || null,
        tipo_vehiculo: quitar(v.tipo_vehiculo, 'VEHICLE_TYPE_'),
        precio_diario: aPesos(v.precio_diario_centavos),
        precio_diario_centavos: Number(v.precio_diario_centavos),
        estado: quitar(v.estado, 'VEHICLE_STATUS_'),
        activo: !!v.activo,
        // NUEVOS CAMPOS HITO 3
        origen: quitar(v.origen, 'VEHICLE_ORIGIN_'),
        resultado_verificacion: quitar(v.resultado_verificacion, 'VEHICLE_VERIFICATION_RESULT_'),
        inhabilitado_por_robo: !!v.inhabilitado_por_robo
    };
}

function vehiculoGql(v) {
    return {
        id: v.id,
        patente: v.patente,
        marca: v.marca,
        modelo: v.modelo,
        anio: v.anio,
        color: v.color || null,
        tipoVehiculo: quitar(v.tipo_vehiculo, 'VEHICLE_TYPE_'),
        precioDiario: aPesos(v.precio_diario_centavos),
        estado: quitar(v.estado, 'VEHICLE_STATUS_'),
        activo: !!v.activo,
        // NUEVOS CAMPOS HITO 3
        origen: quitar(v.origen, 'VEHICLE_ORIGIN_'),
        resultadoVerificacion: quitar(v.resultado_verificacion, 'VEHICLE_VERIFICATION_RESULT_'),
        inhabilitadoPorRobo: !!v.inhabilitado_por_robo
    };
}

function clienteRest(c) {
    return {
        id: c.id,
        documento: c.documento,
        nombre: c.nombre,
        apellido: c.apellido,
        email: c.email,
        telefono: c.telefono || null,
        fecha_nacimiento: c.fecha_nacimiento || null,
        activo: !!c.activo
    };
}

function clienteGql(c) {
    const r = clienteRest(c);
    return { ...r, fechaNacimiento: r.fecha_nacimiento };
}

function reservaRest(r) {
    const ini = r.fecha_inicio ? Number(r.fecha_inicio.seconds) : 0;
    const fin = r.fecha_fin ? Number(r.fecha_fin.seconds) : 0;
    return {
        id: r.id,
        cliente_id: r.cliente_id,
        vehiculo_id: r.vehiculo_id,
        fecha_inicio: deTimestamp(r.fecha_inicio),
        fecha_fin: deTimestamp(r.fecha_fin),
        precio_diario_snapshot: aPesos(r.precio_diario_snapshot_centavos),
        importe_total: aPesos(r.importe_total_centavos),
        estado: quitar(r.estado, 'RENTAL_STATE_'),
        cantidad_dias: cantidadDias(ini, fin),
        // NUEVO CAMPO HITO 3
        estado_mantenimiento: quitar(r.estado_mantenimiento, 'MAINTENANCE_STATUS_')
    };
}

function reservaGql(r) {
    const x = reservaRest(r);
    return {
        id: x.id,
        clienteId: x.cliente_id,
        vehiculoId: x.vehiculo_id,
        fechaInicio: x.fecha_inicio,
        fechaFin: x.fecha_fin,
        precioDiarioSnapshot: x.precio_diario_snapshot,
        importeTotal: x.importe_total,
        estado: x.estado,
        cantidadDias: x.cantidad_dias,
        //NUEVO CAMPO HITO 3
        estadoMantenimiento: x.estado_mantenimiento
    };
}

module.exports = {
    quitar, aPesos, aCentavos, tipoAProto, parsearFecha, aTimestamp, deTimestamp, cantidadDias,
    vehiculoRest, vehiculoGql, clienteRest, clienteGql, reservaRest, reservaGql
};