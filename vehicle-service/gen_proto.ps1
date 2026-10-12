# Genera los stubs gRPC para correr el servicio FUERA de Docker.
# Uso (desde vehicle-service/):  .\gen_proto.ps1
python -m grpc_tools.protoc -I proto --python_out=. --grpc_python_out=. proto/vehicle.proto
