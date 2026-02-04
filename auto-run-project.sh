#!/bin/bash

##############################################################################
# PDCP Autonomous Project Startup Script
# This script automatically sets up and runs the entire project
##############################################################################

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Post-Dispatch Consolidation Platform (PDCP)                   ║"
echo "║  Autonomous Startup Script                                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions for logging
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Check Node.js version
log_info "Checking Node.js version..."
NODE_VERSION=$(node --version)
log_success "Node.js version: $NODE_VERSION"

# Step 2: Create .env file if it doesn't exist
log_info "Setting up environment variables..."
if [ ! -f .env.development ]; then
    log_warning ".env.development not found, creating from .env.example"
    cp .env.example .env.development
    log_success ".env.development created"
else
    log_success ".env.development already exists"
fi

# Step 3: Install dependencies
log_info "Installing npm dependencies (this may take a few minutes)..."
if npm install --force; then
    log_success "Dependencies installed successfully"
else
    log_error "Failed to install dependencies"
    exit 1
fi

# Step 4: Start Docker services (PostgreSQL & Redis)
log_info "Starting Docker services (PostgreSQL & Redis)..."
if docker-compose up -d; then
    log_success "Docker services started"
    sleep 5  # Wait for services to be ready
    log_info "Waiting for services to be healthy..."
    sleep 10
else
    log_warning "Could not start Docker services, you may need to start them manually"
fi

# Step 5: Build all services
log_info "Building all services..."
if npm run build; then
    log_success "All services built successfully"
else
    log_error "Failed to build services"
    exit 1
fi

# Step 6: Setup database
log_info "Setting up database..."
if [ -f setup-database.js ]; then
    node setup-database.js || log_warning "Database setup had issues but continuing..."
else
    log_warning "Database setup script not found"
fi

# Step 7: Start the project in development mode
log_info "Starting all services in development mode..."
log_info ""
log_info "Services will start at:"
echo -e "${BLUE}"
echo "  • API Gateway:      http://localhost:3000"
echo "  • Decision Engine:   http://localhost:3001/api/docs"
echo "  • Vehicle Tracking:  http://localhost:3002/api/docs"
echo "  • Auth Service:      http://localhost:3003/api/docs"
echo "  • Parcel Management: http://localhost:3004/api/docs"
echo "  • Custody Service:   http://localhost:3005/api/docs"
echo "  • Analytics Service: http://localhost:3006/api/docs"
echo "  • Audit Service:     http://localhost:3007/api/docs"
echo -e "${NC}"
log_info ""

# Start the dev server
npm run dev

# If npm run dev completes (shouldn't happen in dev mode), show completion message
log_success "PDCP System startup sequence complete!"
