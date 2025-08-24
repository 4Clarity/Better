#!/bin/bash

# Transition Intelligence Platform - Setup Script
# This script sets up the TIP backend development environment

set -e

echo "🚀 Setting up Transition Intelligence Platform Backend..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    print_status "Checking Docker..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Check if .env file exists
check_env_file() {
    print_status "Checking environment configuration..."
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        cp .env.example .env
        print_warning "Please review and update .env file with your specific configuration"
    fi
    print_success "Environment file configured"
}

# Install Node.js dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Start infrastructure services
start_infrastructure() {
    print_status "Starting infrastructure services..."
    print_status "This may take a few minutes on first run..."
    
    docker-compose up -d postgres minio keycloak-db redis elasticsearch
    
    print_status "Waiting for PostgreSQL to be ready..."
    sleep 10
    
    # Wait for PostgreSQL to be ready
    until docker-compose exec -T postgres pg_isready -U tip_user -d tip_database; do
        print_status "Waiting for PostgreSQL..."
        sleep 2
    done
    
    print_success "PostgreSQL is ready"
    
    # Start Keycloak after its database is ready
    print_status "Starting Keycloak..."
    docker-compose up -d keycloak
    
    print_success "Infrastructure services started"
}

# Generate Prisma client
generate_prisma_client() {
    print_status "Generating Prisma client..."
    npm run db:generate
    print_success "Prisma client generated"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    npm run db:migrate:deploy
    print_success "Database migrations completed"
}

# Seed database
seed_database() {
    print_status "Seeding database with initial data..."
    npm run db:seed
    print_success "Database seeding completed"
}

# Create MinIO bucket
setup_minio() {
    print_status "Setting up MinIO storage..."
    sleep 5 # Wait for MinIO to be ready
    
    # Create bucket using MinIO client (if available)
    if command -v mc &> /dev/null; then
        mc alias set local http://localhost:9000 minioadmin minioadmin
        mc mb local/tip-artifacts --ignore-existing
        print_success "MinIO bucket created"
    else
        print_warning "MinIO client not found. Please create 'tip-artifacts' bucket manually at http://localhost:9001"
    fi
}

# Display service URLs
show_service_urls() {
    echo ""
    print_success "Setup completed! 🎉"
    echo ""
    echo "Service URLs:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 API Server:          http://localhost:3000"
    echo "🗄️  Database:           localhost:5432"
    echo "🔧 Prisma Studio:       Run 'npm run db:studio'"
    echo "📁 MinIO Console:       http://localhost:9001"
    echo "🔐 Keycloak Admin:      http://localhost:8080"
    echo "🔍 Elasticsearch:       http://localhost:9200"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Default Credentials:"
    echo "• MinIO:     minioadmin / minioadmin"
    echo "• Keycloak:  admin / admin"
    echo ""
    echo "To start the development server:"
    echo "  npm run dev"
    echo ""
    echo "To stop all services:"
    echo "  docker-compose down"
    echo ""
}

# Main execution
main() {
    echo "=================================================="
    echo "  Transition Intelligence Platform Setup"
    echo "=================================================="
    echo ""
    
    check_docker
    check_env_file
    install_dependencies
    start_infrastructure
    generate_prisma_client
    run_migrations
    seed_database
    setup_minio
    show_service_urls
}

# Handle script termination
cleanup() {
    print_warning "Setup interrupted. You may need to run 'docker-compose down' to clean up."
}

trap cleanup INT

# Run main function
main "$@"