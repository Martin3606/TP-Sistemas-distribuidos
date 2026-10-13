const express = require('express');
const router = express.Router();
const { customerClient, vehicleClient, rentalClient, call } = require('../grpc/clients');
const { handler, HttpError } = require('../utils/errors');
const { requireAuth, esCliente } = require('../utils/auth');
const { parsearFecha, aTimestamp, reservaRest, vehiculoRest } = require('../utils/mappers');

/** Paso 1 del flujo: ¿qué cliente reserva? (Customer Service) */
async function resolverCliente(user, body) {
    if (esCliente(user)) {
        if (!user.cliente_id) throw new HttpError(403, 'Su usuario no tiene un cliente asociado');
        if (body.cliente_id && Number(body.cliente_id) !== user.cliente_id) {
            throw new HttpError(403, 'No está autorizado para crear reservas en nombre de otro cliente');
        }
        const propio = (await call(customerClient, 'GetCustomer', { id: user.cliente_id })).cliente;
        if (body.documento && String(body.documento).trim() !== propio.documento) {
            throw new HttpError(403, 'No está autorizado para crear reservas en nombre de otro cliente');
        }
        return propio;
    }
    if (body.documento) {
        return (await call(customerClient, 'GetCustomerByDocument', { documento: String(body.documento).trim() })).cliente;
    }
    if (body.cliente_id) {
        return (await call(customerClient, 'GetCustomer', { id: Number(body.cliente_id) })).cliente;
    }
    throw new HttpError(404, 'No se encontró ningún cliente registrado para asociar a la reserva');
}

/** Paso 2 del flujo: ¿qué vehículo? (Vehicle Service) */
async function resolverVehiculo(body) {
    if (body.patente) {
        return (await call(vehicleClient, 'GetVehicleByPlate', { patente: String(body.patente) })).vehiculo;
    }
    if (body.vehiculo_id) {
        return (await call(vehicleClient, 'GetVehicle', { id: Number(body.vehiculo_id) })).vehiculo;
    }
    throw new HttpError(404, 'No se encontró el vehículo especificado');
}

// POST /api/reservas - Orquestación: Customer -> Vehicle -> Rental
router.post('/', requireAuth, handler(async (req, res) => {
    const body = req.body || {};

    // 1. Identificamos al cliente (y obtenemos su ID y datos para la respuesta final)
    const cliente = await resolverCliente(req.user, body);

    // --- REQUERIMIENTO CÁTEDRA: Validaciones con RPC booleanos separados ---
    
    // Paso 1a: Validar explícitamente que el cliente exista en la base de datos
    const checkExistencia = await call(customerClient, 'CheckCustomerExists', { id: cliente.id });
    if (!checkExistencia.existe) {
        throw new HttpError(404, 'Validación RPC: El cliente no existe en la base de datos');
    }

    // Paso 1b: Validar explícitamente que el cliente esté activo
    const checkActivo = await call(customerClient, 'IsCustomerActive', { id: cliente.id });
    if (!checkActivo.activo) {
        throw new HttpError(400, 'Validación RPC: El cliente se encuentra inactivo y no puede realizar alquileres');
    }
    // ----------------------------------------------------------------------

    const vehiculo = await resolverVehiculo(body);
    if (!vehiculo.activo) {
        throw new HttpError(400, 'El vehículo se encuentra inactivo y no está disponible para alquiler');
    }
    if (String(vehiculo.estado) !== 'VEHICLE_STATUS_DISPONIBLE') {
        throw new HttpError(400, 'El vehículo no se encuentra disponible para alquiler');
    }

    const inicio = parsearFecha(body.fecha_inicio, 'fecha de inicio');
    const fin = parsearFecha(body.fecha_fin, 'fecha de finalización');

    // Rental Service valida fechas, solapamientos y calcula el importe
    const r = await call(rentalClient, 'CreateRental', {
        cliente_id: cliente.id,
        vehiculo_id: vehiculo.id,
        fecha_inicio: aTimestamp(inicio),
        fecha_fin: aTimestamp(fin),
        precio_diario_snapshot_centavos: vehiculo.precio_diario_centavos
    });

    res.status(201).json({
        ...reservaRest(r.rental),
        vehiculo: vehiculoRest(vehiculo),
        cliente: { id: cliente.id, documento: cliente.documento, nombre: cliente.nombre, apellido: cliente.apellido }
    });
}));

// PATCH /api/reservas/:id/cancelar
router.patch('/:id/cancelar', requireAuth, handler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) throw new HttpError(400, 'El identificador es inválido');

    const reserva = (await call(rentalClient, 'GetRentalById', { id })).rental;
    if (esCliente(req.user) && reserva.cliente_id !== req.user.cliente_id) {
        throw new HttpError(403, 'No está autorizado para cancelar la reserva de otro cliente');
    }

    const r = await call(rentalClient, 'CancelRental', { id });
    res.json(reservaRest(r.rental));
}));

module.exports = router;
