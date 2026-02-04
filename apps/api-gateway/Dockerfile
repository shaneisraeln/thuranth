FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api-gateway/package*.json ./apps/api-gateway/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/types/package*.json ./packages/types/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY apps/api-gateway ./apps/api-gateway
COPY packages ./packages

# Build the application
WORKDIR /app/apps/api-gateway
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]