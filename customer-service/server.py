"""Customer Service - servidor gRPC (puerto 50052).

Responsabilidades (enunciado Hito 2): consultar clientes, consultar uno,
verificar existencia, verificar que esté activo y aplicar las validaciones
propias de los clientes. Además autentica usuarios y emite el JWT (Trello).
Persiste SOLO en db_clientes (tablas cliente y usuario).
"""
import os
import re
from concurrent import futures
from datetime import date, datetime, timedelta, timezone

import bcrypt
import grpc
import jwt
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

import customer_pb2
import customer_pb2_grpc
from db import engine, wait_for_db

GRPC_PORT = os.getenv("GRPC_PORT", "50052")
JWT_SECRET = os.getenv("JWT_SECRET", "rentar_jwt_secret_key_1234567890_super_secret")
JWT_ALGORITHM = "HS256"
JWT_HORAS = 24

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
COLUMNAS = "id, documento, nombre, apellido, email, telefono, fecha_nacimiento, activo"

ROL_A_ENUM = {"ADMIN": customer_pb2.ROLE_ADMIN, "CLIENTE": customer_pb2.ROLE_CLIENTE}


def fila_a_customer(r):
    return customer_pb2.Customer(
        id=r.id, documento=r.documento, nombre=r.nombre, apellido=r.apellido,
        email=r.email, telefono=r.telefono or "",
        fecha_nacimiento=r.fecha_nacimiento.isoformat() if r.fecha_nacimiento else "",
        activo=bool(r.activo))


