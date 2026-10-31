FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY declare_topology.py .

CMD ["python", "-u", "declare_topology.py"]
