# TP Sistemas Distribuidos - Rentar 🚗

Sistema web de alquiler de vehículos desarrollado para la materia **Desarrollo de Software en Sistemas Distribuidos** de la **Universidad Nacional de Lanús (UNLa)**.

## Requisitos previos

- [Docker](https://www.docker.com/products/docker-desktop/) y Docker Compose
- Python 3.11+ (para `backend-rest`)
- Java 17+ y Maven (para `backend-graphql`)
- Node.js 18+ (para el `frontend`)

## 1. Levantar la base de datos, gateway, services

Desde la raíz del proyecto:

```bash
docker compose up -d --build
```

Cargar los datos de prueba (Seed):

docker cp db-dev/seed_hito2.sql rentar-mysql:/tmp/seed_hito2.sql
docker exec -i rentar-mysql sh -c "mysql -uroot -proot < /tmp/seed_hito2.sql"

Para apagarla: `docker-compose down` (los datos persisten).
Para reiniciar todo desde cero (borra los datos): `docker-compose down -v`.

## 2. Frontend (React / Vite)

```bash
cd frontend
npm install
npm run dev
```

### 🔐 Credenciales de Prueba

Una vez que levantes el frontend, puedes probar el sistema con estos usuarios:

| Rol | Email | Contraseña |
| :--- | :--- | :--- |
| **Administrador** | `admin@rentar.com` | `admin123` |
| **Cliente** | `juan.perez@mail.com` | `cliente123` |

## 📚 Documentación de APIs (Hito 2)
- **API REST (Swagger):** Disponible de forma interactiva en `http://localhost:8000/api-docs`.
- **GraphQL:** Esquema documentado y consola interactiva en `http://localhost:8000/graphql`.
