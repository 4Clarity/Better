import Keycloak from 'keycloak-js';

// Keycloak client configuration
const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_BASE_URL || 'http://localhost:8888',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'tip-realm',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'tip-frontend',
};

// Create Keycloak instance
const keycloak = new Keycloak(keycloakConfig);

// Keycloak initialization options
export const keycloakInitOptions = {
  onLoad: 'check-sso' as const,
  silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
  pkceMethod: 'S256' as const,
  enableLogging: import.meta.env.DEV,
  checkLoginIframe: false, // Disable for better performance in development
  flow: 'standard' as const,
};

// Keycloak token configuration
export const keycloakTokens = {
  refreshInterval: 60, // Refresh token every minute
  minValiditySeconds: 30, // Minimum validity before refresh
};

export default keycloak;