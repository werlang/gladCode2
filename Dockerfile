FROM node:22
WORKDIR /app
COPY node/package.json .
RUN npm install
