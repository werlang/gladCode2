# One-shot database migration runner (see migrate.sh).
# Bakes dependencies at build time so `docker run` never depends on any
# long-lived service or its node_modules volume.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY helpers/ ./helpers/
COPY scripts/ ./scripts/
COPY *.sql ./

CMD ["npm", "run", "db:migrate"]
