FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copy workspace packages
COPY packages/ ./packages/
COPY apps/analytics-service/ ./apps/analytics-service/

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build --workspace=@pdcp/analytics-service

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start", "--workspace=@pdcp/analytics-service"]