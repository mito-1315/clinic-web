# API image. Build from the repo root: docker build -t clinic-api .
FROM node:22-slim
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/api --omit=dev
COPY apps/api apps/api
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
ENV NODE_ENV=production PORT=4000
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy --schema apps/api/prisma/schema.prisma && npx tsx apps/api/src/index.ts"]
