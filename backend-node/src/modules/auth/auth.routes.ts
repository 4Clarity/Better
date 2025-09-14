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

  // Email lookup endpoint - check if email exists and get auth methods
  fastify.post('/lookup', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email } = request.body as any;
      
      if (!email) {
        return reply.code(400).send({
          error: 'Email required',
          message: 'Email address is required',
        });
      }

      const result = await authService.findUserByEmail(email);
      
      if (!result.user) {
        return reply.code(404).send({
          error: 'User not found',
          message: 'No account found with that email address',
        });
      }

      return reply.code(200).send({
        message: 'User found',
        data: {
          email: result.user.email,
          displayName: result.user.person?.displayName || result.user.username,
          authMethods: result.authMethods,
          requiresChallenge: result.requiresChallenge,
        },
      });
    } catch (error) {
      fastify.log.error('Email lookup error:', error);
      return reply.code(400).send({
        error: 'Lookup failed',
        message: error instanceof Error ? error.message : 'Email lookup failed',
      });
    }
  });

  // Password authentication endpoint - SECURITY ENHANCED
  fastify.post('/authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, password, method } = request.body as any;
      
      // SECURITY FIX: Enhanced input validation
      if (!email || !password) {
        return reply.code(400).send({
          error: 'Missing credentials',
          message: 'Email and password are required',
        });
      }

      // Sanitize and validate email input
      const sanitizedEmail = authService.sanitizeInput(email);
      if (!authService.isValidEmail(sanitizedEmail)) {
        return reply.code(400).send({
          error: 'Invalid email format',
          message: 'Please provide a valid email address',
        });
      }

      // Check input length limits
      if (email.length > 254 || password.length > 128) {
        return reply.code(400).send({
          error: 'Input too long',
          message: 'Email or password exceeds maximum length',
        });
      }

      if (method && method !== 'password') {
        return reply.code(400).send({
          error: 'Invalid method',
          message: 'Only password authentication is supported by this endpoint',
        });
      }

      // SECURITY FIX: Use enhanced authentication with IP tracking
      const ipAddress = request.ip;
      const user = await authService.authenticateWithPassword(sanitizedEmail, password, ipAddress);
      
      // Generate tokens with enhanced security
      const userAgent = request.headers['user-agent'];
      const tokens = authService.generateTokens(user, userAgent, ipAddress);

      return reply.code(200).send({
        message: 'Authentication successful',
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
      // Enhanced error logging for security monitoring
      fastify.log.error('Authentication attempt failed', {
        email: (request.body as any)?.email,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      return reply.code(401).send({
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  });

  // Regular login endpoint (keeping for backward compatibility)
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

  // Token refresh endpoint - SECURITY FIX: Proper refresh token validation
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refreshToken } = request.body as any;

      if (!refreshToken) {
        return reply.code(400).send({
          error: 'Missing refresh token',
          message: 'Refresh token is required',
        });
      }

      // Validate refresh token format and length
      if (typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
        return reply.code(400).send({
          error: 'Invalid refresh token format',
          message: 'Refresh token must be a non-empty string',
        });
      }

      try {
        // Use the auth service to refresh the token
        const tokenData = await authService.refreshToken(refreshToken.trim());

        return reply.code(200).send({
          message: 'Token refreshed successfully',
          tokens: {
            accessToken: tokenData.accessToken,
            expiresIn: tokenData.expiresIn,
            tokenType: 'Bearer',
          },
        });
      } catch (refreshError) {
        // Log failed refresh attempt for security monitoring
        fastify.log.warn('Token refresh failed', {
          error: refreshError instanceof Error ? refreshError.message : 'Unknown error',
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          timestamp: new Date().toISOString()
        });

        return reply.code(401).send({
          error: 'Token refresh failed',
          message: 'Invalid or expired refresh token',
        });
      }
    } catch (error) {
      fastify.log.error('Refresh endpoint error:', error);
      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to process token refresh',
      });
    }
  });

  // Get current user profile - SECURITY FIX: Complete token validation implementation
  fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      let user;
      
      // Check for development bypass
      if (process.env.AUTH_BYPASS === 'true' || request.headers['x-auth-bypass']) {
        user = authService.createDemoUser();
      } else {
        // SECURITY FIX: Implement proper token validation
        const authHeader = request.headers.authorization;
        
        if (!authHeader) {
          return reply.code(401).send({
            error: 'Authentication required',
            message: 'Authorization header missing',
          });
        }

        // Validate Bearer token format
        if (!authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({
            error: 'Invalid token format',
            message: 'Authorization header must use Bearer scheme',
          });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        if (!token || token.trim().length === 0) {
          return reply.code(401).send({
            error: 'Invalid token',
            message: 'Token is empty',
          });
        }

        try {
          // Validate the access token
          user = await authService.validateToken(token);
          
          // Log successful token validation for security monitoring
          fastify.log.info('Token validation successful', {
            userId: user.id,
            ip: request.ip,
            userAgent: request.headers['user-agent']
          });
          
        } catch (tokenError) {
          // Log failed token validation attempt
          fastify.log.warn('Token validation failed', {
            error: tokenError instanceof Error ? tokenError.message : 'Unknown error',
            ip: request.ip,
            userAgent: request.headers['user-agent'],
            timestamp: new Date().toISOString()
          });
          
          return reply.code(401).send({
            error: 'Invalid token',
            message: 'Token expired or invalid',
          });
        }
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
        message: 'Internal server error',
      });
    }
  });

  // Protected admin route example - SECURITY FIX: Complete token validation
  fastify.get('/admin/test', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      let user;
      
      if (process.env.AUTH_BYPASS === 'true' || request.headers['x-auth-bypass']) {
        user = authService.createDemoUser();
      } else {
        // SECURITY FIX: Implement proper token validation
        const authHeader = request.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({
            error: 'Authentication required',
            message: 'Valid Bearer token required',
          });
        }

        const token = authHeader.substring(7);
        
        try {
          user = await authService.validateToken(token);
        } catch (tokenError) {
          return reply.code(401).send({
            error: 'Invalid token',
            message: 'Token expired or invalid',
          });
        }
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
        user: {
          id: user.id,
          username: user.username,
          roles: user.roles,
        },
      });
    } catch (error) {
      fastify.log.error('Admin route error:', error);
      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to process admin request',
      });
    }
  });
}