class CustomerService(customer_pb2_grpc.CustomerServiceServicer):

    # ---------- autenticación ----------
    def Authenticate(self, request, context):
        with engine.connect() as conn:
            u = conn.execute(text(
                "SELECT u.id, u.email, u.password_hash, u.rol, u.cliente_id, "
                "c.nombre AS c_nombre, c.apellido AS c_apellido "
                "FROM usuario u LEFT JOIN cliente c ON c.id = u.cliente_id "
                "WHERE u.email = :email"), {"email": request.email.strip()}).fetchone()
        ok = False
        if u is not None:
            try:
                ok = bcrypt.checkpw(request.password.encode("utf-8"),
                                    u.password_hash.encode("utf-8"))
            except ValueError:
                ok = False
        if not ok:
            context.abort(grpc.StatusCode.UNAUTHENTICATED,
                          "Credenciales inválidas (email o contraseña incorrectos)")

        now = datetime.now(timezone.utc)
        token = jwt.encode(
            {"user_id": u.id, "email": u.email, "rol": u.rol, "cliente_id": u.cliente_id,
             "iat": now, "exp": now + timedelta(hours=JWT_HORAS)},
            JWT_SECRET, algorithm=JWT_ALGORITHM)

        if u.c_nombre:
            nombre = f"{u.c_nombre} {u.c_apellido or ''}".strip()
        else:
            nombre = "Administrador"

        resp = customer_pb2.AuthenticateResponse(
            token=token, user_id=u.id, email=u.email, rol=ROL_A_ENUM[u.rol], nombre=nombre)
        if u.cliente_id is not None:
            resp.cliente_id = u.cliente_id
        return resp

    # ---------- consultas ----------
    def ListCustomers(self, request, context):
        sql = f"SELECT {COLUMNAS} FROM cliente"
        if request.solo_activos:
            sql += " WHERE activo = TRUE"
        sql += " ORDER BY id"
        with engine.connect() as conn:
            filas = conn.execute(text(sql)).fetchall()
        return customer_pb2.ListCustomersResponse(clientes=[fila_a_customer(f) for f in filas])

    def GetCustomer(self, request, context):
        return customer_pb2.CustomerResponse(cliente=self._obtener(request.id, context))

    def GetCustomerByDocument(self, request, context):
        documento = (request.documento or "").strip()
        if not documento:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "El documento es obligatorio")
        with engine.connect() as conn:
            fila = conn.execute(text(f"SELECT {COLUMNAS} FROM cliente WHERE documento = :d"),
                                {"d": documento}).fetchone()
        if fila is None:
            context.abort(grpc.StatusCode.NOT_FOUND,
                          "No se encontró ningún cliente registrado para asociar a la reserva")
        return customer_pb2.CustomerResponse(cliente=fila_a_customer(fila))

    def CheckCustomerExists(self, request, context):
        with engine.connect() as conn:
            fila = conn.execute(text("SELECT 1 FROM cliente WHERE id = :id"),
                                {"id": request.id}).fetchone()
        return customer_pb2.CheckCustomerExistsResponse(existe=fila is not None)

    def IsCustomerActive(self, request, context):
        with engine.connect() as conn:
            fila = conn.execute(text("SELECT activo FROM cliente WHERE id = :id"),
                                {"id": request.id}).fetchone()
        return customer_pb2.IsCustomerActiveResponse(activo=bool(fila and fila.activo))

    # ---------- ABM ----------
    def CreateCustomer(self, request, context):
        fecha = self._parsear_fecha(context, request.fecha_nacimiento)
        self._validar(context, request.documento, request.nombre, request.apellido,
                      request.email, request.telefono)
        try:
            with engine.begin() as conn:
                res = conn.execute(text(
                    "INSERT INTO cliente (documento, nombre, apellido, email, telefono, "
                    "fecha_nacimiento, activo) "
                    "VALUES (:doc, :nom, :ape, :email, :tel, :fnac, TRUE)"),
                    {"doc": request.documento.strip(), "nom": request.nombre.strip(),
                     "ape": request.apellido.strip(), "email": request.email.strip(),
                     "tel": request.telefono or None, "fnac": fecha})
                nuevo_id = res.lastrowid
        except IntegrityError as exc:
            self._traducir_duplicado(exc, context, request.documento, request.email)
            raise
        return customer_pb2.CustomerResponse(cliente=self._obtener(nuevo_id, context))

    def UpdateCustomer(self, request, context):
        """Actualización parcial: los campos 'optional' ausentes se conservan.

        Un texto presente pero vacío SÍ se aplica (para telefono y
        fecha_nacimiento significa "borrar el dato"; en los obligatorios es
        un error de validación).
        """
        actual = self._obtener(request.id, context)
        tiene = request.HasField

        documento = request.documento.strip() if tiene("documento") else actual.documento
        nombre = request.nombre.strip() if tiene("nombre") else actual.nombre
        apellido = request.apellido.strip() if tiene("apellido") else actual.apellido
        email = request.email.strip() if tiene("email") else actual.email
        telefono = request.telefono.strip() if tiene("telefono") else actual.telefono
        if tiene("fecha_nacimiento"):
            fecha = self._parsear_fecha(context, request.fecha_nacimiento)
        else:
            fecha = date.fromisoformat(actual.fecha_nacimiento) if actual.fecha_nacimiento else None
        activo = request.activo if tiene("activo") else actual.activo

        self._validar(context, documento, nombre, apellido, email, telefono)
        try:
            with engine.begin() as conn:
                conn.execute(text(
                    "UPDATE cliente SET documento=:doc, nombre=:nom, apellido=:ape, "
                    "email=:email, telefono=:tel, fecha_nacimiento=:fnac, activo=:activo "
                    "WHERE id=:id"),
                    {"doc": documento, "nom": nombre, "ape": apellido, "email": email,
                     "tel": telefono or None, "fnac": fecha, "activo": activo,
                     "id": request.id})
        except IntegrityError as exc:
            self._traducir_duplicado(exc, context, documento, email)
            raise
        return customer_pb2.CustomerResponse(cliente=self._obtener(request.id, context))

    def DeactivateCustomer(self, request, context):
        self._obtener(request.id, context)  # 404 si no existe
        with engine.begin() as conn:
            conn.execute(text("UPDATE cliente SET activo = FALSE WHERE id = :id"),
                         {"id": request.id})
        return customer_pb2.CustomerResponse(cliente=self._obtener(request.id, context))

    # ---------- helpers ----------
    def _parsear_fecha(self, context, valor):
        valor = (valor or "").strip()
        if not valor:
            return None
        try:
            fecha = date.fromisoformat(valor)
        except ValueError:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT,
                          "La fecha de nacimiento debe tener formato YYYY-MM-DD")
        if fecha > date.today():
            context.abort(grpc.StatusCode.INVALID_ARGUMENT,
                          "La fecha de nacimiento no puede ser futura")
        return fecha

    def _validar(self, context, documento, nombre, apellido, email, telefono):
        if not documento or not documento.strip() or len(documento.strip()) > 20:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT,
                          "El documento es obligatorio (máx. 20 caracteres)")
        if not nombre or not nombre.strip() or len(nombre) > 100:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT,
                          "El nombre es obligatorio (máx. 100 caracteres)")
        if not apellido or not apellido.strip() or len(apellido) > 100:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT,
                          "El apellido es obligatorio (máx. 100 caracteres)")
        if not email or not EMAIL_RE.match(email.strip()) or len(email) > 150:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "El email no es válido")
        if telefono and len(telefono) > 30:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT,
                          "El teléfono no puede superar los 30 caracteres")

    def _traducir_duplicado(self, exc, context, documento, email):
        if exc.orig.args[0] != 1062:
            return
        msg = str(exc.orig.args[1]).lower()
        if "documento" in msg:
            context.abort(grpc.StatusCode.ALREADY_EXISTS,
                          f"Ya existe un cliente registrado con el documento '{documento}'.")
        context.abort(grpc.StatusCode.ALREADY_EXISTS,
                      f"Ya existe un cliente registrado con el email '{email}'.")

    def _obtener(self, cliente_id, context):
        with engine.connect() as conn:
            fila = conn.execute(text(f"SELECT {COLUMNAS} FROM cliente WHERE id = :id"),
                                {"id": cliente_id}).fetchone()
        if fila is None:
            context.abort(grpc.StatusCode.NOT_FOUND,
                          f"No se encontró el cliente con ID {cliente_id}.")
        return fila_a_customer(fila)


def serve():
    wait_for_db()
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    customer_pb2_grpc.add_CustomerServiceServicer_to_server(CustomerService(), server)
    server.add_insecure_port(f"[::]:{GRPC_PORT}")
    server.start()
    print(f"[customer-service] gRPC escuchando en :{GRPC_PORT}", flush=True)
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
