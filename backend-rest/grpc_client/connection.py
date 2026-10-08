import sys
import os
import grpc

# --- AJUSTE DE RUTAS PARA gRPC ---
# Agregamos la carpeta grpc_client al path de Python para que reconozca los imports internos de los archivos autogenerados
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Ahora sí, importamos el stub sin que Python se queje
from grpc_client import customer_pb2_grpc

# Suponemos que el microservicio de Java se levantará en el puerto 9090
CUSTOMER_SERVICE_URL = "localhost:9090"

def get_customer_stub():
    # Insecure channel se usa para desarrollo local (sin certificados SSL)
    channel = grpc.insecure_channel(CUSTOMER_SERVICE_URL)
    stub = customer_pb2_grpc.CustomerServiceStub(channel)
    return stub