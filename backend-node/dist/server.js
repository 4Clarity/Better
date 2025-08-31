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
        origin: '*', // In production, you should restrict this to your frontend's domain
    });
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
    // Register routes
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
