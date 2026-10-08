const express = require('express');
const router = express.Router();
const { vehicleClient } = require('../grpc/clients');

// GET /api/vehiculos
router.get('/', (req, res) => {
    vehicleClient.ListVehicles({ solo_activos: false }, (error, response) => {
        if (error) {
            console.error("Error en gRPC:", error);
            return res.status(500).json({ error: "Error al obtener vehículos" });
        }
        res.json(response.vehiculos || []);
    });
});

// GET /api/vehiculos/:id
router.get('/:id', (req, res) => {
    vehicleClient.GetVehicle({ id: parseInt(req.params.id) }, (error, response) => {
        if (error) {
            return res.status(404).json({ error: "Vehículo no encontrado" });
        }
        res.json(response.vehiculo);
    });
});

module.exports = router;
