import { EmailService } from '../email.service';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    verify: jest.fn().mockResolvedValue(true)
  }))
}));

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      await expect(
        emailService.sendVerificationEmail('test@example.com', 'test-token', 'John')
      ).resolves.not.toThrow();
    });

    it('should handle email sending errors', async () => {
      // Mock transporter to throw error
      const nodemailer = require('nodemailer');
      nodemailer.createTransport = jest.fn(() => ({
        sendMail: jest.fn().mockRejectedValue(new Error('SMTP Error'))
      }));

      emailService = new EmailService();

      await expect(
        emailService.sendVerificationEmail('test@example.com', 'test-token', 'John')
      ).rejects.toThrow('Failed to send verification email');
    });
  });

  describe('sendAdminNotification', () => {
    it('should send admin notification successfully', async () => {
      const adminEmails = ['admin1@example.com', 'admin2@example.com'];
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        organizationName: 'Test Org',
        position: 'Developer'
      };

      await expect(
        emailService.sendAdminNotification(adminEmails, userData)
      ).resolves.not.toThrow();
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email for regular user', async () => {
      await expect(
        emailService.sendWelcomeEmail('test@example.com', false)
      ).resolves.not.toThrow();
    });

    it('should send welcome email for admin user', async () => {
      await expect(
        emailService.sendWelcomeEmail('admin@example.com', true)
      ).resolves.not.toThrow();
    });
  });

  describe('sendRejectionEmail', () => {
    it('should send rejection email successfully', async () => {
      await expect(
        emailService.sendRejectionEmail('test@example.com', 'Insufficient qualifications')
      ).resolves.not.toThrow();
    });
  });

  describe('testConnection', () => {
    it('should test email connection successfully', async () => {
      const result = await emailService.testConnection();
      expect(result).toBe(true);
    });

    it('should handle connection test failure', async () => {
      // Mock transporter to throw error
      const nodemailer = require('nodemailer');
      nodemailer.createTransport = jest.fn(() => ({
        verify: jest.fn().mockRejectedValue(new Error('Connection failed'))
      }));

      emailService = new EmailService();
      const result = await emailService.testConnection();
      expect(result).toBe(false);
    });
  });
});