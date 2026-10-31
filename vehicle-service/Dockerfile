FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY proto ./proto
# Genera vehicle_pb2.py y vehicle_pb2_grpc.py a partir del contrato
RUN python -m grpc_tools.protoc -I proto --python_out=. --grpc_python_out=. proto/vehicle.proto
COPY db.py messaging.py server.py ./
EXPOSE 50051
CMD ["python", "-u", "server.py"]
