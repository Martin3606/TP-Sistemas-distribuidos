const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Rentar API - API Gateway',
      version: '1.0.0',
      description: 'Documentación interactiva de la API REST para el sistema de alquiler de vehículos Rentar.',
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Servidor Local (Gateway)'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Ingresá tu token JWT. Ejemplo: Bearer eyJhbGci...'
        }
      }
    }
  },
  // Le decimos que busque los comentarios de documentación adentro de nuestras rutas
  apis: ['./src/routes/*.js'], 
};

const swaggerSpec = swaggerJSDoc(options);

const swaggerDocs = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('📄 Swagger Docs interactivo disponible en http://localhost:8000/api-docs');
};

module.exports = swaggerDocs;