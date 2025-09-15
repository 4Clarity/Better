#!/bin/bash

# Get the x5c certificate for the signing key (RS256)
X5C_CERT="MIIClTCCAX0CBgGZTgGONzANBgkqhkiG9w0BAQsFADAOMQwwCgYDVQQDDAN0aXAwHhcNMjUwOTE1MTUzMDQ4WhcNMzUwOTE1MTUzMjI4WjAOMQwwCgYDVQQDDAN0aXAwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC9YBvnFHGfPdynyb2sin1kULmH0HpngsW1iHCR8PPdBTBfoVH7Lt0ZX4+/8GfRc38MuXk3ftCciX3gUYRj5UVCDCoLlAP0WKrC0DFfKuBEybedVXWgg4CmNevbe2LzhF2KDWON37RxcTMWfwf5l7ATXn5Ses/onRiCpcsovstRDObWhA5OkjYd9R3LaYeJ2tT7dxKXrKINy7JrSD+aIS+Z9mkzmXfzbTSvRYB2m33fs+lU0mDtiI7a4ze7CPXEsteDQ7EE3KKqaFZ8ndJ7RHLGColHuLfuq4/aXceoC7CfLJG5iHBIhAPLAYU0Tlk1T/VX0JAGE5BrhgvOm6dxo5xnAgMBAAEwDQYJKoZIhvcNAQELBQADggEBACIwnX5dBYmwWkJMBSal4lLbDy8kz2miv7z0WbuREa9ms3pffzDhTG69j9aEuBqHeCPMOJNnOH0xwv8aTe8COStG5Gkjl87lT2E1/SlgzjiuE9BChZnK2Zjx91lvUQdohQEjHS8Cyj3ZmZJEwNDYT9TWVtrj2+0ra8qekqcyHQJllF13nYwZryfuXKxHslbl7OOoNiqDwoJbqy4ma4ByH298lf0qYJTmAaSg9MPacKOJjktgi8gFh6z6qiGHLCC5rV2dRTtPgQGZ1sLbO8GNflzxLNfu+av+ehH3obT/B2UM+XU5q7Q9Rtrx444928euyZzMpaI/QhBSkx6eHW9N/Lg="

# Convert to PEM format
echo "-----BEGIN CERTIFICATE-----" > keycloak_cert.pem
echo "$X5C_CERT" | fold -w 64 >> keycloak_cert.pem
echo "-----END CERTIFICATE-----" >> keycloak_cert.pem

# Extract public key from certificate
openssl x509 -pubkey -noout -in keycloak_cert.pem > keycloak_public_key.pem

# Display the public key
echo "=== KEYCLOAK PUBLIC KEY ==="
cat keycloak_public_key.pem
echo "=========================="

# Format for .env file (escape newlines)
echo ""
echo "=== FOR .ENV FILE ==="
PUBLIC_KEY=$(cat keycloak_public_key.pem | tr '\n' '\\n')
echo "KEYCLOAK_JWT_PUBLIC_KEY=\"$PUBLIC_KEY\""
echo "===================="

echo "Done!"