// Auth module exports
export { AuthenticationService } from './auth.service';
export { authenticate, requireRoles, optionalAuth, registerAuthDecorators } from './auth.middleware';
export { authRoutes } from './auth.routes';
export type { AuthUser, TokenPayload, UserSession } from './auth.service';