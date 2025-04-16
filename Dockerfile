FROM node:23-slim

WORKDIR /app

# Copiar dependencias del backend
COPY server/package*.json ./server/
RUN cd server && npm install

# Copiar el resto del proyecto
COPY . .

# Crear carpeta de media
RUN mkdir -p server/media

EXPOSE 3000
CMD ["node", "server/server.js"]