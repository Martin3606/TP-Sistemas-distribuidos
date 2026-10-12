// Validación del JWT (HS256) emitido por el Customer Service.
// Implementado con crypto de Node para no sumar dependencias.
const crypto = require('crypto');
const { HttpError } = require('./errors');

const JWT_SECRET = process.env.JWT_SECRET || 'rentar_jwt_secret_key_1234567890_super_secret';

const b64urlDecode = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function verificarToken(token) {
    const partes = String(token).split('.');
    if (partes.length !== 3) throw new HttpError(401, 'Token de autenticación inválido');
    const [h, p, s] = partes;
    let header, payload;
    try {
        header = JSON.parse(b64urlDecode(h).toString('utf8'));
        payload = JSON.parse(b64urlDecode(p).toString('utf8'));
    } catch {
        throw new HttpError(401, 'Token de autenticación inválido');
    }
    if (header.alg !== 'HS256') throw new HttpError(401, 'Token de autenticación inválido');

    const esperado = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest();
    const recibido = b64urlDecode(s);
    if (esperado.length !== recibido.length || !crypto.timingSafeEqual(esperado, recibido)) {
        throw new HttpError(401, 'Token de autenticación inválido');
    }
    if (payload.exp && Date.now() / 1000 >= payload.exp) {
        throw new HttpError(401, 'El token de sesión ha expirado');
    }
    return {
        user_id: payload.user_id,
        email: payload.email,
        rol: payload.rol,
        cliente_id: payload.cliente_id ?? null
    };
}

/** Devuelve el usuario del header Authorization o lanza 401. */
function usuarioDesdeHeader(header) {
    const m = /^Bearer\s+(.+)$/i.exec(header || '');
    if (!m) throw new HttpError(401, 'Se requiere token de autenticación (Bearer Token)');
    return verificarToken(m[1]);
}

const requireAuth = (req, res, next) => {
    try {
        req.user = usuarioDesdeHeader(req.headers.authorization);
        next();
    } catch (err) {
        res.status(err.status || 401).json({ error: err.message, detail: err.message });
    }
};

const requireAdmin = (req, res, next) => {
    requireAuth(req, res, () => {
        if (req.user.rol !== 'ADMIN') {
            const msg = 'Acceso denegado: se requieren permisos de ADMINISTRADOR';
            return res.status(403).json({ error: msg, detail: msg });
        }
        next();
    });
};

const esCliente = (user) => user && user.rol === 'CLIENTE';

module.exports = { verificarToken, usuarioDesdeHeader, requireAuth, requireAdmin, esCliente };
