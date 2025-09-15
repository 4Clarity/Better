#!/bin/bash

echo "Getting admin token..."
TOKEN_RESPONSE=$(curl -s -X POST 'http://auth.tip.localhost/realms/master/protocol/openid-connect/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'username=admin&password=admin&grant_type=password&client_id=admin-cli')

echo "Token response: $TOKEN_RESPONSE"

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

echo "Extracted token: ${TOKEN:0:50}..."

echo "Creating admin user..."
RESPONSE=$(curl -s -X POST 'http://auth.tip.localhost/admin/realms/tip/users' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "richard.roach",
    "email": "Richard.Roach@gmail.com",
    "firstName": "Richard",
    "lastName": "Roach",
    "enabled": true,
    "emailVerified": true,
    "credentials": [{
      "type": "password",
      "value": "admin123",
      "temporary": false
    }]
  }')

echo "User creation response: $RESPONSE"

echo "Done!"