FROM node:24-alpine AS builder

WORKDIR /backend

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine

WORKDIR /backend

RUN apk add --no-cache openssl

COPY --from=builder /backend/dist ./dist
COPY --from=builder /backend/node_modules ./node_modules
COPY --from=builder /backend/package*.json ./
COPY --from=builder /backend/prisma ./prisma
COPY --from=builder /backend/prisma.config.ts ./prisma.config.ts

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
