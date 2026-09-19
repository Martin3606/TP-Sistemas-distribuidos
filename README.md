# TP Sistemas Distribuidos - Rentar

Sistema de alquiler de vehículos (UNLa - Desarrollo de Software en Sistemas Distribuidos).

## Requisitos previos

- [Docker](https://www.docker.com/products/docker-desktop/) y Docker Compose
- Python 3.11+ (para `backend-rest`)
- Java 17+ y Maven (para `backend-graphql`)

## 1. Levantar la base de datos

Desde la raíz del proyecto:

```bash
docker-compose up -d
```

Esto crea un contenedor MySQL expuesto en el puerto `3307` de tu máquina
(usamos 3307 y no el 3306 de siempre porque es común tener ya un MySQL
instalado localmente ocupando ese puerto), con la base `rentar` y todas
las tablas del `db/init.sql` ya creadas. No hace falta crear nada a mano.

Para verificar que arrancó bien:

```bash
docker exec -it rentar-mysql mysql -u rentar_user -prentar_pass rentar -e "SHOW TABLES;"
```

Deberías ver `cliente`, `vehiculo` y `reserva`.

Para apagarla: `docker-compose down` (los datos persisten).
Para reiniciar todo desde cero (borra los datos): `docker-compose down -v`.

## 2. Backend REST (Python)

```bash
cd backend-rest
cp .env.example .env
python -m venv venv
source venv/bin/activate   # en Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Swagger disponible en `http://localhost:8000/docs`.
Probá `http://localhost:8000/health` — si responde `{"status":"ok","database":"connected"}`, ya está hablando con MySQL correctamente.

## 3. Backend GraphQL (Java)

```bash
cd backend-graphql
mvn spring-boot:run
```

Playground disponible en `http://localhost:8080/graphiql`. Probá esta query
para confirmar que el servidor levantó bien:

```graphql
query {
  health
}
```

Debería responder `"ok"`.

## Estructura del repositorio

```
.
├── backend-rest/       Python - endpoints REST (ABM vehículos, clientes, reservas)
├── backend-graphql/    Java - queries GraphQL (disponibilidad, historial, consultas)
├── frontend/           Interfaz web (pendiente)
├── db/
│   └── init.sql        Script de creación de la base de datos
├── docker-compose.yml
└── README.md
```

## Integrantes y tareas

- (completar por tarjeta / hito)
