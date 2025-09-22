const { AuthenticationService } = require('../src/modules/auth/auth.service');

describe('Authentication Service - Role Impersonation', () => {
  let authService;
  let mockUser;

  beforeEach(() => {
    authService = new AuthenticationService();
    mockUser = {
      id: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
      roles: ['admin'],
      person: {
        id: 'person-id',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test User'
      }
    };
  });

  describe('canImpersonate', () => {
    test('should return true for admin users', () => {
      const result = authService.canImpersonate(mockUser);
      expect(result).toBe(true);
    });

    test('should return true when AUTH_BYPASS is enabled', () => {
      const regularUser = { ...mockUser, roles: ['user'] };
      process.env.AUTH_BYPASS = 'true';

      const result = authService.canImpersonate(regularUser);
      expect(result).toBe(true);

      delete process.env.AUTH_BYPASS;
    });

    test('should return false for non-admin users without bypass', () => {
      const regularUser = { ...mockUser, roles: ['user'] };
      const result = authService.canImpersonate(regularUser);
      expect(result).toBe(false);
    });
  });

  describe('getAvailableRoles', () => {
    test('should return all roles for admin users', () => {
      const roles = authService.getAvailableRoles(mockUser);
      expect(roles).toContain('Program Manager');
      expect(roles).toContain('Security Officer');
      expect(roles).toContain('System Administrator');
    });

    test('should exclude System Administrator for non-admin users', () => {
      const regularUser = { ...mockUser, roles: ['program_manager'] };
      process.env.AUTH_BYPASS = 'true';

      const roles = authService.getAvailableRoles(regularUser);
      expect(roles).not.toContain('System Administrator');

      delete process.env.AUTH_BYPASS;
    });

    test('should return empty array for unauthorized users', () => {
      const regularUser = { ...mockUser, roles: ['user'] };
      const roles = authService.getAvailableRoles(regularUser);
      expect(roles).toEqual([]);
    });
  });

  describe('impersonateRole', () => {
    test('should successfully impersonate a valid role', async () => {
      const result = await authService.impersonateRole(mockUser, 'Program Manager', '127.0.0.1');

      expect(result.isImpersonating).toBe(true);
      expect(result.impersonatedRole).toBe('Program Manager');
      expect(result.originalRoles).toEqual(['admin']);
      expect(result.roles).toEqual(['program_manager']);
    });

    test('should reject impersonation for unauthorized users', async () => {
      const regularUser = { ...mockUser, roles: ['user'] };

      await expect(
        authService.impersonateRole(regularUser, 'Program Manager', '127.0.0.1')
      ).rejects.toThrow('Insufficient permissions to impersonate roles');
    });

    test('should reject impersonation of invalid roles', async () => {
      await expect(
        authService.impersonateRole(mockUser, 'Invalid Role', '127.0.0.1')
      ).rejects.toThrow('Invalid role for impersonation');
    });

    test('should prevent privilege escalation', async () => {
      const regularUser = { ...mockUser, roles: ['user'] };
      process.env.AUTH_BYPASS = 'true';

      await expect(
        authService.impersonateRole(regularUser, 'System Administrator', '127.0.0.1')
      ).rejects.toThrow('Cannot impersonate administrator role without admin privileges');

      delete process.env.AUTH_BYPASS;
    });
  });

  describe('clearImpersonation', () => {
    test('should restore original roles', async () => {
      const impersonatedUser = {
        ...mockUser,
        roles: ['program_manager'],
        impersonatedRole: 'Program Manager',
        originalRoles: ['admin'],
        isImpersonating: true
      };

      const result = await authService.clearImpersonation(impersonatedUser, '127.0.0.1');

      expect(result.isImpersonating).toBe(false);
      expect(result.impersonatedRole).toBeUndefined();
      expect(result.originalRoles).toBeUndefined();
      expect(result.roles).toEqual(['admin']);
    });

    test('should handle non-impersonating users gracefully', async () => {
      const result = await authService.clearImpersonation(mockUser, '127.0.0.1');

      expect(result).toEqual(mockUser);
    });
  });
});