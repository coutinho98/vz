# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

# DATABASE_URL dummy: o generate nao conecta ao banco
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm ci && npx prisma generate && npm run build

# ---------- runtime ----------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# so o necessario em runtime
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY prisma.config.ts tsconfig.json ./

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
