import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { AuthenticationService, AuthUser } from './auth.service';

const authService = new AuthenticationService();

// Extend Fastify request type to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

/**
 * Authentication middleware for Fastify
 * Validates JWT token and sets request.user
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Check for development bypass
    if (process.env.AUTH_BYPASS === 'true' || request.headers['x-auth-bypass']) {
      const demoUser = authService.createDemoUser();
      request.user = demoUser;
      return;
    }

    const token = extractToken(request);
    if (!token) {
      return reply.status(401).send({
        error: 'Authentication required',
        message: 'No valid authentication token provided',
      });
    }

    const user = await authService.validateToken(token);
    request.user = user;
    
    // Record login activity
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];
    await authService.recordLogin(user.id, ipAddress, userAgent);
    
  } catch (error) {
    return reply.status(401).send({
      error: 'Invalid authentication',
      message: error instanceof Error ? error.message : 'Authentication failed',
    });
  }
}

/**
 * Role-based authorization middleware
 */
export function requireRoles(requiredRoles: string[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Authentication required',
        message: 'User must be authenticated',
      });
    }

    const hasRequiredRole = requiredRoles.some(role => 
      request.user?.roles.includes(role)
    );

    if (!hasRequiredRole) {
      return reply.status(403).send({
        error: 'Insufficient permissions',
        message: `Required roles: ${requiredRoles.join(', ')}`,
      });
    }
  };
}

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export async function optionalAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Check for development bypass
    if (process.env.AUTH_BYPASS === 'true' || request.headers['x-auth-bypass']) {
      const demoUser = authService.createDemoUser();
      request.user = demoUser;
      return;
    }

    const token = extractToken(request);
    if (token) {
      const user = await authService.validateToken(token);
      request.user = user;
    }
  } catch (error) {
    // For optional auth, we don't fail - just continue without user
    request.log.debug('Optional authentication failed:', error);
  }
}

/**
 * Extract JWT token from Authorization header or query params
 */
function extractToken(request: FastifyRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check query parameter (for WebSocket or similar)
  const query = request.query as any;
  if (query?.token) {
    return query.token;
  }

  return null;
}

/**
 * Register authentication decorators and handlers
 */
export async function registerAuthDecorators(fastify: FastifyInstance) {
  // Register authentication decorator
  fastify.decorate('authenticate', authenticate);
  
  // Register role-based authorization decorator
  fastify.decorate('requireRoles', requireRoles);
  
  // Register optional authentication decorator  
  fastify.decorate('optionalAuth', optionalAuth);

  // Helper decorator to check if user has role
  fastify.decorateRequest('hasRole', function (this: FastifyRequest, role: string): boolean {
    return this.user?.roles.includes(role) || false;
  });

  // Helper decorator to check if user has any of the roles
  fastify.decorateRequest('hasAnyRole', function (this: FastifyRequest, roles: string[]): boolean {
    return roles.some(role => this.user?.roles.includes(role)) || false;
  });

  // Helper decorator to check if user is admin
  fastify.decorateRequest('isAdmin', function (this: FastifyRequest): boolean {
    return this.user?.roles.includes('admin') || false;
  });
}

// Extend Fastify instance type to include our decorators
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authenticate;
    requireRoles: typeof requireRoles;
    optionalAuth: typeof optionalAuth;
  }
  
  interface FastifyRequest {
    hasRole: (role: string) => boolean;
    hasAnyRole: (roles: string[]) => boolean;
    isAdmin: () => boolean;
  }
}