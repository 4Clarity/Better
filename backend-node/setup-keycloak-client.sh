#!/bin/bash

echo "Getting admin token..."
TOKEN_RESPONSE=$(curl -s -X POST 'http://auth.tip.localhost/realms/master/protocol/openid-connect/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'username=admin&password=admin&grant_type=password&client_id=admin-cli')

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

echo "Creating TIP client..."
RESPONSE=$(curl -s -X POST 'http://auth.tip.localhost/admin/realms/tip/clients' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "clientId": "tip-app",
    "name": "TIP Application",
    "description": "TIP Application Client",
    "enabled": true,
    "directAccessGrantsEnabled": true,
    "publicClient": true,
    "webOrigins": ["http://tip.localhost", "http://localhost:*"],
    "redirectUris": ["http://tip.localhost/*", "http://localhost:*"],
    "protocol": "openid-connect"
  }')

echo "Client creation response: $RESPONSE"

echo "Getting user token with new client..."
USER_TOKEN_RESPONSE=$(curl -s -X POST 'http://auth.tip.localhost/realms/tip/protocol/openid-connect/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'username=richard.roach&password=admin123&grant_type=password&client_id=tip-app')

echo ""
echo "=== ADMIN USER TOKEN FOR BROWSER LOGIN ==="
echo "$USER_TOKEN_RESPONSE"
echo "==========================================="

echo "Done!"