# Usamos una imagen liviana de Python
FROM python:3.11-slim

# Directorio de trabajo en el contenedor
WORKDIR /app

# Copiamos las dependencias primero para aprovechar el caché de Docker
COPY requirements.txt .

# Instalamos las librerías
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el resto del código
COPY . .

# Comando para ejecutar el servicio
CMD ["python", "-u", "main.py"] 
# El -u (unbuffered) es clave para ver los prints en tiempo real en los logs de Docker