"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTaskHandler = createTaskHandler;
exports.getTasksHandler = getTasksHandler;
exports.updateTaskHandler = updateTaskHandler;
exports.deleteTaskHandler = deleteTaskHandler;
exports.getTaskTreeHandler = getTaskTreeHandler;
exports.moveTaskHandler = moveTaskHandler;
const task_service_1 = require("./task.service");
async function createTaskHandler(request, reply) {
    try {
        const { transitionId } = request.params;
        const task = await (0, task_service_1.createTask)(transitionId, request.body);
        return reply.code(201).send(task);
    }
    catch (e) {
        const message = e?.message || 'Failed to create task';
        const code = message.includes('Transition not found') || message.includes('past') || message.includes('timeframe') ? 400 : 500;
        return reply.code(code).send({ statusCode: code, error: code === 400 ? 'Bad Request' : 'Internal Server Error', message });
    }
}
async function getTasksHandler(request, reply) {
    try {
        const { transitionId } = request.params;
        const tasks = await (0, task_service_1.getTasks)(transitionId, request.query);
        return reply.code(200).send(tasks);
    }
    catch (e) {
        return reply.code(500).send({ statusCode: 500, error: 'Internal Server Error', message: 'Failed to fetch tasks' });
    }
}
async function updateTaskHandler(request, reply) {
    try {
        const { taskId } = request.params;
        const task = await (0, task_service_1.updateTask)(taskId, request.body);
        return reply.code(200).send(task);
    }
    catch (e) {
        const message = e?.message || 'Failed to update task';
        const code = message.includes('not found') || message.includes('past') || message.includes('timeframe') ? 400 : 500;
        return reply.code(code).send({ statusCode: code, error: code === 400 ? 'Bad Request' : 'Internal Server Error', message });
    }
}
async function deleteTaskHandler(request, reply) {
    try {
        const { taskId } = request.params;
        const result = await (0, task_service_1.deleteTask)(taskId);
        return reply.code(200).send(result);
    }
    catch (e) {
        const message = e?.message || 'Failed to delete task';
        const code = message.includes('not found') ? 404 : 500;
        return reply.code(code).send({ statusCode: code, error: code === 404 ? 'Not Found' : 'Internal Server Error', message });
    }
}
async function getTaskTreeHandler(request, reply) {
    try {
        const { transitionId } = request.params;
        const tree = await (0, task_service_1.getTaskTree)(transitionId);
        return reply.code(200).send({ data: tree });
    }
    catch (e) {
        return reply.code(500).send({ statusCode: 500, error: 'Internal Server Error', message: 'Failed to fetch task tree' });
    }
}
async function moveTaskHandler(request, reply) {
    try {
        const { transitionId, taskId } = request.params;
        const updated = await (0, task_service_1.moveTask)(transitionId, taskId, request.body);
        return reply.code(200).send(updated);
    }
    catch (e) {
        const message = e?.message || 'Failed to move task';
        const code = message.includes('not found') || message.includes('Parent task') ? 400 : 500;
        return reply.code(code).send({ statusCode: code, error: code === 400 ? 'Bad Request' : 'Internal Server Error', message });
    }
}
