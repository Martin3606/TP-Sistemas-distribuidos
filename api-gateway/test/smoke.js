// Prueba de humo del gateway con microservicios SIMULADOS (sin MySQL ni Docker).
// Uso:  node test/smoke.js
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const opts = { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true };
const load = (f) => grpc.loadPackageDefinition(protoLoader.loadSync(path.join(__dirname, '../proto', f), opts)).rentar;
const vProto = load('vehicle.proto').vehicle.v1;
const cProto = load('customer.proto').customer.v1;
const rProto = load('rental.proto').rental.v1;

const SECRET = 'rentar_jwt_secret_key_1234567890_super_secret';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (payload) => {
    const h = b64({ alg: 'HS256', typ: 'JWT' }), p = b64({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 });
    return `${h}.${p}.${crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')}`;
};

// ---------- datos simulados ----------
const vehs = [
    { id: 1, patente: 'AB123CD', marca: 'Toyota', modelo: 'Corolla', anio: 2022, color: 'Gris', tipo_vehiculo: 'VEHICLE_TYPE_SEDAN', precio_diario_centavos: '1500000', estado: 'VEHICLE_STATUS_DISPONIBLE', activo: true },
    { id: 2, patente: 'IJ789KL', marca: 'Honda', modelo: 'HR-V', anio: 2023, color: 'Negro', tipo_vehiculo: 'VEHICLE_TYPE_SUV', precio_diario_centavos: '2000000', estado: 'VEHICLE_STATUS_DISPONIBLE', activo: true }
];
const clis = [
    { id: 1, documento: '30111222', nombre: 'Juan', apellido: 'Perez', email: 'j@x.com', telefono: '', fecha_nacimiento: '1990-05-10', activo: true },
    { id: 2, documento: '30222333', nombre: 'Ana', apellido: 'Gomez', email: 'a@x.com', telefono: '', fecha_nacimiento: '', activo: false }
];
const rentals = [];
const err = (code, details) => ({ code, details });
const ts = (s) => ({ seconds: String(s) });

