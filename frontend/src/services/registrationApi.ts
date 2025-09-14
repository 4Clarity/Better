import { API_BASE_URL } from './api';

// Registration types
export interface UserRegistrationRequest {
  email: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
  position?: string;
  password: string;
  confirmPassword: string;
  requestedRoles?: string[];
}

export interface RegistrationResponse {
  success: boolean;
  message: string;
  data: {
    registrationId: string;
    email: string;
    status: 'pending_verification' | 'pending_approval' | 'approved' | 'rejected';
    isEmailVerified: boolean;
    adminApprovalRequired: boolean;
  };
}

export interface EmailVerificationRequest {
  token: string;
}

export interface EmailVerificationResponse {
  success: boolean;
  message: string;
  data: {
    email: string;
    isVerified: boolean;
    nextStep: 'approval_pending' | 'account_created' | 'approval_rejected';
  };
}

export interface RegistrationStatusResponse {
  success: boolean;
  message: string;
  data: {
    email: string;
    status: 'pending_verification' | 'pending_approval' | 'approved' | 'rejected' | 'expired';
    isEmailVerified: boolean;
    adminApprovalStatus: string;
    createdAt: string;
    expiresAt?: string;
    rejectedReason?: string;
  };
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationResponse {
  success: boolean;
  message: string;
  data: {
    email: string;
    sentAt: string;
  };
}

// Password validation interface
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number;
}

// Registration API Service
export class RegistrationApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/auth`;
  }

  /**
   * Register new user
   */
  async registerUser(registrationData: UserRegistrationRequest): Promise<RegistrationResponse> {
    const response = await fetch(`${this.baseUrl}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...registrationData,
        registrationIP: await this.getClientIP(),
        userAgent: navigator.userAgent,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Registration failed');
    }

    return result;
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<EmailVerificationResponse> {
    const response = await fetch(`${this.baseUrl}/verify-email`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      params: new URLSearchParams({ token }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Email verification failed');
    }

    return result;
  }

  /**
   * Get registration status by email
   */
  async getRegistrationStatus(email: string): Promise<RegistrationStatusResponse> {
    const encodedEmail = encodeURIComponent(email);
    const response = await fetch(`${this.baseUrl}/registration-status/${encodedEmail}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to get registration status');
    }

    return result;
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<ResendVerificationResponse> {
    const response = await fetch(`${this.baseUrl}/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to resend verification email');
    }

    return result;
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): PasswordValidation {
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    } else {
      score += 1;
      if (password.length >= 12) score += 1;
    }

    // Character variety checks
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letters');
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letters');
    } else {
      score += 1;
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain numbers');
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
      errors.push('Password must contain special characters');
    } else {
      score += 1;
    }

    // Common password patterns
    const commonPatterns = [
      'password', '123456', 'qwerty', 'abc123', 'letmein',
      'welcome', 'monkey', '111111', 'dragon', 'master'
    ];

    if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
      errors.push('Password cannot contain common words or patterns');
      score -= 2;
    }

    // Sequential characters
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password cannot contain repeated characters');
      score -= 1;
    }

    // Calculate strength
    let strength: 'weak' | 'fair' | 'good' | 'strong';
    if (score <= 2) {
      strength = 'weak';
    } else if (score <= 3) {
      strength = 'fair';
    } else if (score <= 4) {
      strength = 'good';
    } else {
      strength = 'strong';
    }

    return {
      isValid: errors.length === 0 && score >= 4,
      errors,
      strength,
      score: Math.max(0, score),
    };
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if email is already registered
   */
  async checkEmailAvailability(email: string): Promise<{ available: boolean; status?: string }> {
    try {
      const status = await this.getRegistrationStatus(email);
      return {
        available: false,
        status: status.data.status,
      };
    } catch (error) {
      // If we get a 404 or similar, email is likely available
      return { available: true };
    }
  }

  /**
   * Get client IP address (best effort)
   */
  private async getClientIP(): Promise<string> {
    try {
      // This is a simple approach - in production you might want to use a service
      return 'client-ip'; // Placeholder - backend will capture actual IP
    } catch {
      return 'unknown';
    }
  }

  /**
   * Format registration error for display
   */
  formatRegistrationError(error: Error): string {
    const message = error.message || 'Registration failed';

    // Handle common error scenarios with user-friendly messages
    if (message.includes('email already exists')) {
      return 'An account with this email address already exists. Please use a different email or try logging in.';
    }

    if (message.includes('validation failed')) {
      return 'Please check your information and try again.';
    }

    if (message.includes('password')) {
      return 'Password does not meet security requirements. Please choose a stronger password.';
    }

    return message;
  }
}

// Create and export singleton instance
export const registrationApi = new RegistrationApi();