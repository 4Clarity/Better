#!/bin/bash

# Authentication System Test Runner
# This script starts the services and runs comprehensive authentication tests

set -e

echo "🧪 Starting Authentication System Tests"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${BLUE}🐳 Starting Docker services...${NC}"
cd .. && docker-compose up -d postgres mailhog redis

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Check if services are running
if ! docker-compose ps | grep -q "postgres.*Up"; then
    echo -e "${RED}❌ PostgreSQL is not running${NC}"
    exit 1
fi

if ! docker-compose ps | grep -q "mailhog.*Up"; then
    echo -e "${RED}❌ MailHog is not running${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker services are running${NC}"

# Go back to backend directory
cd backend-node

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Using environment variables.${NC}"
fi

# Run database migrations
echo -e "${BLUE}🔄 Running database migrations...${NC}"
npx prisma generate
npx prisma db push

# Start the backend server in background
echo -e "${BLUE}🚀 Starting backend server...${NC}"
npm run dev &
SERVER_PID=$!

# Wait for server to start
echo -e "${BLUE}⏳ Waiting for server to start...${NC}"
sleep 15

# Check if server is running
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ Backend server failed to start${NC}"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✅ Backend server is running${NC}"

# Run the authentication tests
echo -e "${BLUE}🧪 Running authentication tests...${NC}"
echo ""

# Check if axios is installed for the test script
if ! node -e "require('axios')" 2>/dev/null; then
    echo -e "${BLUE}📦 Installing test dependencies...${NC}"
    npm install axios --save-dev
fi

# Run the test script
node test-authentication.js http://localhost:3000

TEST_EXIT_CODE=$?

# Cleanup
echo -e "${BLUE}🧹 Cleaning up...${NC}"
kill $SERVER_PID 2>/dev/null || true

# Stop Docker services
cd .. && docker-compose down > /dev/null 2>&1

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}🎉 Authentication tests completed successfully!${NC}"
else
    echo -e "${RED}❌ Authentication tests failed with exit code $TEST_EXIT_CODE${NC}"
fi

echo -e "${BLUE}📊 Test Summary Available Above${NC}"
echo "======================================"

exit $TEST_EXIT_CODE