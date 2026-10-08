const express = require('express');
const router = express.Router();
const { customerClient, vehicleClient, rentalClient } = require('../grpc/clients');

// Funciones helper para promesificar las llamadas gRPC
const isCustomerActive = (id) => new Promise((resolve, reject) => {
    customerClient.IsCustomerActive({ id }, (err, response) => {
        if (err) return reject(err);
        resolve(response.activo);
    });
});

const getVehicle = (id) => new Promise((resolve, reject) => {
    vehicleClient.GetVehicle({ id }, (err, response) => {
        if (err) return reject(err);
        resolve(response.vehiculo);
    });
});

const createRental = (data) => new Promise((resolve, reject) => {
    rentalClient.CreateRental(data, (err, response) => {
        if (err) return reject(err);
        resolve(response.rental);
    });
});

// POST /api/reservas - Endpoint de Orquestación
router.post('/', async (req, res) => {
    try {
        const { cliente_id, vehiculo_id, fecha_inicio, fecha_fin } = req.body;

        // 1. Validar si el cliente existe y está activo
        const clienteActivo = await isCustomerActive(cliente_id);
        if (!clienteActivo) {
            return res.status(403).json({ error: "Operación rechazada: El cliente no existe o se encuentra inactivo." });
        }

        // 2. Obtener el vehículo, verificar disponibilidad y extraer precio actual
        const vehiculo = await getVehicle(vehiculo_id);
        
        // El enum en proto retorna el string o el entero dependiendo de la configuración del proto-loader.
        // Comprobamos ambas posibles respuestas de "DISPONIBLE" (1 o 'VEHICLE_STATUS_DISPONIBLE').
        if (vehiculo.estado !== 1 && vehiculo.estado !== 'VEHICLE_STATUS_DISPONIBLE') {
            return res.status(400).json({ error: "Operación rechazada: El vehículo no se encuentra disponible." });
        }

        // 3. Formatear fechas para Protobuf Timestamp (segundos)
        const fInicioProto = { seconds: Math.floor(new Date(fecha_inicio).getTime() / 1000) };
        const fFinProto = { seconds: Math.floor(new Date(fecha_fin).getTime() / 1000) };

        // 4. Delegar creación al Rental Service
        const reservaPayload = {
            cliente_id,
            vehiculo_id,
            fecha_inicio: fInicioProto,
            fecha_fin: fFinProto,
            precio_diario_snapshot_centavos: vehiculo.precio_diario_centavos
        };

        const nuevaReserva = await createRental(reservaPayload);
        
        // Respondemos con la reserva creada exitosamente
        res.status(201).json(nuevaReserva);

    } catch (error) {
        console.error("Error en orquestación de reserva:", error);
        res.status(500).json({ error: "Error interno del servidor al procesar la reserva.", detalles: error.details });
    }
});

module.exports = router;
