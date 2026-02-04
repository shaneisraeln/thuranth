FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copy workspace packages
COPY packages/ ./packages/
COPY apps/vehicle-tracking/ ./apps/vehicle-tracking/

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build --workspace=@pdcp/vehicle-tracking

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start", "--workspace=@pdcp/vehicle-tracking"]