export const REST_URL = "http://localhost:8000";
export const GRAPHQL_URL = "http://localhost:8080/graphql";

function getAuthHeaders() {
  const token = localStorage.getItem("rentar_token");
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Sanitiza y traduce mensajes de error técnicos, trazas o excepciones SQL
 * a mensajes claros y amigables para el usuario final.
 */
export function sanitizarMensajeError(rawError) {
  if (!rawError) return "Ocurrió un error inesperado. Por favor, intente nuevamente.";

  const message = typeof rawError === "string" ? rawError : rawError.message || String(rawError);

  const lower = message.toLowerCase();

  // Errores de red y conexión
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("connection refused") ||
    lower.includes("error de conexión")
  ) {
    return "No se pudo establecer conexión con el servidor. Verifique su conexión de red.";
  }

  // Errores de autenticación y autorización
  if (lower.includes("401") || lower.includes("token") || lower.includes("expirado") || lower.includes("unauthorized")) {
    return "Su sesión ha expirado o no es válida. Por favor, vuelva a iniciar sesión.";
  }
  if (lower.includes("403") || lower.includes("forbidden") || lower.includes("no está autorizado") || lower.includes("permisos")) {
    return "No posee permisos suficientes para realizar esta acción.";
  }

  // Errores de disponibilidad y reservas
  if (
    lower.includes("solapa") ||
    lower.includes("no está disponible") ||
    lower.includes("disponibilidad") ||
    lower.includes("período solicitado")
  ) {
    return "El vehículo no se encuentra disponible durante las fechas seleccionadas.";
  }

  // Validaciones de fechas
  if (lower.includes("futura")) {
    return "La fecha de inicio de la reserva debe ser posterior a la fecha y hora actual.";
  }
  if (lower.includes("posterior")) {
    return "La fecha de finalización debe ser posterior a la fecha de inicio.";
  }


  // Errores de duplicados / Base de Datos / SQL
  if (
    lower.includes("patente ya existe") ||
    lower.includes("duplicate entry") ||
    lower.includes("1062") ||
    lower.includes("uq_vehiculo_patente")
  ) {
    return "Ya existe un vehículo registrado con la patente ingresada.";
  }

  if (
    lower.includes("documento") && (lower.includes("registrado") || lower.includes("duplicate") || lower.includes("1062"))
  ) {
    return "Ya existe un cliente registrado con ese número de documento.";
  }

  if (
    lower.includes("email") && (lower.includes("registrado") || lower.includes("duplicate") || lower.includes("1062"))
  ) {
    return "Ya existe un cliente registrado con ese correo electrónico.";
  }

  // Errores de recursos no encontrados (404)
  if (lower.includes("404") || lower.includes("no se encontró") || lower.includes("not found")) {
    return "El registro o recurso solicitado no fue encontrado en el sistema.";
  }

  // Sanitización de excepciones genéricas de BD / GraphQL / Java / Python
  if (
    lower.includes("sql") ||
    lower.includes("integrityerror") ||
    lower.includes("internal_error") ||
    lower.includes("internal server error") ||
    lower.includes("java.lang") ||
    lower.includes("nullpointer") ||
    lower.includes("exception") ||
    lower.includes("traceback")
  ) {
    return "Ocurrió un inconveniente al procesar la solicitud. Verifique los datos ingresados.";
  }

  // Si ya es un mensaje amigable enviado en castellano por FastAPI o Spring Boot
  return message;
}

/**
 * Helper para peticiones HTTP a la API REST (FastAPI :8000)
 */
export async function fetchREST(endpoint, options = {}) {
  try {
    const url = endpoint.startsWith("http") ? endpoint : `${REST_URL}${endpoint}`;
    
    const headers = {
      ...getAuthHeaders(),
      ...(options.headers || {})
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      let rawMessage = `Error HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        if (typeof errorData.detail === "string") {
          rawMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          rawMessage = errorData.detail.map((e) => e.msg || e.detail).join(" | ");
        } else if (errorData.message) {
          rawMessage = errorData.message;
        }
      } catch {
        // No era respuesta JSON
      }
      throw new Error(sanitizarMensajeError(rawMessage));
    }

    return await response.json();
  } catch (error) {
    throw new Error(sanitizarMensajeError(error));
  }
}

/**
 * Helper para realizar consultas y mutaciones a la API GraphQL (Spring Boot :8080)
 */
export async function fetchGraphQL(query, variables = {}) {
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(sanitizarMensajeError(`Error HTTP ${response.status}`));
    }

    const json = await response.json();

    if (json.errors && json.errors.length > 0) {
      const rawMessage = json.errors[0].message || "";
      throw new Error(sanitizarMensajeError(rawMessage));
    }

    return json.data;
  } catch (error) {
    throw new Error(sanitizarMensajeError(error));
  }
}
