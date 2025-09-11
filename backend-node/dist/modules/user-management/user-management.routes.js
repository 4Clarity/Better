"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userManagementRoutes = userManagementRoutes;
const user_management_service_1 = require("./user-management.service");
const userService = new user_management_service_1.UserManagementService();
async function userManagementRoutes(fastify) {
    // Get all users with filtering and pagination
    fastify.get('/users', async (request, reply) => {
        try {
            const query = request.query;
            const filters = {
                ...query,
                page: query.page ? parseInt(query.page) : undefined,
                pageSize: query.pageSize ? parseInt(query.pageSize) : undefined,
            };
            const result = await userService.getUsers(filters);
            return reply.code(200).send(result);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch users' });
        }
    });
    // Get user by ID
    fastify.get('/users/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const user = await userService.getUserById(id, true);
            if (!user) {
                return reply.code(404).send({ error: 'User not found' });
            }
            return reply.code(200).send(user);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch user' });
        }
    });
    // Invite new user
    fastify.post('/users/invite', async (request, reply) => {
        try {
            const invitationData = request.body;
            // Add the inviter ID from auth context (placeholder for now)
            invitationData.userData.invitedBy = 'current-user-id'; // This should come from JWT token
            const result = await userService.inviteUser(invitationData);
            // TODO: Send invitation email
            // await emailService.sendInvitation(result.person.primaryEmail, result.invitationToken);
            return reply.code(201).send({
                message: 'User invitation sent successfully',
                userId: result.user.id,
                personId: result.person.id,
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to invite user' });
        }
    });
    // Accept invitation
    fastify.post('/users/accept-invitation', async (request, reply) => {
        try {
            const { invitationToken, keycloakId, confirmationData } = request.body;
            const user = await userService.acceptInvitation(invitationToken, keycloakId, confirmationData);
            return reply.code(200).send({
                message: 'Invitation accepted successfully',
                userId: user.id,
            });
        }
        catch (error) {
            fastify.log.error(error);
            if (error instanceof Error && error.message === 'Invalid or expired invitation token') {
                return reply.code(400).send({ error: error.message });
            }
            return reply.code(500).send({ error: 'Failed to accept invitation' });
        }
    });
    // Resend invitation
    fastify.post('/users/:id/resend-invitation', async (request, reply) => {
        try {
            const { id } = request.params;
            const invitedBy = 'current-user-id'; // This should come from JWT token
            const result = await userService.resendInvitation(id, invitedBy);
            // TODO: Send invitation email
            // await emailService.sendInvitation(result.user.person.primaryEmail, result.invitationToken);
            return reply.code(200).send({
                message: 'Invitation resent successfully',
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to resend invitation' });
        }
    });
    // Update user status
    fastify.put('/users/:id/status', async (request, reply) => {
        try {
            const { id } = request.params;
            const { accountStatus, statusReason } = request.body;
            const deactivatedBy = accountStatus === 'DEACTIVATED' ? 'current-user-id' : undefined;
            const user = await userService.updateUserStatus({
                userId: id,
                accountStatus,
                statusReason,
                deactivatedBy,
            });
            return reply.code(200).send({
                message: 'User status updated successfully',
                user: {
                    id: user.id,
                    accountStatus: user.accountStatus,
                    statusReason: user.statusReason,
                },
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to update user status' });
        }
    });
    // Reactivate suspended user account
    fastify.post('/users/:id/reactivate', async (request, reply) => {
        try {
            const { id } = request.params;
            const { reason } = request.body;
            const reactivatedBy = 'current-user-id'; // This should come from JWT token
            // First check if user exists and is suspended
            const existingUser = await userService.getUserById(id);
            if (!existingUser) {
                return reply.code(404).send({ error: 'User not found' });
            }
            if (existingUser.accountStatus !== 'SUSPENDED') {
                return reply.code(400).send({
                    error: 'Invalid operation',
                    message: `Cannot reactivate user with status: ${existingUser.accountStatus}. Only SUSPENDED users can be reactivated.`
                });
            }
            const user = await userService.updateUserStatus({
                userId: id,
                accountStatus: 'ACTIVE',
                statusReason: reason || 'Account reactivated',
                deactivatedBy: undefined, // Clear the deactivation info
            });
            return reply.code(200).send({
                message: 'User account reactivated successfully',
                user: {
                    id: user.id,
                    accountStatus: user.accountStatus,
                    statusReason: user.statusReason,
                    reactivatedBy,
                    reactivatedAt: new Date(),
                },
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to reactivate user account' });
        }
    });
    // Update user security information
    fastify.put('/users/:id/security', async (request, reply) => {
        try {
            const { id } = request.params;
            const securityData = request.body;
            const person = await userService.updateUserSecurity({
                userId: id,
                ...securityData,
            });
            return reply.code(200).send({
                message: 'User security information updated successfully',
                person: {
                    id: person.id,
                    securityClearanceLevel: person.securityClearanceLevel,
                    clearanceExpirationDate: person.clearanceExpirationDate,
                    pivStatus: person.pivStatus,
                    pivExpirationDate: person.pivExpirationDate,
                },
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to update user security information' });
        }
    });
    // Update user roles
    fastify.put('/users/:id/roles', async (request, reply) => {
        try {
            const { id } = request.params;
            const { roles } = request.body;
            const updatedBy = 'current-user-id'; // This should come from JWT token
            const user = await userService.updateUserRoles(id, roles, updatedBy);
            return reply.code(200).send({
                message: 'User roles updated successfully',
                user: {
                    id: user.id,
                    roles: user.roles,
                },
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to update user roles' });
        }
    });
    // Get person by ID
    fastify.get('/persons/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const person = await userService.getPersonById(id, true);
            if (!person) {
                return reply.code(404).send({ error: 'Person not found' });
            }
            return reply.code(200).send(person);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch person' });
        }
    });
    // Update person information
    fastify.put('/persons/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const personData = request.body;
            const person = await userService.updatePerson(id, personData);
            return reply.code(200).send({
                message: 'Person information updated successfully',
                person,
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to update person information' });
        }
    });
    // Transition user management
    fastify.post('/transitions/:transitionId/users', async (request, reply) => {
        try {
            const { transitionId } = request.params;
            const invitationData = request.body;
            const invitedBy = 'current-user-id'; // This should come from JWT token
            const transitionUser = await userService.inviteUserToTransition({
                transitionId,
                ...invitationData,
                invitedBy,
            });
            return reply.code(201).send({
                message: 'User invited to transition successfully',
                transitionUser,
            });
        }
        catch (error) {
            fastify.log.error(error);
            if (error instanceof Error && error.message === 'User is already assigned to this transition') {
                return reply.code(400).send({ error: error.message });
            }
            return reply.code(500).send({ error: 'Failed to invite user to transition' });
        }
    });
    // Get transition users
    fastify.get('/transitions/:transitionId/users', async (request, reply) => {
        try {
            const { transitionId } = request.params;
            const transitionUsers = await userService.getTransitionUsers(transitionId);
            return reply.code(200).send(transitionUsers);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch transition users' });
        }
    });
    // Update transition user access
    fastify.put('/transitions/:transitionId/users/:userId', async (request, reply) => {
        try {
            const { transitionId, userId } = request.params;
            const updates = request.body;
            const transitionUser = await userService.updateTransitionUserAccess(transitionId, userId, updates);
            return reply.code(200).send({
                message: 'Transition user access updated successfully',
                transitionUser,
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to update transition user access' });
        }
    });
    // Security dashboard data
    fastify.get('/security/dashboard', async (request, reply) => {
        try {
            const dashboardData = await userService.getSecurityDashboard();
            return reply.code(200).send(dashboardData);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch security dashboard data' });
        }
    });
    // Record user login (for tracking purposes)
    fastify.post('/users/:id/login', async (request, reply) => {
        try {
            const { id } = request.params;
            const { ipAddress, userAgent } = request.body;
            await userService.recordUserLogin(id, ipAddress, userAgent);
            return reply.code(200).send({
                message: 'User login recorded successfully',
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to record user login' });
        }
    });
    // Record failed login attempt
    fastify.post('/auth/failed-login', async (request, reply) => {
        try {
            const { username } = request.body;
            await userService.recordFailedLogin(username);
            return reply.code(200).send({
                message: 'Failed login attempt recorded',
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to record failed login' });
        }
    });
    // Admin password reset functionality
    fastify.post('/admin/users/:userId/reset-password', async (request, reply) => {
        try {
            const { userId } = request.params;
            const { generateTemporary, customPassword, forceChangeOnLogin } = request.body;
            const adminUserId = 'current-user-id'; // This should come from JWT token
            const result = await userService.resetUserPassword(userId, adminUserId, {
                generateTemporary,
                customPassword,
                forceChangeOnLogin: forceChangeOnLogin !== false, // Default to true
            });
            return reply.code(200).send(result);
        }
        catch (error) {
            fastify.log.error(error);
            if (error instanceof Error && error.message.includes('not found')) {
                return reply.code(404).send({ error: error.message });
            }
            if (error instanceof Error && error.message.includes('not authorized')) {
                return reply.code(403).send({ error: error.message });
            }
            return reply.code(500).send({ error: 'Failed to reset user password' });
        }
    });
    // Get password reset history for admin
    fastify.get('/admin/users/:userId/password-reset-history', async (request, reply) => {
        try {
            const { userId } = request.params;
            const history = await userService.getPasswordResetHistory(userId);
            return reply.code(200).send(history);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch password reset history' });
        }
    });
    // Force password change for user
    fastify.post('/admin/users/:userId/force-password-change', async (request, reply) => {
        try {
            const { userId } = request.params;
            const adminUserId = 'current-user-id'; // This should come from JWT token
            await userService.forcePasswordChange(userId, adminUserId);
            return reply.code(200).send({
                message: 'User will be required to change password on next login',
            });
        }
        catch (error) {
            fastify.log.error(error);
            if (error instanceof Error && error.message.includes('not found')) {
                return reply.code(404).send({ error: error.message });
            }
            if (error instanceof Error && error.message.includes('not authorized')) {
                return reply.code(403).send({ error: error.message });
            }
            return reply.code(500).send({ error: 'Failed to force password change' });
        }
    });
}
