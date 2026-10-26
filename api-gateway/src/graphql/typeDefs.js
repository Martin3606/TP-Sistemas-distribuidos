// Esquema GraphQL idéntico al del Hito 1, ahora con documentación interactiva.
const typeDefs = `#graphql
  """Categorías disponibles para clasificar los vehículos de la flota."""
  enum TipoVehiculo { SEDAN SUV PICKUP COUPE HATCHBACK }
  
  """Estado operativo actual del vehículo en el sistema."""
  enum EstadoVehiculo { DISPONIBLE RESERVADO EN_ALQUILER }
  
  """Estado del ciclo de vida de una reserva."""
  enum EstadoReserva { CONFIRMADA CANCELADA FINALIZADA }

  """Representa a un cliente registrado en la plataforma."""
  type Cliente {
    id: ID!
    """Documento Nacional de Identidad (DNI) del cliente."""
    documento: String!
    nombre: String!
    apellido: String!
    email: String!
    telefono: String
    """Fecha de nacimiento en formato YYYY-MM-DD."""
    fechaNacimiento: String
    """Indica si el cliente está habilitado para operar (true) o dado de baja (false)."""
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
    """Precio por día de alquiler (en pesos, con decimales)."""
    precioDiario: Float!
    """Estado actual del auto (ej. si está disponible o ya lo están usando)."""
    estado: EstadoVehiculo!
    """Indica si el vehículo sigue formando parte de la flota activa."""
    activo: Boolean!
  }

  """Representa el contrato de alquiler/reserva entre un cliente y un vehículo."""
  type Reserva {
    id: ID!
    cliente: Cliente!
    vehiculo: Vehiculo!
    """Fecha y hora de inicio pactada (formato ISO 8601)."""
    fechaInicio: String!
    """Fecha y hora de finalización pactada (formato ISO 8601)."""
    fechaFin: String!
    """Precio diario congelado al momento de crear la reserva (para evitar cambios a futuro)."""
    precioDiarioSnapshot: Float!
    """Costo total calculado automáticamente (días * precioDiarioSnapshot)."""
    importeTotal: Float!
    estado: EstadoReserva!
    """Cantidad de días totales que dura el alquiler."""
    cantidadDias: Int!
  }

  """Parámetros requeridos y opcionales para buscar autos libres."""
  input FiltroDisponibilidadInput {
    """Fecha de inicio deseada (formato ISO 8601). ¡Obligatorio!"""
    fechaInicio: String!
    """Fecha de devolución deseada (formato ISO 8601). ¡Obligatorio!"""
    fechaFin: String!
    tipoVehiculo: TipoVehiculo
    marca: String
    modelo: String
    precioMin: Float
    precioMax: Float
  }

  """Parámetros opcionales para buscar y filtrar reservas existentes."""
  input FiltroReservaInput {
    clienteId: ID
    vehiculoId: ID
    tipoVehiculo: TipoVehiculo
    estado: EstadoReserva
    fechaInicioDesde: String
    fechaFinHasta: String
  }

  """Consultas disponibles para leer datos desde el cliente (Frontend)."""
  type Query {
    """Ping de prueba para verificar que el servidor GraphQL esté vivo."""
    health: String
    
    """
    Busca los vehículos que están disponibles para alquilar en un rango de fechas.
    Cruza la información con las reservas confirmadas para evitar solapamientos.
    """
    consultarDisponibilidad(filtro: FiltroDisponibilidadInput!): [Vehiculo!]!
    
    """
    Busca reservas en el sistema aplicando múltiples filtros opcionales.
    Ideal para el panel del administrador.
    """
    consultarReservas(filtro: FiltroReservaInput): [Reserva!]!
    
    """
    Trae todo el historial de alquileres (pasados y futuros) de un cliente específico.
    Solo tenés que pasarle el ID del cliente.
    """
    historialAlquileres(clienteId: ID!): [Reserva!]!
  }
`;

module.exports = typeDefs;