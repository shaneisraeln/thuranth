FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/auth-service/package*.json ./apps/auth-service/
COPY packages/types/package*.json ./packages/types/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY apps/auth-service/src ./apps/auth-service/src
COPY packages/types/src ./packages/types/src
COPY packages/shared/src ./packages/shared/src
COPY apps/auth-service/tsconfig.json ./apps/auth-service/
COPY tsconfig.json ./

# Build the application
RUN npm run build --workspace=@pdcp/auth-service

EXPOSE 3003

CMD ["npm", "run", "start", "--workspace=@pdcp/auth-service"]