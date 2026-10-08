const typeDefs = `#graphql
  type Vehiculo {
    id: Int
    patente: String
    marca: String
    modelo: String
    anio: Int
    color: String
    precio_diario_centavos: Int
    estado: Int
  }

  type Reserva {
    id: Int
    cliente_id: Int
    vehiculo_id: Int
    fecha_inicio: String
    fecha_fin: String
    importe_total_centavos: Int
  }

  type Query {
    catalogo: [Vehiculo]
    historialAlquileres(cliente_id: Int!): [Reserva]
  }
`;

module.exports = typeDefs;
