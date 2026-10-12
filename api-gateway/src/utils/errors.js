// Traduce errores gRPC (de los microservicios) a respuestas HTTP.
const grpc = require('@grpc/grpc-js');
const S = grpc.status;

const HTTP_POR_CODIGO = {
    [S.INVALID_ARGUMENT]: 400,
    [S.FAILED_PRECONDITION]: 400,
    [S.OUT_OF_RANGE]: 400,
    [S.UNAUTHENTICATED]: 401,
    [S.PERMISSION_DENIED]: 403,
    [S.NOT_FOUND]: 404,
    [S.ALREADY_EXISTS]: 409,
    [S.ABORTED]: 409,
    [S.UNAVAILABLE]: 503,
    [S.DEADLINE_EXCEEDED]: 504
};

/** Error de negocio propio del gateway. */
class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function describir(err) {
    if (err instanceof HttpError) return { status: err.status, message: err.message };

    if (typeof err.code === 'number' && err.details !== undefined) {
        const status = HTTP_POR_CODIGO[err.code] || 500;
        if (err.code === S.UNAVAILABLE) {
            return { status, message: 'El servicio no está disponible en este momento. Intente nuevamente.' };
        }
        if (err.code === S.DEADLINE_EXCEEDED) {
            return { status, message: 'El servicio tardó demasiado en responder. Intente nuevamente.' };
        }
        if (status === 500) {
            return { status, message: 'Error interno del servidor.' };
        }
        return { status, message: err.details };
    }
    return { status: 500, message: 'Error interno del servidor.' };
}

/**
 * Responde con { error, detail }: el frontend lee `detail` (convención del Hito 1)
 * y el gateway deja `error` por compatibilidad.
 */
function sendError(res, err) {
    const { status, message } = describir(err);
    if (status >= 500) console.error('[gateway] error:', err);
    res.status(status).json({ error: message, detail: message });
}

/** Envuelve un handler async para que cualquier excepción termine en sendError. */
const handler = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((err) => sendError(res, err));

module.exports = { HttpError, describir, sendError, handler };