function vehicleSvc() {
    return {
        ListVehicles: (c, cb) => cb(null, { vehiculos: vehs }),
        GetVehicle: (c, cb) => { const v = vehs.find((x) => x.id === c.request.id); v ? cb(null, { vehiculo: v }) : cb(err(grpc.status.NOT_FOUND, 'Vehículo no encontrado')); },
        GetVehicleByPlate: (c, cb) => { const v = vehs.find((x) => x.patente === c.request.patente); v ? cb(null, { vehiculo: v }) : cb(err(grpc.status.NOT_FOUND, 'No se encontró el vehículo especificado')); },
        CheckAvailability: (c, cb) => cb(null, { vehiculos: vehs.filter((v) => !c.request.filtros.tipo_vehiculo || c.request.filtros.tipo_vehiculo === 'VEHICLE_TYPE_UNSPECIFIED' || v.tipo_vehiculo === c.request.filtros.tipo_vehiculo) }),
        CreateVehicle: (c, cb) => {
            const r = c.request;
            if (vehs.some((v) => v.patente === r.patente)) return cb(err(grpc.status.ALREADY_EXISTS, 'La patente ya existe'));
            const v = { id: vehs.length + 1, patente: r.patente, marca: r.marca, modelo: r.modelo, anio: r.anio, color: r.color, tipo_vehiculo: r.tipo_vehiculo, precio_diario_centavos: r.precio_diario_centavos, estado: 'VEHICLE_STATUS_DISPONIBLE', activo: true };
            vehs.push(v); cb(null, { vehiculo: v });
        },
        UpdateVehicle: (c, cb) => { const v = vehs.find((x) => x.id === c.request.id); Object.assign(v, c.request); cb(null, { vehiculo: v }); },
        DeactivateVehicle: (c, cb) => { const v = vehs.find((x) => x.id === c.request.id); v.activo = false; cb(null, { vehiculo: v }); }
    };
}
function customerSvc() {
    return {
        Authenticate: (c, cb) => {
            const { email, password } = c.request;
            if (email === 'admin@rentar.com' && password === 'admin123') return cb(null, { token: jwt({ user_id: 1, email, rol: 'ADMIN', cliente_id: null }), user_id: 1, email, rol: 'ROLE_ADMIN', nombre: 'Administrador' });
            if (email === 'juan.perez@mail.com' && password === 'cliente123') return cb(null, { token: jwt({ user_id: 2, email, rol: 'CLIENTE', cliente_id: 1 }), user_id: 2, email, rol: 'ROLE_CLIENTE', cliente_id: 1, nombre: 'Juan Perez' });
            cb(err(grpc.status.UNAUTHENTICATED, 'Credenciales inválidas (email o contraseña incorrectos)'));
        },
        ListCustomers: (c, cb) => cb(null, { clientes: clis.filter((x) => !c.request.solo_activos || x.activo) }),
        GetCustomer: (c, cb) => { const x = clis.find((y) => y.id === c.request.id); x ? cb(null, { cliente: x }) : cb(err(grpc.status.NOT_FOUND, 'No se encontró el cliente')); },
        GetCustomerByDocument: (c, cb) => { const x = clis.find((y) => y.documento === c.request.documento); x ? cb(null, { cliente: x }) : cb(err(grpc.status.NOT_FOUND, 'No se encontró ningún cliente registrado para asociar a la reserva')); },
        CreateCustomer: (c, cb) => { const r = c.request; const x = { id: clis.length + 1, ...r, activo: true }; clis.push(x); cb(null, { cliente: x }); },
        UpdateCustomer: (c, cb) => {
            const x = clis.find((y) => y.id === c.request.id);
            // proto3 optional: solo los campos presentes
            for (const k of ['nombre', 'apellido', 'email', 'telefono', 'documento', 'fecha_nacimiento']) if (c.request[k] !== undefined) x[k] = c.request[k];
            if (c.request.activo !== undefined) x.activo = c.request.activo;
            cb(null, { cliente: x });
        },
        DeactivateCustomer: (c, cb) => { const x = clis.find((y) => y.id === c.request.id); x.activo = false; cb(null, { cliente: x }); },
        CheckCustomerExists: (c, cb) => cb(null, { existe: true }),
        IsCustomerActive: (c, cb) => cb(null, { activo: true })
    };
}
function rentalSvc() {
    const solapa = (vid, i, f) => rentals.some((r) => r.vehiculo_id === vid && r.estado === 'RENTAL_STATE_CONFIRMADA' && Number(r.fecha_inicio.seconds) < f && Number(r.fecha_fin.seconds) > i);
    return {
        CreateRental: (c, cb) => {
            const r = c.request; const i = Number(r.fecha_inicio.seconds), f = Number(r.fecha_fin.seconds);
            if (solapa(r.vehiculo_id, i, f)) return cb(err(grpc.status.ALREADY_EXISTS, 'El vehículo no está disponible durante el período solicitado'));
            const dias = Math.max(1, Math.ceil((f - i) / 86400));
            const x = { id: rentals.length + 1, cliente_id: r.cliente_id, vehiculo_id: r.vehiculo_id, fecha_inicio: ts(i), fecha_fin: ts(f), precio_diario_snapshot_centavos: r.precio_diario_snapshot_centavos, importe_total_centavos: String(Number(r.precio_diario_snapshot_centavos) * dias), estado: 'RENTAL_STATE_CONFIRMADA' };
            rentals.push(x); cb(null, { rental: x });
        },
        CancelRental: (c, cb) => { const x = rentals.find((y) => y.id === c.request.id); x.estado = 'RENTAL_STATE_CANCELADA'; cb(null, { rental: x }); },
        GetRentalById: (c, cb) => { const x = rentals.find((y) => y.id === c.request.id); x ? cb(null, { rental: x }) : cb(err(grpc.status.NOT_FOUND, 'La reserva no existe')); },
        ListRentalsByCustomer: (c, cb) => cb(null, { rentals: rentals.filter((r) => r.cliente_id === c.request.cliente_id) }),
        CheckAvailability: (c, cb) => cb(null, { disponible: !solapa(c.request.vehiculo_id, Number(c.request.fecha_inicio.seconds), Number(c.request.fecha_fin.seconds)) })
    };
}
function serve(def, impl, port) {
    const s = new grpc.Server(); s.addService(def.service, impl);
    return new Promise((ok) => s.bindAsync(`127.0.0.1:${port}`, grpc.ServerCredentials.createInsecure(), () => ok(s)));
}

