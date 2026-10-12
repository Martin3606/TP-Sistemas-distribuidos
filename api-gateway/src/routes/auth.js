const express = require('express');
const router = express.Router();
const { customerClient, call } = require('../grpc/clients');
const { handler, HttpError } = require('../utils/errors');
const { quitar } = require('../utils/mappers');

// POST /auth/login  (y /api/auth/login)
// Respuesta compatible con el Hito 1: { access_token, token_type, user }
router.post('/login', handler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) throw new HttpError(400, 'Debe ingresar email y contraseña');

    const r = await call(customerClient, 'Authenticate', { email, password });
    res.json({
        access_token: r.token,
        token_type: 'bearer',
        user: {
            id: r.user_id,
            email: r.email,
            rol: quitar(r.rol, 'ROLE_'),
            cliente_id: r.cliente_id ?? null,
            nombre: r.nombre
        }
    });
}));

module.exports = router;
