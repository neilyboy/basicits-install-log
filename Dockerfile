FROM node:18-slim AS client-builder

WORKDIR /app/client

COPY client/package*.json ./
RUN npm install

COPY client/ ./
RUN npm run build


FROM node:18-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server

COPY server/package*.json ./
RUN npm install && npm prune --omit=dev

COPY server/ ./

COPY --from=client-builder /app/client/dist /app/client/dist

RUN mkdir -p /data/uploads /data/thumbnails

EXPOSE 3000

ENV PORT=3000
ENV DATA_DIR=/data
ENV NODE_ENV=production

CMD ["node", "src/index.js"]
