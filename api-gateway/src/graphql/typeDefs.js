const typeDefs = `#graphql
  """Categorías disponibles para clasificar los vehículos de la flota."""
  enum TipoVehiculo { SEDAN SUV PICKUP COUPE HATCHBACK }
  
  """Estado operativo actual del vehículo en el sistema."""
  enum EstadoVehiculo { DISPONIBLE RESERVADO EN_ALQUILER }
  
  """Estado del ciclo de vida de una reserva."""
  enum EstadoReserva { CONFIRMADA CANCELADA FINALIZADA }

  """Origen del vehículo (si es de la empresa o de un tercero)."""
  enum OrigenVehiculo { PROPIO EXTERNO }

  """Resultado del cruce de datos con la DNRPA para vehículos externos."""
  enum ResultadoVerificacion { PENDIENTE VALIDADO ROBADO }

  """Estado del mantenimiento posterior a una reserva."""
  enum EstadoMantenimiento { PENDIENTE REALIZADO NO_REALIZADO ERROR }

  """Representa a un cliente registrado en la plataforma."""
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

  """Representa un vehículo que forma parte de la flota de alquiler."""
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
    
    # NUEVOS CAMPOS HITO 3
    origen: OrigenVehiculo
    resultadoVerificacion: ResultadoVerificacion
    inhabilitadoPorRobo: Boolean
  }

  """Representa el contrato de alquiler/reserva entre un cliente y un vehículo."""
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
    
    # NUEVO CAMPO HITO 3
    estadoMantenimiento: EstadoMantenimiento
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