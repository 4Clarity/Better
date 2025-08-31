import { FastifyReply, FastifyRequest } from 'fastify';
import { createTask, getTasks, getTaskById, updateTask, deleteTask, CreateTaskInput, UpdateTaskInput, GetTasksQuery, getTaskTree, moveTask, MoveTaskInput } from './task.service';

export async function createTaskHandler(
  request: FastifyRequest<{ Params: { transitionId: string }; Body: CreateTaskInput }>, reply: FastifyReply
) {
  try {
    const { transitionId } = request.params;
    const task = await createTask(transitionId, request.body);
    return reply.code(201).send(task);
  } catch (e: any) {
    const message = e?.message || 'Failed to create task';
    const code = message.includes('Transition not found') || message.includes('past') || message.includes('timeframe') ? 400 : 500;
    return reply.code(code).send({ statusCode: code, error: code===400?'Bad Request':'Internal Server Error', message });
  }
}

export async function getTasksHandler(
  request: FastifyRequest<{ Params: { transitionId: string }; Querystring: GetTasksQuery }>, reply: FastifyReply
) {
  try {
    const { transitionId } = request.params;
    const tasks = await getTasks(transitionId, request.query);
    return reply.code(200).send(tasks);
  } catch (e: any) {
    return reply.code(500).send({ statusCode: 500, error: 'Internal Server Error', message: 'Failed to fetch tasks' });
  }
}

export async function updateTaskHandler(
  request: FastifyRequest<{ Params: { transitionId: string; taskId: string }; Body: UpdateTaskInput }>, reply: FastifyReply
) {
  try {
    const { taskId } = request.params;
    const task = await updateTask(taskId, request.body);
    return reply.code(200).send(task);
  } catch (e: any) {
    const message = e?.message || 'Failed to update task';
    const code = message.includes('not found') || message.includes('past') || message.includes('timeframe') ? 400 : 500;
    return reply.code(code).send({ statusCode: code, error: code===400?'Bad Request':'Internal Server Error', message });
  }
}

export async function deleteTaskHandler(
  request: FastifyRequest<{ Params: { transitionId: string; taskId: string } }>, reply: FastifyReply
) {
  try {
    const { taskId } = request.params;
    const result = await deleteTask(taskId);
    return reply.code(200).send(result);
  } catch (e: any) {
    const message = e?.message || 'Failed to delete task';
    const code = message.includes('not found') ? 404 : 500;
    return reply.code(code).send({ statusCode: code, error: code===404?'Not Found':'Internal Server Error', message });
  }
}

export async function getTaskTreeHandler(
  request: FastifyRequest<{ Params: { transitionId: string } }>, reply: FastifyReply
) {
  try {
    const { transitionId } = request.params;
    const tree = await getTaskTree(transitionId);
    return reply.code(200).send({ data: tree });
  } catch (e: any) {
    return reply.code(500).send({ statusCode: 500, error: 'Internal Server Error', message: 'Failed to fetch task tree' });
  }
}

export async function moveTaskHandler(
  request: FastifyRequest<{ Params: { transitionId: string; taskId: string }; Body: MoveTaskInput }>, reply: FastifyReply
) {
  try {
    const { transitionId, taskId } = request.params;
    const updated = await moveTask(transitionId, taskId, request.body);
    return reply.code(200).send(updated);
  } catch (e: any) {
    const message = e?.message || 'Failed to move task';
    const code = message.includes('not found') || message.includes('Parent task') ? 400 : 500;
    return reply.code(code).send({ statusCode: code, error: code===400?'Bad Request':'Internal Server Error', message });
  }
}
