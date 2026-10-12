const { GraphQLError } = require('graphql');
const { vehicleClient, customerClient, rentalClient, call } = require('../grpc/clients');
const { describir, HttpError } = require('../utils/errors');
const { esCliente } = require('../utils/auth');
const {
    aCentavos, tipoAProto, parsearFecha, aTimestamp, deTimestamp,
    vehiculoGql, clienteGql, reservaGql
} = require('../utils/mappers');

const CODIGOS = { 400: 'BAD_USER_INPUT', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND' };

/** Exige sesión y traduce cualquier error (gRPC o de negocio) a GraphQLError. */
const protegido = (fn) => async (parent, args, ctx, info) => {
    try {
        if (!ctx.user) throw new HttpError(401, ctx.authError || 'Se requiere token de autenticación (Bearer Token)');
        return await fn(parent, args, ctx, info);
    } catch (err) {
        if (err instanceof GraphQLError) throw err;
        const { status, message } = describir(err);
        if (status >= 500) console.error('[gateway][graphql] error:', err);
        throw new GraphQLError(message, { extensions: { code: CODIGOS[status] || 'INTERNAL_SERVER_ERROR' } });
    }
};

// Catálogo de vehículos cacheado por request (evita N llamadas al armar reservas)
const vehiculosPorId = (ctx) => {
    if (!ctx.cache.vehiculos) {
        ctx.cache.vehiculos = call(vehicleClient, 'ListVehicles', { solo_activos: false })
            .then((r) => new Map((r.vehiculos || []).map((v) => [Number(v.id), vehiculoGql(v)])));
    }
    return ctx.cache.vehiculos;
};

const reservasDeCliente = async (clienteId) => {
    const r = await call(rentalClient, 'ListRentalsByCustomer', { cliente_id: clienteId });
    return (r.rentals || []).map(reservaGql);
};

const resolvers = {
    Query: {
        health: () => 'OK',

        // Req. 2: vehículos activos y libres en el período (Vehicle + Rental)
        consultarDisponibilidad: protegido(async (_, { filtro }) => {
            const inicio = parsearFecha(filtro.fechaInicio, 'fecha de inicio');
            const fin = parsearFecha(filtro.fechaFin, 'fecha de finalización');
            if (fin <= inicio) {
                throw new HttpError(400, 'La fecha de finalización debe ser posterior a la fecha de inicio.');
            }

            const filtros = {};
            if (filtro.tipoVehiculo) filtros.tipo_vehiculo = tipoAProto(filtro.tipoVehiculo);
            if (filtro.marca) filtros.marca = filtro.marca;
            if (filtro.modelo) filtros.modelo = filtro.modelo;
            if (filtro.precioMin != null) filtros.precio_min_centavos = aCentavos(filtro.precioMin);
            if (filtro.precioMax != null) filtros.precio_max_centavos = aCentavos(filtro.precioMax);

            // 1) Vehicle Service: candidatos activos que cumplen los filtros
            const candidatos = (await call(vehicleClient, 'CheckAvailability', {
                fecha_inicio: aTimestamp(inicio), fecha_fin: aTimestamp(fin), filtros
            })).vehiculos || [];

            // 2) Rental Service: descarta los que tienen reservas solapadas
            const libres = await Promise.all(candidatos.map(async (v) => {
                const r = await call(rentalClient, 'CheckAvailability', {
                    vehiculo_id: v.id, fecha_inicio: aTimestamp(inicio), fecha_fin: aTimestamp(fin)
                });
                return r.disponible ? vehiculoGql(v) : null;
            }));
            return libres.filter(Boolean);
        }),

        // Req. 7: historial de un cliente (un CLIENTE solo ve el suyo)
        historialAlquileres: protegido(async (_, { clienteId }, ctx) => {
            const objetivo = esCliente(ctx.user) ? ctx.user.cliente_id : Number(clienteId);
            if (!objetivo) return [];
            return reservasDeCliente(objetivo);
        }),

        // Req. 5: consulta de reservas con filtros opcionales
        consultarReservas: protegido(async (_, { filtro }, ctx) => {
            const f = filtro || {};
            let clienteId = f.clienteId ? Number(f.clienteId) : null;
            if (esCliente(ctx.user)) clienteId = ctx.user.cliente_id;

            let reservas;
            if (clienteId) {
                reservas = await reservasDeCliente(clienteId);
            } else {
                const clientes = (await call(customerClient, 'ListCustomers', { solo_activos: false })).clientes || [];
                reservas = (await Promise.all(clientes.map((c) => reservasDeCliente(c.id)))).flat();
                reservas.sort((a, b) => (a.fechaInicio < b.fechaInicio ? 1 : -1));
            }

            if (f.vehiculoId) reservas = reservas.filter((r) => String(r.vehiculoId) === String(f.vehiculoId));
            if (f.estado) reservas = reservas.filter((r) => r.estado === f.estado);
            if (f.fechaInicioDesde) {
                const d = deTimestamp(aTimestamp(parsearFecha(f.fechaInicioDesde, 'fecha desde')));
                reservas = reservas.filter((r) => r.fechaInicio >= d);
            }
            if (f.fechaFinHasta) {
                const h = deTimestamp(aTimestamp(parsearFecha(f.fechaFinHasta, 'fecha hasta')));
                reservas = reservas.filter((r) => r.fechaFin <= h);
            }
            if (f.tipoVehiculo) {
                const mapa = await vehiculosPorId(ctx);
                reservas = reservas.filter((r) => mapa.get(Number(r.vehiculoId))?.tipoVehiculo === f.tipoVehiculo);
            }
            return reservas;
        })
    },

    // Los datos de vehículo y cliente se piden a sus servicios solo si el frontend los solicita
    Reserva: {
        vehiculo: protegido(async (r, _, ctx) => {
            const mapa = await vehiculosPorId(ctx);
            const v = mapa.get(Number(r.vehiculoId));
            if (v) return v;
            return vehiculoGql((await call(vehicleClient, 'GetVehicle', { id: r.vehiculoId })).vehiculo);
        }),
        cliente: protegido(async (r) => clienteGql((await call(customerClient, 'GetCustomer', { id: r.clienteId })).cliente))
    }
};

module.exports = resolvers;
