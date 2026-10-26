FROM node:24.22.1-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

FROM base AS development
RUN npm ci --no-audit --no-fund

FROM base AS production
ENV NODE_ENV=production
RUN npm ci --omit=dev --no-audit --no-fund
COPY . .
CMD ["node", "app.js"]
