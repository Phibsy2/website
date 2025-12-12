# Root Dockerfile - verweist auf Backend
# Für Railway Deployment

FROM node:20-alpine AS builder
WORKDIR /app

# Backend-Dateien kopieren
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm install
RUN npx prisma generate

COPY backend/ .
RUN npm run build

# Production Stage
FROM node:20-alpine AS production
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder /app/prisma ./prisma/
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

RUN mkdir -p logs && chown -R nodejs:nodejs logs
RUN chown -R nodejs:nodejs /app

USER nodejs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
