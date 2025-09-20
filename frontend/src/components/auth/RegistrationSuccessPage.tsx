import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEnhancedAuth } from '../../contexts/EnhancedAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Mail, Clock, CheckCircle, RefreshCw, ArrowRight } from 'lucide-react';

interface LocationState {
  email?: string;
  status?: string;
  adminApprovalRequired?: boolean;
}

export function RegistrationSuccessPage() {
  const { resendVerificationEmail } = useEnhancedAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const state = location.state as LocationState || {};
  const { email, status = 'pending_verification', adminApprovalRequired = true } = state;

  const handleResendVerification = async () => {
    if (!email) return;

    setIsResending(true);
    setResendStatus({ type: null, message: '' });

    try {
      await resendVerificationEmail(email);
      setResendStatus({
        type: 'success',
        message: 'Verification email sent successfully! Please check your inbox.'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resend verification email';
      setResendStatus({
        type: 'error',
        message
      });
    } finally {
      setIsResending(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending_verification':
        return <Mail className="h-16 w-16 text-blue-600" />;
      case 'pending_approval':
        return <Clock className="h-16 w-16 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-16 w-16 text-green-600" />;
      default:
        return <Mail className="h-16 w-16 text-blue-600" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'pending_verification':
        return 'Check Your Email';
      case 'pending_approval':
        return 'Pending Approval';
      case 'approved':
        return 'Registration Complete';
      default:
        return 'Registration Submitted';
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'pending_verification':
        return `We've sent a verification email to ${email}. Please click the link in the email to verify your account.`;
      case 'pending_approval':
        return 'Your email has been verified! Your registration is now pending admin approval. You\'ll receive an email notification when your account is reviewed.';
      case 'approved':
        return 'Your account has been created successfully! You can now log in to the platform.';
      default:
        return 'Your registration has been submitted successfully.';
    }
  };

  const getNextSteps = () => {
    const steps = [];

    if (status === 'pending_verification') {
      steps.push({
        icon: <Mail className="h-5 w-5 text-blue-600" />,
        title: 'Check your email',
        description: 'Click the verification link we sent you',
        completed: false
      });
    }

    if (adminApprovalRequired && (status === 'pending_verification' || status === 'pending_approval')) {
      steps.push({
        icon: <Clock className="h-5 w-5 text-yellow-600" />,
        title: 'Admin review',
        description: 'Wait for admin to approve your registration',
        completed: false
      });
    }

    steps.push({
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      title: 'Access granted',
      description: 'Log in and start using the platform',
      completed: status === 'approved'
    });

    return steps;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl font-bold">
            {getStatusTitle()}
          </CardTitle>
          <CardDescription className="text-center">
            {getStatusMessage()}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Alert */}
          <Alert>
            {status === 'approved' ? (
              <CheckCircle className="h-4 w-4" />
            ) : status === 'pending_approval' ? (
              <Clock className="h-4 w-4" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            <AlertDescription>
              {status === 'pending_verification' && email && (
                <>
                  Verification email sent to <strong>{email}</strong>
                </>
              )}
              {status === 'pending_approval' && (
                'Your registration is under review by administrators'
              )}
              {status === 'approved' && (
                'Your account is ready to use!'
              )}
            </AlertDescription>
          </Alert>

          {/* Resend Status */}
          {resendStatus.type && (
            <Alert variant={resendStatus.type === 'error' ? 'destructive' : 'default'}>
              {resendStatus.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              <AlertDescription>
                {resendStatus.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Next Steps */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg">Next Steps</h3>
            <div className="space-y-3">
              {getNextSteps().map((step, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-3 p-3 rounded-lg border ${
                    step.completed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${
                      step.completed ? 'text-green-800' : 'text-gray-800'
                    }`}>
                      {step.title}
                    </p>
                    <p className={`text-sm ${
                      step.completed ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                  {step.completed && (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {status === 'pending_verification' && email && (
              <div className="space-y-2">
                <Button
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="w-full"
                  variant="outline"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
              </div>
            )}

            {status === 'approved' && (
              <Button
                onClick={() => navigate('/auth/login')}
                className="w-full"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Continue to Login
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => navigate('/auth/login')}
              className="w-full"
            >
              Back to Login
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Didn't receive the email? Check your spam folder.
            </p>
            {adminApprovalRequired && status !== 'approved' && (
              <p className="text-sm text-gray-600">
                Registration approval typically takes 1-2 business days.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}