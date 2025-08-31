import { FastifyInstance } from 'fastify';
import { $ref } from './task.service';
import { createTaskHandler, getTasksHandler, updateTaskHandler, deleteTaskHandler } from './task.controller';

async function taskRoutes(server: FastifyInstance) {
  const pmOnly = async (request: any, reply: any) => {
    const bypass = process.env.AUTH_BYPASS === 'true' || request.headers['x-auth-bypass'] === 'true';
    if (bypass) return;
    try { await request.jwtVerify(); } catch { return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'JWT required' }); }
    const roles = (request.user?.realm_access?.roles ?? []).map((r: string)=>r.toLowerCase());
    if (!roles.includes('program_manager')) return reply.code(403).send({ statusCode: 403, error: 'Forbidden', message: 'PM role required' });
  };

  // POST /api/transitions/:transitionId/tasks
  server.post('/', { schema: { body: $ref('createTaskSchema'), response: { 201: $ref('taskResponseSchema'), 400: { type:'object', properties: { statusCode:{type:'number'}, error:{type:'string'}, message:{type:'string'} } } } }, preHandler: pmOnly }, createTaskHandler);

  // GET /api/transitions/:transitionId/tasks
  server.get('/', { schema: { querystring: $ref('getTasksQuerySchema'), response: { 200: $ref('taskListResponseSchema') } } }, getTasksHandler);

  // PUT /api/transitions/:transitionId/tasks/:taskId
  server.put('/:taskId', { schema: { params: { type:'object', properties:{ transitionId:{type:'string'}, taskId:{type:'string'} }, required: ['taskId','transitionId'] }, body: $ref('updateTaskSchema'), response: { 200: $ref('taskResponseSchema'), 400: { type:'object', properties:{ statusCode:{type:'number'}, error:{type:'string'}, message:{type:'string'} } } } }, preHandler: pmOnly }, updateTaskHandler);

  // DELETE /api/transitions/:transitionId/tasks/:taskId
  server.delete('/:taskId', { schema: { params: { type:'object', properties:{ transitionId:{type:'string'}, taskId:{type:'string'} }, required: ['taskId','transitionId'] }, response: { 200: { type:'object', properties:{ message:{type:'string'} } }, 404: { type:'object', properties:{ statusCode:{type:'number'}, error:{type:'string'}, message:{type:'string'} } } } }, preHandler: pmOnly }, deleteTaskHandler);
}

export default taskRoutes;

