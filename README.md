# 🚗 Rentar - Sistema de Gestión de Alquiler de Vehículos

**Universidad Nacional de Lanús (UNLa)**  
**Materia:** Desarrollo de Software en Sistemas Distribuidos  
**Año:** 2026

---

## 📋 Descripción del Proyecto

Sistema web para la empresa **Rentar**, diseñado para administrar una flota de vehículos, gestionar clientes y controlar los alquileres realizados. El desarrollo de este trabajo práctico se divide en tres hitos incrementales, adaptando la interfaz web y aplicando diferentes mecanismos de comunicación entre los componentes.

---

## 🎯 Objetivos y Organización

El seguimiento de las tareas, los requerimientos de cada hito y el estado general del proyecto se gestionan a través de nuestro tablero ágil:

* **Tablero de Trello:** https://trello.com/invite/b/6aa6fcdb9c152274c9fcadfe/ATTIdb3e399d4585cb0f9324b88947220ab843BABD50/sistemas-distribuidos-tp

---

### 🎯 Hitos del Desarrollo
- [x] **Hito 1:** APIs REST y GraphQL.
- [ ] **Hito 2:** Integración con RPC.
- [ ] **Hito 3:** Colas de mensajería (Apache Kafka / RabbitMQ).

---

## 🛠️ Stack Tecnológico (Hito 1)

> **Nota:** Reemplazar con las tecnologías que finalmente elijan en el grupo.

*   **Frontend:** [Ej: React / Vue / Angular]
*   **Backend REST:** [Ej: Node.js (Express) / Java (Spring Boot) / Python]
*   **Backend GraphQL:** [GraphQL Java]
*   **Base de Datos:** [MySQL]
*   **Documentación:** Swagger (REST) y Schema Explorer (GraphQL)

---

## 🚀 Instalación y Ejecución Local

### Precondición 
*   Entorno de ejecución de backend y frontend instalado.
*   Motor de base de datos en ejecución.

### Pasos para levantar el proyecto

1.  **Clonar el repositorio:**
    ```bash
    git clone 
(https://github.com/Martin3606/TP-Sistemas-distribuidos.git)
    cd TP-Sistemas-distribuidos
    ```

2.  **Configurar Base de Datos:**
    *   Ejecutar los scripts de inicialización ubicados en `/docs/database/init.sql`.
    *   Configurar las credenciales en el archivo `.env` dentro de la carpeta del backend.

3.  **Levantar el Backend:**
    ```bash
    cd backend
    npm install 
    npm run dev
    ```

4.  **Levantar el Frontend:**
    ```bash
    cd frontend
    npm install
    npm run start
    ```

---

## 📖 Documentación y Entregables

*   **Estrategia de Resolución:** El detalle de la arquitectura elegida y las decisiones técnicas se encuentra en `/docs/Estrategia_Resolucion.pdf`.
*   **Modelo de Datos:** El diagrama Entidad-Relación (DER) está disponible en `/docs/modelo_datos.png`.
*   **Documentación de APIs:** Una vez levantado el backend, Swagger está disponible en `http://localhost:PUERTO/api-docs`.
*   **Pruebas:** Las capturas de pantalla de los flujos testeados se encuentran en `/docs/testing/`.

---

## 👥 Integrantes del Equipo

Nombre y Apellido:

* Ivan Estanislao Sofia
* Leonardo Martin Vazquez Riveiro
* Federico Acosta Rosales
* Luca Fattorini
* Ivana Leiva Baldis


