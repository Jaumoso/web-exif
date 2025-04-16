FROM node:23-slim

WORKDIR /app

COPY package*.json ./
RUN npm install && mkdir media

COPY server.js /app

EXPOSE 3000
CMD ["node", "server.js"]