// ---------- pruebas ----------
let fallos = 0;
const check = (nombre, cond, extra = '') => { console.log(`${cond ? 'OK  ' : 'FAIL'} ${nombre}${cond ? '' : '  -> ' + extra}`); if (!cond) fallos++; };
const BASE = 'http://127.0.0.1:18000';
async function http(method, url, body, token) {
    const r = await fetch(BASE + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    let j = null; try { j = await r.json(); } catch { /* sin cuerpo */ }
    return { status: r.status, body: j };
}
const gql = (query, variables, token) => http('POST', '/graphql', { query, variables }, token);
const dia = (n, h = 10) => { const d = new Date(Date.now() + n * 86400000); d.setUTCHours(h, 0, 0, 0); return d.toISOString().slice(0, 19); };

(async () => {
    await serve(vProto.VehicleService, vehicleSvc(), 15051);
    await serve(cProto.CustomerService, customerSvc(), 15052);
    await serve(rProto.RentalService, rentalSvc(), 15053);
    const gw = spawn('node', ['index.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: '18000', VEHICLE_GRPC_URL: '127.0.0.1:15051', CUSTOMER_GRPC_URL: '127.0.0.1:15052', RENTAL_GRPC_URL: '127.0.0.1:15053' }, stdio: 'inherit' });
    await new Promise((r) => setTimeout(r, 2500));
    try {
        let r = await http('POST', '/auth/login', { email: 'admin@rentar.com', password: 'mala' });
        check('login con clave mala -> 401', r.status === 401 && r.body.detail, JSON.stringify(r));
        r = await http('POST', '/auth/login', { email: 'admin@rentar.com', password: 'admin123' });
        check('login admin', r.status === 200 && r.body.user.rol === 'ADMIN' && r.body.user.nombre === 'Administrador' && r.body.access_token, JSON.stringify(r));
        const admin = r.body.access_token;
        r = await http('POST', '/auth/login', { email: 'juan.perez@mail.com', password: 'cliente123' });
        check('login cliente (cliente_id y nombre)', r.body.user.rol === 'CLIENTE' && r.body.user.cliente_id === 1 && r.body.user.nombre === 'Juan Perez', JSON.stringify(r));
        const cli = r.body.access_token;

        r = await http('GET', '/api/vehiculos');
        check('GET vehiculos sin token -> 401', r.status === 401);
        r = await http('GET', '/api/vehiculos', null, cli);
        check('GET vehiculos (formato REST)', r.status === 200 && r.body[0].tipo_vehiculo === 'SEDAN' && r.body[0].precio_diario === 15000 && r.body[0].estado === 'DISPONIBLE', JSON.stringify(r.body[0]));
        r = await http('POST', '/api/vehiculos', { patente: 'ZZ111ZZ', marca: 'Fiat', modelo: 'Cronos', anio: 2023, color: null, tipo_vehiculo: 'SEDAN', precio_diario: 12000.5 }, cli);
        check('POST vehiculos como cliente -> 403', r.status === 403);
        r = await http('POST', '/api/vehiculos', { patente: 'ZZ111ZZ', marca: 'Fiat', modelo: 'Cronos', anio: 2023, color: null, tipo_vehiculo: 'SEDAN', precio_diario: 12000.5 }, admin);
        check('POST vehiculos admin -> 201', r.status === 201 && r.body.precio_diario === 12000.5, JSON.stringify(r));
        r = await http('POST', '/api/vehiculos', { patente: 'ZZ111ZZ', marca: 'Fiat', modelo: 'Cronos', anio: 2023, tipo_vehiculo: 'SEDAN', precio_diario: 1 }, admin);
        check('patente duplicada -> 409', r.status === 409 && /patente/i.test(r.body.detail), JSON.stringify(r));
        r = await http('PUT', '/api/vehiculos/3', { marca: 'Fiat', modelo: 'Cronos 2', anio: 2023, tipo_vehiculo: 'SEDAN', precio_diario: 13000 }, admin);
        check('PUT vehiculos conserva activo', r.status === 200 && r.body.modelo === 'Cronos 2' && r.body.activo === true, JSON.stringify(r));
        r = await http('DELETE', '/api/vehiculos/3', null, admin);
        check('DELETE vehiculos = baja logica', r.status === 200 && r.body.activo === false);

        r = await http('GET', '/api/clientes?solo_activos=true', null, admin);
        check('GET clientes solo_activos', r.status === 200 && r.body.length === 1, JSON.stringify(r.body));
        r = await http('GET', '/api/clientes', null, cli);
        check('GET clientes como cliente -> 403', r.status === 403);
        r = await http('GET', '/api/clientes/1', null, cli);
        check('MiPerfil: GET propio', r.status === 200 && r.body.fecha_nacimiento === '1990-05-10');
        r = await http('GET', '/api/clientes/2', null, cli);
        check('GET cliente ajeno -> 403', r.status === 403);
        r = await http('PUT', '/api/clientes/1', { nombre: 'Juancito', telefono: '1155', activo: false, documento: '999', fecha_nacimiento: '' }, cli);
        check('PUT propio: ignora activo/documento, borra fecha', r.status === 200 && r.body.nombre === 'Juancito' && r.body.activo === true && r.body.documento === '30111222' && r.body.fecha_nacimiento === null && r.body.apellido === 'Perez', JSON.stringify(r.body));
        r = await http('POST', '/api/clientes', { documento: '40', nombre: 'Nuevo', apellido: 'Cli', email: 'n@x.com', telefono: null, fecha_nacimiento: '2000-01-01' }, admin);
        check('POST clientes (con fecha nac.)', r.status === 201 && r.body.fecha_nacimiento === '2000-01-01', JSON.stringify(r));
        r = await http('DELETE', '/api/clientes/3', null, admin);
        check('DELETE clientes = baja logica', r.status === 200 && r.body.activo === false);

        const ini = dia(3), fin = dia(5);
        r = await http('POST', '/api/reservas', { patente: 'AB123CD', cliente_id: 1, fecha_inicio: ini, fecha_fin: fin }, cli);
        check('reserva cliente (patente + cliente_id) -> 201', r.status === 201 && r.body.importe_total === 30000 && r.body.cantidad_dias === 2 && r.body.estado === 'CONFIRMADA' && r.body.fecha_inicio === ini, JSON.stringify(r));
        const idRes = r.body && r.body.id;
        r = await http('POST', '/api/reservas', { patente: 'AB123CD', cliente_id: 1, fecha_inicio: ini, fecha_fin: fin }, cli);
        check('solapamiento -> 409', r.status === 409, JSON.stringify(r));
        r = await http('POST', '/api/reservas', { patente: 'IJ789KL', cliente_id: 2, fecha_inicio: ini, fecha_fin: fin }, cli);
        check('cliente reserva a nombre de otro -> 403', r.status === 403, JSON.stringify(r));
        r = await http('POST', '/api/reservas', { documento: '30222333', patente: 'IJ789KL', fecha_inicio: ini, fecha_fin: fin }, admin);
        check('admin: cliente inactivo -> 400', r.status === 400 && /inactivo/.test(r.body.detail), JSON.stringify(r));
        r = await http('POST', '/api/reservas', { documento: '30111222', patente: 'IJ789KL', fecha_inicio: ini, fecha_fin: fin }, admin);
        check('admin: reserva por documento + patente -> 201', r.status === 201, JSON.stringify(r));
        r = await http('POST', '/api/reservas', { documento: '00000', patente: 'IJ789KL', fecha_inicio: ini, fecha_fin: fin }, admin);
        check('documento inexistente -> 404', r.status === 404, JSON.stringify(r));
        r = await http('POST', '/api/reservas', { documento: '30111222', patente: 'NOEXISTE', fecha_inicio: ini, fecha_fin: fin }, admin);
        check('patente inexistente -> 404', r.status === 404, JSON.stringify(r));

        const Q_DISP = 'query($filtro: FiltroDisponibilidadInput!){ consultarDisponibilidad(filtro:$filtro){ id patente marca modelo anio color tipoVehiculo precioDiario estado } }';
        r = await gql(Q_DISP, { filtro: { fechaInicio: ini, fechaFin: fin, tipoVehiculo: null, marca: null } }, cli);
        check('GraphQL disponibilidad excluye el reservado', !r.body.errors && r.body.data.consultarDisponibilidad.length === 1 && r.body.data.consultarDisponibilidad[0].patente !== 'AB123CD' || (r.body.data && r.body.data.consultarDisponibilidad.every((v) => v.patente !== 'AB123CD')), JSON.stringify(r.body));
        r = await gql(Q_DISP, { filtro: { fechaInicio: dia(30), fechaFin: dia(31) } }, cli);
        check('GraphQL disponibilidad en otras fechas: 2+ autos camelCase', r.body.data.consultarDisponibilidad.length >= 2 && r.body.data.consultarDisponibilidad[0].precioDiario === 15000 && r.body.data.consultarDisponibilidad[0].tipoVehiculo === 'SEDAN', JSON.stringify(r.body));
        r = await gql(Q_DISP, { filtro: { fechaInicio: fin, fechaFin: ini } }, cli);
        check('GraphQL fechas invertidas -> HTTP 200 + error legible', r.status === 200 && r.body.errors && /posterior/.test(r.body.errors[0].message), JSON.stringify(r.body));
        r = await gql(Q_DISP, { filtro: { fechaInicio: ini, fechaFin: fin } });
        check('GraphQL sin token -> error', r.body.errors && /token/i.test(r.body.errors[0].message), JSON.stringify(r.body));

        const Q_HIST = 'query($clienteId: ID!){ historialAlquileres(clienteId:$clienteId){ id fechaInicio fechaFin cantidadDias importeTotal estado vehiculo{ patente marca modelo tipoVehiculo } } }';
        r = await gql(Q_HIST, { clienteId: '2' }, cli);
        check('GraphQL historial: cliente fuerza el suyo', !r.body.errors && r.body.data.historialAlquileres.length >= 1 && r.body.data.historialAlquileres.every((x) => x.vehiculo.patente), JSON.stringify(r.body));
        const Q_RES = 'query($filtro: FiltroReservaInput){ consultarReservas(filtro:$filtro){ id vehiculo{ patente marca modelo tipoVehiculo } fechaInicio fechaFin importeTotal estado cantidadDias } }';
        r = await gql(Q_RES, { filtro: { clienteId: 1 } }, cli);
        check('GraphQL consultarReservas (cliente)', !r.body.errors && r.body.data.consultarReservas[0].importeTotal === 30000 && r.body.data.consultarReservas[0].cantidadDias === 2, JSON.stringify(r.body));
        r = await gql(Q_RES, { filtro: {} }, admin);
        check('GraphQL consultarReservas (admin, todas)', !r.body.errors && r.body.data.consultarReservas.length >= 2, JSON.stringify(r.body));
        r = await gql('{ consultarReservas(filtro:{ clienteId: 1 }){ id cliente{ nombre documento } } }', {}, admin);
        check('GraphQL Reserva.cliente', !r.body.errors && r.body.data.consultarReservas[0].cliente.documento === '30111222', JSON.stringify(r.body));

        r = await http('PATCH', `/api/reservas/${idRes}/cancelar`, null, cli);
        check('cancelar reserva propia', r.status === 200 && r.body.estado === 'CANCELADA', JSON.stringify(r));
        await http('POST', '/api/clientes', { documento: '41', nombre: 'Otro', apellido: 'Cliente', email: 'o@x.com' }, admin);
        r = await http('POST', '/api/reservas', { documento: '41', patente: 'IJ789KL', fecha_inicio: dia(40), fecha_fin: dia(41) }, admin);
        const idAjena = r.body.id;
        r = await http('PATCH', `/api/reservas/${idAjena}/cancelar`, null, cli);
        check('cancelar reserva ajena -> 403', r.status === 403, JSON.stringify(r));
        r = await http('PATCH', '/api/reservas/999/cancelar', null, cli);
        check('cancelar inexistente -> 404', r.status === 404, JSON.stringify(r));
    } finally {
        gw.kill();
        console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} PRUEBA(S) FALLARON`);
        process.exit(fallos === 0 ? 0 : 1);
    }
})();
