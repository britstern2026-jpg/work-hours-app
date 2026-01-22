FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# DEBUG: print what files actually exist inside the image
RUN echo "==== /app ====" && ls -la /app && \
    echo "==== /app/src ====" && ls -la /app/src || true && \
    echo "==== /app/src/routes ====" && ls -la /app/src/routes || true

ENV PORT=8080
EXPOSE 8080

CMD ["node", "./src/server.js"]
