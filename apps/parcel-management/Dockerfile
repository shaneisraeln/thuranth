FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copy workspace packages
COPY packages/ ./packages/
COPY apps/parcel-management/ ./apps/parcel-management/

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build --workspace=@pdcp/parcel-management

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start", "--workspace=@pdcp/parcel-management"]