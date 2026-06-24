# Imagem do bot. Inclui ffmpeg + yt-dlp (backend de YouTube).
# O cobalt roda em outro container (imagem oficial dele).
FROM node:22-slim

# ffmpeg (merge/conversao) + python3 (o yt-dlp oficial e um zipapp que usa Python).
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3 curl ca-certificates \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && apt-get purge -y curl && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/*

# O bot acha os binarios por estes caminhos (em vez de ./bin).
ENV YTDLP_PATH=/usr/local/bin/yt-dlp \
    FFMPEG_DIR=/usr/bin

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

CMD ["node", "src/index.js"]
