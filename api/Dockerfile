FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Puerto interno del contenedor (el mapeo al host se hace en compose)
ENV PORT=3001
EXPOSE 3001

CMD ["node", "server.js"]
