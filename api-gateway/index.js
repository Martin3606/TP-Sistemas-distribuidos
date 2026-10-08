const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json()); // Middleware para JSON

// Rutas REST
app.use('/api/vehiculos', require('./src/routes/vehiculos'));
app.use('/api/clientes', require('./src/routes/clientes'));

app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'api-gateway' });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`API Gateway corriendo en puerto ${PORT}`);
    });
}

module.exports = app;
