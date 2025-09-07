import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export interface AuthUser {
  id: string;
  keycloakId?: string;
  username: string;
  email: string;
  roles: string[];
  person?: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
  };
}

export interface TokenPayload {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

export interface UserSession {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  isActive: boolean;
  userAgent?: string;
  ipAddress?: string;
}

export class AuthenticationService {
  private jwtSecret: string;
  private refreshSecret: string;
  private tokenExpiry: string = '15m'; // Session tokens expire in 15 minutes
  private refreshExpiry: string = '7d'; // Refresh tokens expire in 7 days

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret-key-here-change-in-production';
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret-key-here-change-in-production';
  }

  /**
   * Validate Keycloak JWT token and return user information
   */
  async validateKeycloakToken(keycloakToken: string): Promise<AuthUser> {
    try {
      // Keycloak token validation would happen here
      // For now, we'll implement a basic JWT decode
      const decoded = jwt.verify(keycloakToken, process.env.KEYCLOAK_JWT_PUBLIC_KEY?.replace(/\\n/g, '\n') || '') as any;
      
      // Find or create user based on Keycloak data
      const user = await this.findOrCreateUserFromKeycloak(decoded);
      return user;
    } catch (error) {
      throw new Error('Invalid Keycloak token');
    }
  }

  /**
   * Generate application JWT token for authenticated user
   */
  generateTokens(user: AuthUser, userAgent?: string, ipAddress?: string): { 
    accessToken: string; 
    refreshToken: string; 
    expiresIn: number;
    sessionId: string;
  } {
    const tokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
    };

    // Generate session token (short-lived)
    const accessToken = jwt.sign(tokenPayload, this.jwtSecret, {
      expiresIn: this.tokenExpiry,
      algorithm: 'HS256',
    });

    // Generate refresh token (long-lived)
    const sessionId = randomUUID();
    const refreshToken = jwt.sign(
      { userId: user.id, sessionId }, 
      this.refreshSecret,
      { expiresIn: this.refreshExpiry, algorithm: 'HS256' }
    );

    // For demo users, don't store session in database to avoid foreign key constraints
    if (user.id !== 'demo-user-id') {
      this.createUserSession(user.id, refreshToken, userAgent, ipAddress);
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      sessionId,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const decoded = jwt.verify(refreshToken, this.refreshSecret) as any;
      
      // Verify session is still active
      const session = await prisma.userSession.findFirst({
        where: {
          refreshToken,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
        include: {
          user: {
            include: {
              person: true,
              roles: true,
            },
          },
        },
      });

      if (!session) {
        throw new Error('Invalid or expired session');
      }

      // Generate new access token
      const user: AuthUser = {
        id: session.user.id,
        keycloakId: session.user.keycloakId || undefined,
        username: session.user.username,
        email: session.user.person?.primaryEmail || session.user.username,
        roles: session.user.roles.map(r => r.name),
        person: session.user.person ? {
          id: session.user.person.id,
          firstName: session.user.person.firstName,
          lastName: session.user.person.lastName,
          displayName: session.user.person.displayName,
        } : undefined,
      };

      const tokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
        userId: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
      };

      const accessToken = jwt.sign(tokenPayload, this.jwtSecret, {
        expiresIn: this.tokenExpiry,
        algorithm: 'HS256',
      });

      return {
        accessToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Validate application JWT token
   */
  async validateToken(token: string): Promise<AuthUser> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      
      // Get fresh user data from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          person: true,
          roles: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        keycloakId: user.keycloakId || undefined,
        username: user.username,
        email: user.person?.primaryEmail || user.username,
        roles: user.roles.map(r => r.name),
        person: user.person ? {
          id: user.person.id,
          firstName: user.person.firstName,
          lastName: user.person.lastName,
          displayName: user.person.displayName,
        } : undefined,
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Logout user and invalidate session
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      await prisma.userSession.updateMany({
        where: { refreshToken },
        data: { isActive: false },
      });
    } catch (error) {
      // Log error but don't throw - logout should always succeed from user perspective
      console.error('Error during logout:', error);
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(userId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        person: true,
        roles: true,
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      keycloakId: user.keycloakId || undefined,
      username: user.username,
      email: user.person?.primaryEmail || user.username,
      roles: user.roles.map(r => r.name),
      person: user.person ? {
        id: user.person.id,
        firstName: user.person.firstName,
        lastName: user.person.lastName,
        displayName: user.person.displayName,
      } : undefined,
    };
  }

  /**
   * Create user session record
   */
  private async createUserSession(
    userId: string, 
    refreshToken: string, 
    userAgent?: string, 
    ipAddress?: string
  ): Promise<string> {
    const session = await prisma.userSession.create({
      data: {
        userId,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        isActive: true,
        userAgent,
        ipAddress,
      },
    });
    return session.id;
  }

  /**
   * Find or create user from Keycloak token data
   */
  private async findOrCreateUserFromKeycloak(keycloakData: any): Promise<AuthUser> {
    // This would integrate with your existing user management system
    // For now, return a demo user for development
    const demoUser: AuthUser = {
      id: 'demo-user-id',
      keycloakId: keycloakData.sub || 'demo-keycloak-id',
      username: keycloakData.preferred_username || 'demo_user',
      email: keycloakData.email || 'demo@example.com',
      roles: keycloakData.realm_access?.roles || ['user'],
      person: {
        id: 'demo-person-id',
        firstName: keycloakData.given_name || 'Demo',
        lastName: keycloakData.family_name || 'User',
        displayName: keycloakData.name || 'Demo User',
      },
    };

    return demoUser;
  }

  /**
   * Development mode: Create demo authentication bypass
   */
  createDemoUser(): AuthUser {
    return {
      id: 'demo-user-id',
      username: 'demo_admin',
      email: 'admin@example.com',
      roles: ['admin', 'program_manager'],
      person: {
        id: 'demo-person-id',
        firstName: 'Demo',
        lastName: 'Administrator',
        displayName: 'Demo Administrator',
      },
    };
  }

  /**
   * Record user login for audit trail
   */
  async recordLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() },
      });

      // Additional login tracking could be added here
      console.log(`User login recorded: ${userId} from ${ipAddress}`);
    } catch (error) {
      console.error('Error recording login:', error);
    }
  }
}