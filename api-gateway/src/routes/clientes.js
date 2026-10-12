const express = require('express');
const router = express.Router();
const { customerClient, call } = require('../grpc/clients');
const { handler, HttpError } = require('../utils/errors');
const { requireAuth, requireAdmin, esCliente } = require('../utils/auth');
const { clienteRest } = require('../utils/mappers');

const idParam = (req) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) throw new HttpError(400, 'El identificador es inválido');
    return id;
};

// Un CLIENTE solo puede ver / editar su propio registro (pantalla Mi Perfil)
function validarPropietario(req, id) {
    if (esCliente(req.user) && req.user.cliente_id !== id) {
        throw new HttpError(403, 'No está autorizado para acceder a los datos de otro cliente');
    }
}

// GET /api/clientes?solo_activos=true (solo Admin)
router.get('/', requireAdmin, handler(async (req, res) => {
    const solo_activos = String(req.query.solo_activos).toLowerCase() === 'true';
    const r = await call(customerClient, 'ListCustomers', { solo_activos });
    res.json((r.clientes || []).map(clienteRest));
}));

// GET /api/clientes/:id (Admin o el propio cliente)
router.get('/:id', requireAuth, handler(async (req, res) => {
    const id = idParam(req);
    validarPropietario(req, id);
    const r = await call(customerClient, 'GetCustomer', { id });
    res.json(clienteRest(r.cliente));
}));

// POST /api/clientes (solo Admin)
router.post('/', requireAdmin, handler(async (req, res) => {
    const b = req.body || {};
    const r = await call(customerClient, 'CreateCustomer', {
        documento: b.documento || '',
        nombre: b.nombre || '',
        apellido: b.apellido || '',
        email: b.email || '',
        telefono: b.telefono || '',
        fecha_nacimiento: b.fecha_nacimiento || ''
    });
    res.status(201).json(clienteRest(r.cliente));
}));

// PUT /api/clientes/:id (Admin o el propio cliente). Actualización parcial.
router.put('/:id', requireAuth, handler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) throw new HttpError(400, 'El identificador es inválido');
    validarPropietario(req, id);

    const b = req.body || {};
    const peticion = { id };
    // Campo ausente = se conserva. null / "" = se borra (solo válido para teléfono y fecha).
    ['nombre', 'apellido', 'email', 'telefono', 'fecha_nacimiento'].forEach((campo) => {
        if (b[campo] !== undefined) peticion[campo] = b[campo] === null ? '' : String(b[campo]);
    });
    // Documento y estado solo los cambia un Admin
    if (!esCliente(req.user)) {
        if (b.documento !== undefined) peticion.documento = String(b.documento);
        if (typeof b.activo === 'boolean') peticion.activo = b.activo;
    }

    const r = await call(customerClient, 'UpdateCustomer', peticion);
    res.json(clienteRest(r.cliente));
}));

// DELETE /api/clientes/:id (baja lógica, solo Admin)
router.delete('/:id', requireAdmin, handler(async (req, res) => {
    const r = await call(customerClient, 'DeactivateCustomer', { id: idParam(req) });
    res.json(clienteRest(r.cliente));
}));

module.exports = router;
