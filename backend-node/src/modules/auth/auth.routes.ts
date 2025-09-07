import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticationService } from './auth.service';

const authService = new AuthenticationService();

export async function authRoutes(fastify: FastifyInstance) {
  // Health check for authentication service
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const config = {
      authBypass: process.env.AUTH_BYPASS === 'true',
      keycloakConfigured: !!process.env.KEYCLOAK_JWT_PUBLIC_KEY,
      jwtConfigured: !!process.env.JWT_SECRET,
    };

    return reply.code(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      config,
    });
  });

  // Regular login endpoint
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { keycloakToken, username, password } = request.body as any;
      
      let user;
      
      if (keycloakToken) {
        // Keycloak SSO login
        try {
          user = await authService.validateKeycloakToken(keycloakToken);
        } catch (error) {
          return reply.code(401).send({
            error: 'Invalid Keycloak token',
            message: error instanceof Error ? error.message : 'Token validation failed',
          });
        }
      } else if (username && password) {
        // Direct username/password login (for development or backup)
        if (username === 'demo' && password === 'demo') {
          user = authService.createDemoUser();
        } else {
          return reply.code(401).send({
            error: 'Invalid credentials',
            message: 'Username or password is incorrect',
          });
        }
      } else {
        return reply.code(400).send({
          error: 'Invalid login request',
          message: 'Either keycloakToken or username/password is required',
        });
      }

      // Generate tokens
      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];
      const tokens = authService.generateTokens(user, userAgent, ipAddress);

      return reply.code(200).send({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          person: user.person,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: 'Bearer',
        },
      });
    } catch (error) {
      fastify.log.error('Login error:', error);
      return reply.code(401).send({
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Login failed',
      });
    }
  });

  // Demo login for development (only works with AUTH_BYPASS)
  fastify.post('/demo-login', async (request: FastifyRequest, reply: FastifyReply) => {
    if (process.env.AUTH_BYPASS !== 'true') {
      return reply.code(403).send({
        error: 'Demo login disabled',
        message: 'Demo login is only available when AUTH_BYPASS is enabled',
      });
    }

    try {
      const demoUser = authService.createDemoUser();
      
      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];
      const tokens = authService.generateTokens(demoUser, userAgent, ipAddress);

      return reply.code(200).send({
        message: 'Demo login successful',
        user: {
          id: demoUser.id,
          username: demoUser.username,
          email: demoUser.email,
          roles: demoUser.roles,
          person: demoUser.person,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: 'Bearer',
        },
      });
    } catch (error) {
      fastify.log.error('Demo login error:', error);
      return reply.code(500).send({
        error: 'Demo login failed',
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });

  // Get current user profile (with auth bypass support)
  fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Check for development bypass
      let user;
      if (process.env.AUTH_BYPASS === 'true' || request.headers['x-auth-bypass']) {
        user = authService.createDemoUser();
      } else {
        // TODO: Implement proper token validation
        return reply.code(401).send({
          error: 'Authentication required',
          message: 'Token authentication not yet implemented',
        });
      }

      return reply.code(200).send({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          person: user.person,
        },
      });
    } catch (error) {
      fastify.log.error('Get current user error:', error);
      return reply.code(500).send({
        error: 'Failed to get user profile',
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });

  // Protected admin route example (with bypass support)
  fastify.get('/admin/test', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      let user;
      if (process.env.AUTH_BYPASS === 'true' || request.headers['x-auth-bypass']) {
        user = authService.createDemoUser();
      } else {
        return reply.code(401).send({
          error: 'Authentication required',
          message: 'Token authentication not yet implemented',
        });
      }

      // Check admin role
      if (!user.roles.includes('admin')) {
        return reply.code(403).send({
          error: 'Insufficient permissions',
          message: 'Admin role required',
        });
      }
      
      return reply.code(200).send({
        message: 'Admin access granted',
        user,
      });
    } catch (error) {
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  });
}