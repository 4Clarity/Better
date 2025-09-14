#!/bin/bash

# Emergency Authentication Migration Script
# This script applies the authentication schema fix to resolve login failures

set -e  # Exit on any error

echo "🚨 EMERGENCY AUTHENTICATION SCHEMA MIGRATION"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "prisma" ]; then
    echo "❌ Error: This script must be run from the backend-node directory"
    exit 1
fi

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL and try again"
    exit 1
fi

echo "📋 Pre-migration checks:"
echo "  ✅ Current directory: $(pwd)"
echo "  ✅ DATABASE_URL configured"
echo ""

# Backup recommendation
echo "⚠️  IMPORTANT: Before proceeding, ensure you have a recent database backup!"
echo "   This migration will modify your database schema and data."
echo ""

# Confirmation prompt
read -p "Do you want to proceed with the migration? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "🔧 Starting emergency authentication migration..."
echo ""

# Step 1: Check current migration status
echo "1️⃣ Checking current migration status..."
npx prisma migrate status || echo "Migration status check completed"
echo ""

# Step 2: Generate Prisma client with new schema
echo "2️⃣ Generating Prisma client with updated schema..."
npx prisma generate
echo ""

# Step 3: Apply the migration
echo "3️⃣ Applying authentication schema migration..."
npx prisma migrate deploy
echo ""

# Step 4: Verify migration was applied
echo "4️⃣ Verifying migration was applied successfully..."
npx prisma migrate status
echo ""

# Step 5: Test database connection
echo "5️⃣ Testing database connection..."
npx prisma db pull --print | head -20
echo ""

echo "✅ Migration completed successfully!"
echo ""
echo "📝 Next Steps:"
echo "  1. Restart your application server"
echo "  2. Test authentication functionality"
echo "  3. Monitor application logs for any errors"
echo "  4. Run comprehensive authentication tests"
echo ""

echo "🔍 Verification Commands:"
echo "  • Check user_sessions table: psql \$DATABASE_URL -c '\\d user_sessions'"
echo "  • Check roles table: psql \$DATABASE_URL -c 'SELECT * FROM roles;'"
echo "  • Check migration status: npx prisma migrate status"
echo ""

echo "🎉 Emergency authentication fix deployment complete!"