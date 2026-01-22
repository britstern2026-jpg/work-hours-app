FROM node:20-slim

WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Cloud Run
ENV PORT=8080
EXPOSE 8080

# Log node version (helps debugging)
RUN node -v

CMD ["node", "./src/server.js"]
