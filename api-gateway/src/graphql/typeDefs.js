// Esquema GraphQL idéntico al del Hito 1 (el frontend no cambia).
const typeDefs = `#graphql
  enum TipoVehiculo { SEDAN SUV PICKUP COUPE HATCHBACK }
  enum EstadoVehiculo { DISPONIBLE RESERVADO EN_ALQUILER }
  enum EstadoReserva { CONFIRMADA CANCELADA FINALIZADA }

  type Cliente {
    id: ID!
    documento: String!
    nombre: String!
    apellido: String!
    email: String!
    telefono: String
    fechaNacimiento: String
    activo: Boolean!
  }

  type Vehiculo {
    id: ID!
    patente: String!
    marca: String!
    modelo: String!
    anio: Int!
    color: String
    tipoVehiculo: TipoVehiculo!
    precioDiario: Float!
    estado: EstadoVehiculo!
    activo: Boolean!
  }

  type Reserva {
    id: ID!
    cliente: Cliente!
    vehiculo: Vehiculo!
    fechaInicio: String!
    fechaFin: String!
    precioDiarioSnapshot: Float!
    importeTotal: Float!
    estado: EstadoReserva!
    cantidadDias: Int!
  }

  input FiltroDisponibilidadInput {
    fechaInicio: String!
    fechaFin: String!
    tipoVehiculo: TipoVehiculo
    marca: String
    modelo: String
    precioMin: Float
    precioMax: Float
  }

  input FiltroReservaInput {
    clienteId: ID
    vehiculoId: ID
    tipoVehiculo: TipoVehiculo
    estado: EstadoReserva
    fechaInicioDesde: String
    fechaFinHasta: String
  }

  type Query {
    health: String
    consultarDisponibilidad(filtro: FiltroDisponibilidadInput!): [Vehiculo!]!
    consultarReservas(filtro: FiltroReservaInput): [Reserva!]!
    historialAlquileres(clienteId: ID!): [Reserva!]!
  }
`;

module.exports = typeDefs;
