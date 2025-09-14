"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildServer = buildServer;
const fastify_1 = __importDefault(require("fastify"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const cors_1 = __importDefault(require("@fastify/cors"));
const zod_1 = require("zod");
const fastify_zod_1 = require("fastify-zod");
const transition_raw_service_1 = require("./modules/transition/transition-raw.service");
const milestone_service_1 = require("./modules/milestone/milestone.service");
const task_service_1 = require("./modules/task/task.service");
const transition_raw_route_1 = __importDefault(require("./modules/transition/transition-raw.route"));
const milestone_route_1 = __importDefault(require("./modules/milestone/milestone.route"));
const business_operation_route_1 = __importDefault(require("./modules/business-operation/business-operation.route"));
const contract_route_1 = __importDefault(require("./modules/contract/contract.route"));
const enhanced_transition_route_1 = __importDefault(require("./modules/transition/enhanced-transition.route"));
const user_management_routes_1 = require("./modules/user-management/user-management.routes");
const task_route_1 = __importDefault(require("./modules/task/task.route"));
const auth_1 = require("./modules/auth");
const admin_1 = require("./modules/admin");
function buildServer() {
    const server = (0, fastify_1.default)({
        logger: true,
    });
    // JWT for Keycloak (non-bypass mode)
    if (process.env.KEYCLOAK_JWT_PUBLIC_KEY) {
        server.register(jwt_1.default, {
            secret: {
                public: process.env.KEYCLOAK_JWT_PUBLIC_KEY.replace(/\\n/g, '\n'),
            },
            decode: { complete: false },
            sign: { algorithm: 'RS256' },
        });
    }
    else {
        server.log.warn('KEYCLOAK_JWT_PUBLIC_KEY not set. Protected routes require AUTH_BYPASS or x-auth-bypass header.');
    }
    // Add zod validation
    server.setValidatorCompiler(fastify_zod_1.validatorCompiler);
    server.setSerializerCompiler(fastify_zod_1.serializerCompiler);
    // Add schemas to the server instance
    for (const schema of [...transition_raw_service_1.transitionSchemas, ...milestone_service_1.milestoneSchemas, ...task_service_1.taskSchemas]) {
        server.addSchema(schema);
    }
    server.register(cors_1.default, {
        origin: true, // Allow all origins for development
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-bypass', 'X-Requested-With'],
        exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
        preflightContinue: false,
        optionsSuccessStatus: 200 // Some legacy browsers choke on 204
    });
    // SECURITY FIX: Add rate limiting protection - TEMPORARILY DISABLED FOR DEVELOPMENT
    /*
    server.register(rateLimit, {
      max: 100, // Maximum 100 requests per timeWindow
      timeWindow: '15 minutes', // 15 minute window
      cache: 10000, // Cache 10,000 different IPs
      allowList: ['127.0.0.1', '::1'], // Allow localhost for development
      skipOnError: false, // Return 429 on error instead of allowing through
      keyGenerator: (request) => {
        // Rate limit by IP address and potentially by user if authenticated
        const ip = request.ip;
        const userAgent = request.headers['user-agent'] || '';
        return `${ip}:${userAgent}`;
      },
      errorResponseBuilder: (request, context) => {
        return {
          error: 'Rate limit exceeded',
          message: `Too many requests from this IP. Limit: ${context.max} requests per ${context.after}. Try again later.`,
          retryAfter: context.after,
          timestamp: new Date().toISOString()
        };
      },
      onExceeding: (request, key) => {
        // Log rate limit violations for security monitoring
        server.log.warn('Rate limit exceeded', {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          url: request.url,
          method: request.method,
          key,
          timestamp: new Date().toISOString()
        });
      }
    });
    */
    // SECURITY FIX: Stricter rate limiting for authentication endpoints - TEMPORARILY DISABLED FOR DEVELOPMENT
    /*
    server.register(async function (server) {
      await server.register(rateLimit, {
        max: 20, // Allow more attempts for development (was 5)
        timeWindow: '5 minutes', // Longer window for development (was 1 minute)
        keyGenerator: (request) => {
          // Rate limit auth by IP + email combination
          const ip = request.ip;
          const email = (request.body as any)?.email || '';
          return `auth:${ip}:${email}`;
        },
        errorResponseBuilder: (request, context) => {
          return {
            error: 'Authentication rate limit exceeded',
            message: 'Too many authentication attempts. Please try again later.',
            retryAfter: context.after,
            timestamp: new Date().toISOString()
          };
        },
        onExceeding: (request, key) => {
          // Enhanced logging for authentication rate limits
          server.log.error('Authentication rate limit exceeded - potential attack', {
            ip: request.ip,
            userAgent: request.headers['user-agent'],
            email: (request.body as any)?.email,
            url: request.url,
            key,
            timestamp: new Date().toISOString()
          });
        }
      });
  
      // Apply stricter rate limiting only to authentication routes
      server.register(authRoutes);
    }, { prefix: '/api/auth' });
    */
    // Temporarily register auth routes without additional rate limiting
    server.register(auth_1.authRoutes, { prefix: '/api/auth' });
    // Register registration routes (public endpoints)
    server.register(auth_1.registrationRoutes, { prefix: '/api/auth' });
    // Register admin registration management routes (protected endpoints)
    server.register(admin_1.registrationManagementRoutes, { prefix: '/api/admin' });
    // Register authentication decorators
    server.register(auth_1.registerAuthDecorators);
    // Global error handler for Zod validation errors
    server.setErrorHandler((error, request, reply) => {
        if (error instanceof zod_1.ZodError) {
            reply.status(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: error.flatten(),
            });
        }
        else {
            // For other errors, use the default error handler
            reply.send(error);
        }
    });
    // Register routes (auth routes already registered above with rate limiting)
    server.register(transition_raw_route_1.default, { prefix: '/api/transitions' });
    server.register(business_operation_route_1.default, { prefix: '/api/business-operations' });
    server.register(contract_route_1.default, { prefix: '/api/contracts' });
    server.register(enhanced_transition_route_1.default, { prefix: '/api/enhanced-transitions' });
    server.register(user_management_routes_1.userManagementRoutes, { prefix: '/api/user-management' });
    // Register nested milestone routes under transitions
    server.register(async function (server) {
        server.register(milestone_route_1.default, { prefix: '/:transitionId/milestones' });
        server.register(task_route_1.default, { prefix: '/:transitionId/tasks' });
    }, { prefix: '/api/transitions' });
    // Health check endpoint
    server.get('/health', async (request, reply) => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });
    // API health alias for convenience when testing behind proxies
    server.get('/api/health', async (request, reply) => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });
    return server;
}
