const express = require('express');
const router = express.Router();
const { customerClient, call } = require('../grpc/clients');
const { handler, HttpError } = require('../utils/errors');
const { requireAuth, requireAdmin, esCliente } = require('../utils/auth');
const { clienteRest } = require('../utils/mappers');

/**
 * @swagger
 * components:
 *   schemas:
 *     Cliente:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID interno del cliente
 *         documento:
 *           type: string
 *           description: DNI del cliente
 *         nombre:
 *           type: string
 *         apellido:
 *           type: string
 *         email:
 *           type: string
 *         telefono:
 *           type: string
 *         fecha_nacimiento:
 *           type: string
 *           example: "1990-05-15"
 *         activo:
 *           type: boolean
 */

const idParam = (req) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) throw new HttpError(400, 'El identificador es inválido');
    return id;
};

// Un CLIENTE solo puede ver / editar su propio registro
function validarPropietario(req, id) {
    if (esCliente(req.user) && req.user.cliente_id !== id) {
        throw new HttpError(403, 'No está autorizado para acceder a los datos de otro cliente');
    }
}

/**
 * @swagger
 * /api/clientes:
 *   get:
 *     summary: Obtiene el padrón de clientes
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: solo_activos
 *         schema:
 *           type: boolean
 *         description: Si es true, omite los clientes dados de baja
 *     responses:
 *       200:
 *         description: Lista de clientes obtenida con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Cliente'
 */
router.get('/', requireAdmin, handler(async (req, res) => {
    const solo_activos = String(req.query.solo_activos).toLowerCase() === 'true';
    const r = await call(customerClient, 'ListCustomers', { solo_activos });
    res.json((r.clientes || []).map(clienteRest));
}));

/**
 * @swagger
 * /api/clientes/{id}:
 *   get:
 *     summary: Obtiene los datos de un cliente por su ID
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cliente'
 */
router.get('/:id', requireAuth, handler(async (req, res) => {
    const id = idParam(req);
    validarPropietario(req, id);
    const r = await call(customerClient, 'GetCustomer', { id });
    res.json(clienteRest(r.cliente));
}));

/**
 * @swagger
 * /api/clientes:
 *   post:
 *     summary: Crea un nuevo cliente (Solo Admin)
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Cliente'
 *     responses:
 *       201:
 *         description: Cliente registrado con éxito
 */
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

/**
 * @swagger
 * /api/clientes/{id}:
 *   put:
 *     summary: Modifica parcialmente los datos de un cliente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Cliente'
 *     responses:
 *       200:
 *         description: Cliente actualizado
 */
router.put('/:id', requireAuth, handler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) throw new HttpError(400, 'El identificador es inválido');
    validarPropietario(req, id);

    const b = req.body || {};
    const peticion = { id };
    ['nombre', 'apellido', 'email', 'telefono', 'fecha_nacimiento'].forEach((campo) => {
        if (b[campo] !== undefined) peticion[campo] = b[campo] === null ? '' : String(b[campo]);
    });
    if (!esCliente(req.user)) {
        if (b.documento !== undefined) peticion.documento = String(b.documento);
        if (typeof b.activo === 'boolean') peticion.activo = b.activo;
    }

    const r = await call(customerClient, 'UpdateCustomer', peticion);
    res.json(clienteRest(r.cliente));
}));

/**
 * @swagger
 * /api/clientes/{id}:
 *   delete:
 *     summary: Da de baja lógica a un cliente (Solo Admin)
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cliente inactivo
 */
router.delete('/:id', requireAdmin, handler(async (req, res) => {
    const r = await call(customerClient, 'DeactivateCustomer', { id: idParam(req) });
    res.json(clienteRest(r.cliente));
}));

module.exports = router;