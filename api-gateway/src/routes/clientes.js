const express = require('express');
const router = express.Router();
const { customerClient } = require('../grpc/clients');

// GET /api/clientes
router.get('/', (req, res) => {
    customerClient.ListCustomers({ solo_activos: false }, { deadline: new Date(Date.now() + 5000) }, (error, response) => {
        if (error) {
            console.error("Error en gRPC:", error);
            return res.status(500).json({ error: "Error al obtener clientes" });
        }
        res.json(response.clientes || []);
    });
});

// GET /api/clientes/:id
router.get('/:id', (req, res) => {
    customerClient.GetCustomer({ id: parseInt(req.params.id) }, { deadline: new Date(Date.now() + 5000) }, (error, response) => {
        if (error) {
            return res.status(404).json({ error: "Cliente no encontrado" });
        }
        res.json(response.cliente);
    });
});

module.exports = router;
