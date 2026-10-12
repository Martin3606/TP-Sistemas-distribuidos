# TP Sistemas Distribuidos - Rentar 🚗

Sistema web de alquiler de vehículos desarrollado para la materia **Desarrollo de Software en Sistemas Distribuidos** de la **Universidad Nacional de Lanús (UNLa)**.

## Requisitos previos

- [Docker](https://www.docker.com/products/docker-desktop/) y Docker Compose
- Python 3.11+ (para `backend-rest`)
- Java 17+ y Maven (para `backend-graphql`)
- Node.js 18+ (para el `frontend`)

## 1. Levantar la base de datos

Desde la raíz del proyecto:

```bash
docker-compose up -d
```

Esto levanta los servicios del proyecto. MySQL escucha en el puerto `3306` dentro de Docker y se publica como `3307` en tu máquina (host `3307` → contenedor `3306`), para evitar conflictos con un MySQL local. La inicialización usa `db/init.sql`.

Para verificar que arrancó bien:

```bash
docker exec -it rentar-mysql mysql -u rentar_user -prentar_pass rentar -e "SHOW TABLES;"
```

Deberías ver las tablas: `cliente`, `reserva`, `usuario` y `vehiculo`.

Para apagarla: `docker-compose down` (los datos persisten).
Para reiniciar todo desde cero (borra los datos): `docker-compose down -v`.

## 2. Backend REST (Python)

Se encarga del ABM de vehículos, ABM de clientes, alta/cancelación de reservas y el sistema de **Autenticación (JWT)**.

```bash
cd backend-rest
cp .env.example .env
python -m venv venv
source venv/bin/activate   # en Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

📚 **Swagger** disponible en `http://localhost:8000/docs`.
Probá `http://localhost:8000/health` — si responde `{"status":"ok","database":"connected"}`, ya está hablando con MySQL correctamente.

## 3. Backend GraphQL (Java)

Se encarga de las consultas dinámicas (catálogo de disponibilidad, historial y mis reservas), interceptando y validando el token JWT.

```bash
cd backend-graphql
mvn clean compile
mvn spring-boot:run
```

🔍 **Playground GraphiQL** disponible en `http://localhost:8080/graphiql`. Probá esta query para confirmar que el servidor levantó bien (debería responder `"ok"`):

```graphql
query {
  health
}
```

## 4. Frontend (React / Vite)

Interfaz gráfica SPA (Single Page Application) integrada con ambos backends. Incluye ruteo protegido por roles, sanitización de errores y flujos completos para Administradores y Clientes.

```bash
cd frontend
npm install
npm run dev
```
🌐 **Aplicación Web:** [http://localhost:5173](http://localhost:5173)

### 🔐 Credenciales de Prueba

Una vez que levantes el frontend, puedes probar el sistema con estos usuarios:

| Rol | Email | Contraseña |
| :--- | :--- | :--- |
| **Administrador** | `admin@rentar.com` | `admin123` |
| **Cliente** | `juan.perez@mail.com` | `cliente123` |

## Estructura del repositorio

```text
.
├── backend-rest/       Python - FastAPI (ABMs, Auth JWT, Reservas)
├── backend-graphql/    Java - Spring Boot (Catálogo, Historiales, GraphQL)
├── frontend/           React + Vite - Interfaz web completa y protegida
├── docs/               Documentación, informe y diagrama DER
├── db/
│   ├── init.sql        Script de creación de la base de datos
│   └── seed.sql        Carga de datos y usuarios iniciales
├── docker-compose.yml
└── README.md
```
