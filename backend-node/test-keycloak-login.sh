#!/bin/bash

TOKEN=$(cat fresh_token.json | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

echo "Testing Keycloak token login..."
curl -X POST 'http://localhost:3000/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d "{\"keycloakToken\": \"$TOKEN\"}"

echo ""
echo "Done!"