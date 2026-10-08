const { vehicleClient, rentalClient } = require('../grpc/clients');

const resolvers = {
  Query: {
    catalogo: async () => {
      return new Promise((resolve, reject) => {
        // Consultamos solo vehículos activos para el catálogo
        vehicleClient.ListVehicles({ solo_activos: true }, { deadline: new Date(Date.now() + 5000) }, (error, response) => {
          if (error) return reject(error);
          resolve(response.vehiculos || []);
        });
      });
    },
    historialAlquileres: async (_, { cliente_id }) => {
      return new Promise((resolve, reject) => {
        rentalClient.ListRentalsByCustomer({ cliente_id }, { deadline: new Date(Date.now() + 5000) }, (error, response) => {
          if (error) return reject(error);
          resolve(response.rentals || []);
        });
      });
    }
  }
};

module.exports = resolvers;
