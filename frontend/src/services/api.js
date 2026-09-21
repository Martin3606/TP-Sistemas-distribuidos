export const REST_URL = "http://localhost:8000";
export const GRAPHQL_URL = "http://localhost:8080/graphql";

/**
 * Helper para peticiones HTTP a la API REST (FastAPI :8000)
 */
export async function fetchREST(endpoint, options = {}) {
  try {
    const url = endpoint.startsWith("http") ? endpoint : `${REST_URL}${endpoint}`;
    const response = await fetch(url, options);

    if (!response.ok) {
      let errorMessage = `Error HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        if (typeof errorData.detail === "string") {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((e) => e.msg || e.detail).join(" | ");
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // No era respuesta JSON
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (error.name === "TypeError" || (error.message && (error.message.includes("fetch") || error.message.includes("Failed to fetch") || error.message.includes("NetworkError")))) {
      throw new Error("Error de conexión con el servidor");
    }
    throw error;
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
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status} en servidor GraphQL.`);
    }

    const json = await response.json();

    if (json.errors && json.errors.length > 0) {
      const rawMessage = json.errors[0].message || "";
      if (rawMessage.includes("INTERNAL_ERROR") || rawMessage.includes("Internal Server Error")) {
        throw new Error("Ocurrió un error al procesar la solicitud. Verifique los datos ingresados.");
      }
      throw new Error(rawMessage || "Ocurrió un error al procesar la solicitud. Verifique los datos ingresados.");
    }

    return json.data;
  } catch (error) {
    if (error.name === "TypeError" || (error.message && (error.message.includes("fetch") || error.message.includes("Failed to fetch") || error.message.includes("NetworkError")))) {
      throw new Error("Error de conexión con el servidor");
    }
    throw error;
  }
}
