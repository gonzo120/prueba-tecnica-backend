# Multi-stage build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Generar Prisma client y compilar
RUN npx prisma generate
RUN npm run build

# Producción
FROM node:20-alpine AS production

WORKDIR /app

# Copiar dependencias de producción
COPY package*.json ./
RUN npm ci --only=production

# Copiar código compilado y Prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Generar Prisma client en producción
RUN npx prisma generate

EXPOSE 3001

CMD ["node", "dist/main.js"]