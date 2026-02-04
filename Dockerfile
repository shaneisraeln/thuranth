# Multi-stage build for PDCP system
FROM node:18-alpine as base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copy packages
COPY packages/ ./packages/

# Install dependencies
RUN npm ci

# Copy all apps
COPY apps/ ./apps/

# Build all packages and apps
#RUN npm run build

# Production stage - API Gateway (main entry point)
FROM node:18-alpine as production

WORKDIR /app

# Copy built application
#COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package*.json ./

# Expose port
EXPOSE 3000

# Start the API Gateway
CMD ["sh", "-c", "tail -f /dev/null"]

