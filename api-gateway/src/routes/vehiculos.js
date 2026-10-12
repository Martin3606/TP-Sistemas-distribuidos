const express = require('express');
const router = express.Router();
const { vehicleClient, call } = require('../grpc/clients');
const { handler, HttpError } = require('../utils/errors');
const { requireAuth, requireAdmin } = require('../utils/auth');
const { vehiculoRest, aCentavos, tipoAProto } = require('../utils/mappers');

const idParam = (req) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) throw new HttpError(400, 'El identificador es inválido');
    return id;
};

// Datos comunes de alta / modificación (la validación de negocio vive en Vehicle Service)
function datosVehiculo(body) {
    const precio = Number(body.precio_diario);
    if (!Number.isFinite(precio) || precio <= 0) {
        throw new HttpError(400, 'El precio diario debe ser un número positivo.');
    }
    const anio = parseInt(body.anio, 10);
    if (Number.isNaN(anio)) throw new HttpError(400, 'El año del vehículo es inválido.');
    return {
        marca: body.marca || '',
        modelo: body.modelo || '',
        anio,
        color: body.color || '',
        tipo_vehiculo: tipoAProto(body.tipo_vehiculo),
        precio_diario_centavos: aCentavos(precio)
    };
}

// GET /api/vehiculos
router.get('/', requireAuth, handler(async (req, res) => {
    const r = await call(vehicleClient, 'ListVehicles', { solo_activos: false });
    res.json((r.vehiculos || []).map(vehiculoRest));
}));

// GET /api/vehiculos/:id
router.get('/:id', requireAuth, handler(async (req, res) => {
    const r = await call(vehicleClient, 'GetVehicle', { id: idParam(req) });
    res.json(vehiculoRest(r.vehiculo));
}));

// POST /api/vehiculos (solo Admin)
router.post('/', requireAdmin, handler(async (req, res) => {
    const r = await call(vehicleClient, 'CreateVehicle', {
        patente: req.body.patente || '',
        ...datosVehiculo(req.body)
    });
    res.status(201).json(vehiculoRest(r.vehiculo));
}));

// PUT /api/vehiculos/:id (solo Admin)
router.put('/:id', requireAdmin, handler(async (req, res) => {
    const id = idParam(req);
    // El RPC siempre aplica `activo`: si no viene, se conserva el valor actual.
    const actual = (await call(vehicleClient, 'GetVehicle', { id })).vehiculo;
    const activo = typeof req.body.activo === 'boolean' ? req.body.activo : actual.activo;
    const r = await call(vehicleClient, 'UpdateVehicle', { id, ...datosVehiculo(req.body), activo });
    res.json(vehiculoRest(r.vehiculo));
}));

// DELETE /api/vehiculos/:id (baja lógica, solo Admin)
router.delete('/:id', requireAdmin, handler(async (req, res) => {
    const r = await call(vehicleClient, 'DeactivateVehicle', { id: idParam(req) });
    res.json(vehiculoRest(r.vehiculo));
}));

module.exports = router;
