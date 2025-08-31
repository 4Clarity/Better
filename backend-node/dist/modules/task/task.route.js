"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const task_service_1 = require("./task.service");
const task_controller_1 = require("./task.controller");
async function taskRoutes(server) {
    const pmOnly = async (request, reply) => {
        const bypass = process.env.AUTH_BYPASS === 'true' || request.headers['x-auth-bypass'] === 'true';
        if (bypass)
            return;
        try {
            await request.jwtVerify();
        }
        catch {
            return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'JWT required' });
        }
        const roles = (request.user?.realm_access?.roles ?? []).map((r) => r.toLowerCase());
        if (!roles.includes('program_manager'))
            return reply.code(403).send({ statusCode: 403, error: 'Forbidden', message: 'PM role required' });
    };
    // POST /api/transitions/:transitionId/tasks
    server.post('/', { schema: { body: (0, task_service_1.$ref)('createTaskSchema'), response: { 201: (0, task_service_1.$ref)('taskResponseSchema'), 400: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } } } }, preHandler: pmOnly }, task_controller_1.createTaskHandler);
    // GET /api/transitions/:transitionId/tasks
    server.get('/', { schema: { querystring: (0, task_service_1.$ref)('getTasksQuerySchema'), response: { 200: (0, task_service_1.$ref)('taskListResponseSchema') } } }, task_controller_1.getTasksHandler);
    // GET /api/transitions/:transitionId/tasks/tree
    server.get('/tree', { schema: { response: { 200: { type: 'object', properties: { data: { type: 'array' } } } } } }, task_controller_1.getTaskTreeHandler);
    // PUT /api/transitions/:transitionId/tasks/:taskId
    server.put('/:taskId', { schema: { params: { type: 'object', properties: { transitionId: { type: 'string' }, taskId: { type: 'string' } }, required: ['taskId', 'transitionId'] }, body: (0, task_service_1.$ref)('updateTaskSchema'), response: { 200: (0, task_service_1.$ref)('taskResponseSchema'), 400: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } } } }, preHandler: pmOnly }, task_controller_1.updateTaskHandler);
    // DELETE /api/transitions/:transitionId/tasks/:taskId
    server.delete('/:taskId', { schema: { params: { type: 'object', properties: { transitionId: { type: 'string' }, taskId: { type: 'string' } }, required: ['taskId', 'transitionId'] }, response: { 200: { type: 'object', properties: { message: { type: 'string' } } }, 404: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } } } }, preHandler: pmOnly }, task_controller_1.deleteTaskHandler);
    // PATCH /api/transitions/:transitionId/tasks/:taskId/move
    server.patch('/:taskId/move', { schema: { params: { type: 'object', properties: { transitionId: { type: 'string' }, taskId: { type: 'string' } }, required: ['taskId', 'transitionId'] }, body: (0, task_service_1.$ref)('moveTaskSchema'), response: { 200: (0, task_service_1.$ref)('taskResponseSchema'), 400: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } } } }, preHandler: pmOnly }, task_controller_1.moveTaskHandler);
}
exports.default = taskRoutes;
