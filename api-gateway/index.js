const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express4');

const typeDefs = require('./src/graphql/typeDefs');
const resolvers = require('./src/graphql/resolvers');
const { usuarioDesdeHeader } = require('./src/utils/auth');

// Importamos nuestra nueva configuración de Swagger
const swaggerDocs = require('./src/swagger');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json()); // Middleware para JSON

// Autenticación
app.use('/auth', require('./src/routes/auth'));
app.use('/api/auth', require('./src/routes/auth'));

// Rutas REST (orquestan a los microservicios por gRPC)
app.use('/api/vehiculos', require('./src/routes/vehiculos'));
app.use('/api/clientes', require('./src/routes/clientes'));
app.use('/api/reservas', require('./src/routes/reservas'));

app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'api-gateway' });
});

// Configuración asíncrona para arrancar Apollo Server
async function startApolloServer() {
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        includeStacktraceInErrorResponses: false
    });
    await server.start();

    app.use('/graphql', expressMiddleware(server, {
        context: async ({ req }) => {
            try {
                return { user: usuarioDesdeHeader(req.headers.authorization), cache: {} };
            } catch (err) {
                return { user: null, authError: err.message, cache: {} };
            }
        }
    }));

    if (require.main === module) {
        app.listen(PORT, () => {
            console.log(`API Gateway corriendo en puerto ${PORT}`);
            console.log(`GraphQL disponible en http://localhost:${PORT}/graphql`);
            // Iniciamos la web de Swagger
            swaggerDocs(app); 
        });
    }
}

startApolloServer();

module.exports = app;