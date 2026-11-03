FROM node:22-bookworm-slim

# FFmpeg (libx264 + aac) từ kho Debian
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg fonts-noto-core ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force
COPY server.mjs ./
COPY assets ./assets

ENV NODE_ENV=production PORT=8080
EXPOSE 8080
USER node
CMD ["node", "server.mjs"]
