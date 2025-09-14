import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mailhog',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      } : undefined,
      // Additional settings for MailHog compatibility
      ignoreTLS: true,
      requireTLS: false,
    });
  }

  /**
   * Send email verification email to user
   */
  async sendVerificationEmail(email: string, token: string, registrationData: any): Promise<void> {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify-email?token=${token}`;
      const template = await this.loadTemplate('verification-email.html');

      const html = template
        .replace(/{{firstName}}/g, registrationData.firstName || 'User')
        .replace(/{{lastName}}/g, registrationData.lastName || '')
        .replace(/{{email}}/g, email)
        .replace(/{{organizationName}}/g, registrationData.organizationName || 'Not provided')
        .replace(/{{position}}/g, registrationData.position || 'Not provided')
        .replace(/{{registrationDate}}/g, new Date().toLocaleDateString())
        .replace(/{{verificationUrl}}/g, verificationUrl);

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@tip-platform.gov',
        to: email,
        subject: 'Verify Your Email - TIP Platform',
        html
      });

      console.log(`Verification email sent to ${email}`);
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send admin notification email for new user registration
   */
  async sendAdminNotification(adminEmails: string[], newUserData: any, stats?: any): Promise<void> {
    try {
      const template = await this.loadTemplate('admin-notification.html');
      const adminDashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/registrations`;
      const approveUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/api/admin/approve-registration/${newUserData.id}`;
      const rejectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/api/admin/reject-registration/${newUserData.id}`;

      const html = template
        .replace(/{{firstName}}/g, newUserData.firstName || 'Unknown')
        .replace(/{{lastName}}/g, newUserData.lastName || '')
        .replace(/{{email}}/g, newUserData.email)
        .replace(/{{organizationName}}/g, newUserData.organizationName || 'Not provided')
        .replace(/{{position}}/g, newUserData.position || 'Not provided')
        .replace(/{{registrationIP}}/g, newUserData.registrationIP || 'Unknown')
        .replace(/{{userAgent}}/g, newUserData.userAgent || 'Unknown')
        .replace(/{{registrationId}}/g, newUserData.id || 'Unknown')
        .replace(/{{isEmailVerified}}/g, newUserData.isEmailVerified ? 'true' : 'false')
        .replace(/{{expirationDate}}/g, newUserData.expiresAt ? new Date(newUserData.expiresAt).toLocaleDateString() : 'Unknown')
        .replace(/{{submissionDate}}/g, new Date().toLocaleDateString())
        .replace(/{{adminDashboardUrl}}/g, adminDashboardUrl)
        .replace(/{{approveUrl}}/g, approveUrl)
        .replace(/{{rejectUrl}}/g, rejectUrl)
        .replace(/{{pendingCount}}/g, stats?.pendingCount?.toString() || '0')
        .replace(/{{approvedToday}}/g, stats?.approvedToday?.toString() || '0')
        .replace(/{{daysUntilExpiration}}/g, '7');

      for (const adminEmail of adminEmails) {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@tip-platform.gov',
          to: adminEmail,
          subject: 'New User Registration Pending Approval - TIP Platform',
          html
        });
      }

      console.log(`Admin notification sent to ${adminEmails.length} administrators`);
    } catch (error) {
      console.error('Error sending admin notification:', error);
      throw new Error('Failed to send admin notification');
    }
  }

  /**
   * Send welcome email to newly approved user
   */
  async sendWelcomeEmail(userData: any, isAdmin: boolean = false): Promise<void> {
    try {
      const template = await this.loadTemplate('welcome-email.html');
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/login`;

      const html = template
        .replace(/{{firstName}}/g, userData.firstName || 'User')
        .replace(/{{lastName}}/g, userData.lastName || '')
        .replace(/{{email}}/g, userData.email)
        .replace(/{{organizationName}}/g, userData.organizationName || 'Not provided')
        .replace(/{{position}}/g, userData.position || 'Not provided')
        .replace(/{{accountCreatedDate}}/g, new Date().toLocaleDateString())
        .replace(/{{loginUrl}}/g, loginUrl);

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@tip-platform.gov',
        to: userData.email,
        subject: `Welcome to TIP Platform${isAdmin ? ' - Administrator Access Granted' : ''}`,
        html
      });

      console.log(`Welcome email sent to ${userData.email}${isAdmin ? ' (admin)' : ''}`);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw new Error('Failed to send welcome email');
    }
  }

  /**
   * Send approval email to user
   */
  async sendApprovalEmail(userData: any, isAdmin: boolean = false): Promise<void> {
    try {
      await this.sendWelcomeEmail(userData, isAdmin);
    } catch (error) {
      console.error('Error sending approval email:', error);
      throw new Error('Failed to send approval email');
    }
  }

  /**
   * Send rejection email to user
   */
  async sendRejectionEmail(userData: any, reason: string): Promise<void> {
    try {
      const template = await this.loadTemplate('registration-rejected.html');
      const registrationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/register`;

      const html = template
        .replace(/{{firstName}}/g, userData.firstName || 'User')
        .replace(/{{lastName}}/g, userData.lastName || '')
        .replace(/{{email}}/g, userData.email)
        .replace(/{{organizationName}}/g, userData.organizationName || 'Not provided')
        .replace(/{{position}}/g, userData.position || 'Not provided')
        .replace(/{{rejectionReason}}/g, reason)
        .replace(/{{reviewDate}}/g, new Date().toLocaleDateString())
        .replace(/{{registrationUrl}}/g, registrationUrl);

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@tip-platform.gov',
        to: userData.email,
        subject: 'Registration Request Update - TIP Platform',
        html
      });

      console.log(`Rejection email sent to ${userData.email}`);
    } catch (error) {
      console.error('Error sending rejection email:', error);
      throw new Error('Failed to send rejection email');
    }
  }

  /**
   * Send approval pending notification to user
   */
  async sendApprovalPendingEmail(userData: any): Promise<void> {
    try {
      const template = await this.loadTemplate('approval-pending.html');

      const html = template
        .replace(/{{firstName}}/g, userData.firstName || 'User')
        .replace(/{{lastName}}/g, userData.lastName || '')
        .replace(/{{email}}/g, userData.email)
        .replace(/{{organizationName}}/g, userData.organizationName || 'Not provided')
        .replace(/{{position}}/g, userData.position || 'Not provided')
        .replace(/{{submissionDate}}/g, new Date(userData.createdAt || new Date()).toLocaleDateString());

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@tip-platform.gov',
        to: userData.email,
        subject: 'Registration Under Review - TIP Platform',
        html
      });

      console.log(`Approval pending email sent to ${userData.email}`);
    } catch (error) {
      console.error('Error sending approval pending email:', error);
      throw new Error('Failed to send approval pending email');
    }
  }

  /**
   * Load email template from file
   */
  private async loadTemplate(templateName: string): Promise<string> {
    try {
      const templatePath = path.join(process.cwd(), 'src', 'templates', 'email', templateName);
      return await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      console.error(`Error loading template ${templateName}:`, error);
      // Return a basic fallback template if file doesn't exist
      return this.getBasicTemplate(templateName);
    }
  }

  /**
   * Get basic template fallback if file doesn't exist
   */
  private getBasicTemplate(templateName: string): string {
    switch (templateName) {
      case 'verification-email.html':
        return `
          <!DOCTYPE html>
          <html>
          <head>
              <meta charset="UTF-8">
              <title>Verify Your Email - TIP Platform</title>
          </head>
          <body>
              <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6;">
                  <div style="background-color: #1e3a8a; color: white; padding: 20px; text-align: center;">
                      <h1>Welcome to TIP Platform</h1>
                  </div>
                  <div style="padding: 30px 20px;">
                      <p>Hi {{firstName}},</p>
                      <p>Thank you for registering with TIP Platform. To complete your registration, please verify your email address by clicking the link below:</p>
                      <div style="text-align: center;">
                          <a href="{{verificationUrl}}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Verify Email Address</a>
                      </div>
                      <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                      <p style="word-break: break-all; color: #3b82f6;">{{verificationUrl}}</p>
                      <p><strong>Important:</strong> This verification link will expire in 24 hours.</p>
                      <p>After email verification, your account will be reviewed by an administrator before you can access the platform.</p>
                      <p>If you didn't create an account with us, please ignore this email.</p>
                  </div>
                  <div style="background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px;">
                      <p>© 2024 TIP Platform. All rights reserved.</p>
                      <p>This is an automated message. Please do not reply to this email.</p>
                  </div>
              </div>
          </body>
          </html>
        `;

      case 'admin-notification.html':
        return `
          <!DOCTYPE html>
          <html>
          <head>
              <meta charset="UTF-8">
              <title>New User Registration - TIP Platform</title>
          </head>
          <body>
              <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6;">
                  <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
                      <h1>New User Registration Pending</h1>
                  </div>
                  <div style="padding: 30px 20px;">
                      <p>Hello Administrator,</p>
                      <p>A new user has registered on the TIP Platform and is awaiting approval. Please review the following details:</p>
                      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 20px 0;">
                          <h3>User Information</h3>
                          <p><strong>Name:</strong> {{firstName}} {{lastName}}</p>
                          <p><strong>Email:</strong> {{email}}</p>
                          <p><strong>Organization:</strong> {{organizationName}}</p>
                          <p><strong>Position:</strong> {{position}}</p>
                          <p><strong>Registration Date:</strong> {{registrationDate}}</p>
                      </div>
                      <div style="text-align: center;">
                          <a href="{{approvalUrl}}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Review Registration</a>
                      </div>
                      <p>To approve or reject this registration, please log in to the admin dashboard and navigate to the user management section.</p>
                      <p><strong>Note:</strong> The user has already verified their email address and is waiting for administrative approval to access the platform.</p>
                  </div>
                  <div style="background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px;">
                      <p>© 2024 TIP Platform. All rights reserved.</p>
                      <p>This is an automated notification from the TIP Platform user management system.</p>
                  </div>
              </div>
          </body>
          </html>
        `;

      case 'welcome-email.html':
        return `
          <!DOCTYPE html>
          <html>
          <head>
              <meta charset="UTF-8">
              <title>Welcome to TIP Platform</title>
          </head>
          <body>
              <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6;">
                  <div style="background-color: #059669; color: white; padding: 20px; text-align: center;">
                      <h1>Welcome to TIP Platform!</h1>
                  </div>
                  <div style="padding: 30px 20px;">
                      <p>Congratulations! Your TIP Platform account has been approved and is now active.</p>
                      {{adminSection}}
                      <p>You can now log in to the platform and start using all available features.</p>
                      <div style="text-align: center;">
                          <a href="{{loginUrl}}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Log In Now</a>
                      </div>
                      <h3>Getting Started</h3>
                      <ul>
                          <li>Complete your profile information</li>
                          <li>Explore the dashboard and available features</li>
                          <li>Review the user guide and documentation</li>
                          <li>Contact support if you need assistance</li>
                      </ul>
                      <p>If you have any questions or need help getting started, please don't hesitate to contact our support team.</p>
                      <p>Welcome to the TIP Platform community!</p>
                  </div>
                  <div style="background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px;">
                      <p>© 2024 TIP Platform. All rights reserved.</p>
                      <p>If you have any questions, please contact our support team.</p>
                  </div>
              </div>
          </body>
          </html>
        `;

      case 'rejection-email.html':
        return `
          <!DOCTYPE html>
          <html>
          <head>
              <meta charset="UTF-8">
              <title>Registration Update - TIP Platform</title>
          </head>
          <body>
              <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6;">
                  <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
                      <h1>Registration Update</h1>
                  </div>
                  <div style="padding: 30px 20px;">
                      <p>Thank you for your interest in the TIP Platform.</p>
                      <p>After careful review, we are unable to approve your registration request at this time.</p>
                      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0;">
                          <h3>Reason:</h3>
                          <p>{{reason}}</p>
                      </div>
                      <p>If you believe this decision was made in error or if you have additional information that might change this decision, please contact our support team.</p>
                      <p>Thank you for your understanding.</p>
                  </div>
                  <div style="background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px;">
                      <p>© 2024 TIP Platform. All rights reserved.</p>
                      <p>For questions about this decision, please contact our support team.</p>
                  </div>
              </div>
          </body>
          </html>
        `;

      default:
        return `
          <!DOCTYPE html>
          <html>
          <head>
              <meta charset="UTF-8">
              <title>TIP Platform</title>
          </head>
          <body>
              <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6;">
                  <div style="background-color: #1e3a8a; color: white; padding: 20px; text-align: center;">
                      <h1>TIP Platform</h1>
                  </div>
                  <div style="padding: 30px 20px;">
                      <p>This is an automated message from TIP Platform.</p>
                  </div>
                  <div style="background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px;">
                      <p>© 2024 TIP Platform. All rights reserved.</p>
                  </div>
              </div>
          </body>
          </html>
        `;
    }
  }

  /**
   * Test email connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email service connection test successful');
      return true;
    } catch (error) {
      console.error('Email service connection test failed:', error);
      return false;
    }
  }
}