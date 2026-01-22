FROM node:20-slim

WORKDIR /app

# Install deps first (better caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app source
COPY . .

# Cloud Run listens on $PORT
ENV PORT=8080
EXPOSE 8080

CMD ["node", "src/server.js"]
