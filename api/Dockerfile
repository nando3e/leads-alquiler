# Build context debe ser la raíz del repo (docker-compose: context: ., dockerfile: api/Dockerfile)
# para poder copiar api/ y scripts/.
FROM node:20-alpine

WORKDIR /app

COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev

COPY api/ .
COPY scripts/ ./scripts/

ENV PORT=3001
EXPOSE 3001

CMD ["node", "server.js"]
