#!/bin/sh
# Exit on error
set -e

# Wait for the database to be ready, then run migrations and start the app
./wait-for-it.sh db:5432 --timeout=30 --strict -- echo "Database is ready."
npx prisma db push --accept-data-loss
npm run dev
