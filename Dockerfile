# syntax=docker/dockerfile:1.7

# Node 20 (matches your local v20.19.5)
FROM node:20-alpine AS base
ENV NODE_ENV=production
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source (if you have src/, this grabs it; if server.js sits in root, it's fine too)
COPY . .

# Drop root for safety
RUN addgroup -S nodegrp && adduser -S nodeuser -G nodegrp
USER nodeuser

# Render will inject PORT at runtime; your server must read process.env.PORT
EXPOSE 3000
CMD ["npm", "start"]