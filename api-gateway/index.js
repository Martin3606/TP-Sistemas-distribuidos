const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');

const typeDefs = require('./src/graphql/typeDefs');
const resolvers = require('./src/graphql/resolvers');

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

// Configuración asíncrona para arrancar Apollo Server
async function startApolloServer() {
    const server = new ApolloServer({ typeDefs, resolvers });
    await server.start();
    app.use('/graphql', expressMiddleware(server));

    if (require.main === module) {
        app.listen(PORT, () => {
            console.log(`API Gateway corriendo en puerto ${PORT}`);
            console.log(`GraphQL disponible en http://localhost:${PORT}/graphql`);
        });
    }
}

startApolloServer();

module.exports = app;
