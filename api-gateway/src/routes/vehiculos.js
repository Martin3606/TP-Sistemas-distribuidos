const express = require('express');
const router = express.Router();
const { vehicleClient, customerClient, call } = require('../grpc/clients');
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
    const payload = {
        patente: req.body.patente || '',
        ...datosVehiculo(req.body)
    };
    
    const r = await call(vehicleClient, 'CreateVehicle', payload);
    res.status(201).json(vehiculoRest(r.vehiculo));
}));

// PUT /api/vehiculos/:id (solo Admin)
router.put('/:id', requireAdmin, handler(async (req, res) => {
    const id = idParam(req);
    const actual = (await call(vehicleClient, 'GetVehicle', { id })).vehiculo;
    const activo = typeof req.body.activo === 'boolean' ? req.body.activo : actual.activo;
    
    const payload = { id, ...datosVehiculo(req.body), activo };

    const r = await call(vehicleClient, 'UpdateVehicle', payload);
    res.json(vehiculoRest(r.vehiculo));
}));
// DELETE /api/vehiculos/:id (baja lógica, solo Admin)
router.delete('/:id', requireAdmin, handler(async (req, res) => {
    const r = await call(vehicleClient, 'DeactivateVehicle', { id: idParam(req) });
    res.json(vehiculoRest(r.vehiculo));
}));


// ==========================================
// NUEVAS RUTAS HITO 3: VEHÍCULOS EXTERNOS
// ==========================================

// GET /api/vehiculos/externos/solicitudes
// Devuelve las solicitudes de incorporación de vehículos del cliente logueado
router.get('/externos/solicitudes', requireAuth, handler(async (req, res) => {
    const clienteId = req.user.cliente_id;
    if (!clienteId) {
        throw new HttpError(403, 'Solo los clientes registrados pueden consultar sus vehículos');
    }

    // Llamamos al Vehicle Service usando el método definido en vehicle.proto
    const response = await call(vehicleClient, 'ListExternalVehicleRequests', { cliente_id: clienteId });
    
    // Mapeamos la respuesta para devolver un JSON limpio al frontend
    const solicitudesRest = (response.solicitudes || []).map(solicitud => ({
        id: solicitud.id,
        patente: solicitud.patente,
        marca: solicitud.marca,
        modelo: solicitud.modelo,
        anio: solicitud.anio,
        estado: solicitud.estado,
        resultado_patente: solicitud.resultado_patente,
        resultado_titularidad: solicitud.resultado_titularidad,
        vehiculo_id: solicitud.vehiculo_id
    }));

    res.json(solicitudesRest);
}));

// POST /api/vehiculos/externos
// Permite a un cliente solicitar el alta de su vehículo en la plataforma
router.post('/externos', requireAuth, handler(async (req, res) => {
    const clienteId = req.user.cliente_id;
    if (!clienteId) {
        throw new HttpError(403, 'Solo los clientes registrados pueden dar de alta un vehículo');
    }

    if (!req.body.patente) {
        throw new HttpError(400, 'La patente es requerida');
    }

    // 1. Obtener el DNI del cliente desde el Customer Service
    const customerData = await call(customerClient, 'GetCustomer', { id: clienteId });
    const dniTitular = customerData.cliente.documento;
    
    if (!dniTitular) {
        throw new HttpError(500, 'El cliente no tiene un documento registrado válido');
    }

    // 2. Armar la solicitud usando la función datosVehiculo para reusar las validaciones
    const datosProcesados = datosVehiculo(req.body);
    
    const requestArgs = {
        cliente_id: clienteId,
        documento: dniTitular,
        patente: req.body.patente,
        ...datosProcesados
    };

    // 3. Llamar al Vehicle Service para registrar la solicitud asíncrona
    const response = await call(vehicleClient, 'RegisterExternalVehicle', requestArgs);

    // Devolvemos el estado al frontend
    res.status(201).json({
        mensaje: 'Solicitud de verificación registrada exitosamente',
        solicitud_id: response.solicitud.id,
        estado: response.solicitud.estado
    });
}));

module.exports = router;