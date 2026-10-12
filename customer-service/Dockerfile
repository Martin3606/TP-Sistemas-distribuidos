FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY proto ./proto
RUN python -m grpc_tools.protoc -I proto --python_out=. --grpc_python_out=. proto/customer.proto
COPY db.py server.py ./
EXPOSE 50052
CMD ["python", "-u", "server.py"]
