FROM node:23-slim

WORKDIR /app

RUN mkdir public
RUN mkdir -p server/media

COPY public/ ./public/
COPY server/ ./server/
RUN cd server && npm install

EXPOSE 3000
CMD ["node", "server/server.js"]
