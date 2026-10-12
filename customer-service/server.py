"""Customer Service - servidor gRPC (puerto 50052).

Responsabilidades (enunciado Hito 2): consultar clientes, consultar uno,
verificar existencia, verificar que esté activo y aplicar las validaciones
propias de los clientes. Además autentica usuarios y emite el JWT (Trello).
Persiste SOLO en db_clientes (tablas cliente y usuario).
"""
import os
import re
from concurrent import futures
from datetime import datetime, timedelta, timezone

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
COLUMNAS = "id, documento, nombre, apellido, email, telefono, activo"

ROL_A_ENUM = {"ADMIN": customer_pb2.ROLE_ADMIN, "CLIENTE": customer_pb2.ROLE_CLIENTE}


def fila_a_customer(r):
    return customer_pb2.Customer(
        id=r.id, documento=r.documento, nombre=r.nombre, apellido=r.apellido,
        email=r.email, telefono=r.telefono or "", activo=bool(r.activo))


class CustomerService(customer_pb2_grpc.CustomerServiceServicer):

    # ---------- autenticación ----------
    def Authenticate(self, request, context):
        with engine.connect() as conn:
            u = conn.execute(text(
                "SELECT id, email, password_hash, rol, cliente_id FROM usuario "
                "WHERE email = :email"), {"email": request.email.strip()}).fetchone()
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

        resp = customer_pb2.AuthenticateResponse(
            token=token, user_id=u.id, email=u.email, rol=ROL_A_ENUM[u.rol])
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
        self._validar(context, request.documento, request.nombre, request.apellido,
                      request.email, request.telefono)
        try:
            with engine.begin() as conn:
                res = conn.execute(text(
                    "INSERT INTO cliente (documento, nombre, apellido, email, telefono, activo) "
                    "VALUES (:doc, :nom, :ape, :email, :tel, TRUE)"),
                    {"doc": request.documento.strip(), "nom": request.nombre.strip(),
                     "ape": request.apellido.strip(), "email": request.email.strip(),
                     "tel": request.telefono or None})
                nuevo_id = res.lastrowid
        except IntegrityError as exc:
            self._traducir_duplicado(exc, context, request.documento, request.email)
            raise
        return customer_pb2.CustomerResponse(cliente=self._obtener(nuevo_id, context))

    def UpdateCustomer(self, request, context):
        """Actualización: los campos de texto vacíos se conservan.

        `activo` (bool) siempre se aplica: para dar de baja un cliente el
        Gateway debe enviar los datos actuales con activo=false.
        """
        actual = self._obtener(request.id, context)
        nombre = request.nombre.strip() or actual.nombre
        apellido = request.apellido.strip() or actual.apellido
        email = request.email.strip() or actual.email
        telefono = request.telefono if request.telefono != "" else actual.telefono
        self._validar(context, actual.documento, nombre, apellido, email, telefono)
        try:
            with engine.begin() as conn:
                conn.execute(text(
                    "UPDATE cliente SET nombre=:nom, apellido=:ape, email=:email, "
                    "telefono=:tel, activo=:activo WHERE id=:id"),
                    {"nom": nombre, "ape": apellido, "email": email,
                     "tel": telefono or None, "activo": request.activo, "id": request.id})
        except IntegrityError as exc:
            self._traducir_duplicado(exc, context, actual.documento, email)
            raise
        return customer_pb2.CustomerResponse(cliente=self._obtener(request.id, context))

    # ---------- helpers ----------
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
