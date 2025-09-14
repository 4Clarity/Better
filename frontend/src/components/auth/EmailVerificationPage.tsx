import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEnhancedAuth } from '../../contexts/EnhancedAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { CheckCircle, XCircle, Mail, Loader2 } from 'lucide-react';

interface VerificationState {
  status: 'loading' | 'success' | 'error' | 'expired';
  message: string;
  nextStep?: 'approval_pending' | 'account_created' | 'approval_rejected';
}

export function EmailVerificationPage() {
  const { verifyEmail } = useEnhancedAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [verificationState, setVerificationState] = useState<VerificationState>({
    status: 'loading',
    message: 'Verifying your email address...'
  });

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setVerificationState({
        status: 'error',
        message: 'Invalid verification link. Please check your email and try again.'
      });
      return;
    }

    performVerification();
  }, [token]);

  const performVerification = async () => {
    if (!token) return;

    try {
      setVerificationState({
        status: 'loading',
        message: 'Verifying your email address...'
      });

      const result = await verifyEmail(token);

      setVerificationState({
        status: 'success',
        message: 'Email verified successfully!',
        nextStep: result.data.nextStep
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Email verification failed';

      let status: 'error' | 'expired' = 'error';
      if (message.includes('expired') || message.includes('token')) {
        status = 'expired';
      }

      setVerificationState({
        status,
        message
      });
    }
  };

  const handleContinue = () => {
    switch (verificationState.nextStep) {
      case 'account_created':
        navigate('/auth/login', {
          state: {
            message: 'Account created successfully! You can now log in.',
            type: 'success'
          }
        });
        break;
      case 'approval_pending':
        navigate('/auth/approval-pending');
        break;
      case 'approval_rejected':
        navigate('/auth/registration-rejected');
        break;
      default:
        navigate('/auth/login');
    }
  };

  const getIcon = () => {
    switch (verificationState.status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-600" />;
      case 'error':
      case 'expired':
        return <XCircle className="h-16 w-16 text-red-600" />;
    }
  };

  const getTitle = () => {
    switch (verificationState.status) {
      case 'loading':
        return 'Verifying Email';
      case 'success':
        return 'Email Verified!';
      case 'expired':
        return 'Link Expired';
      case 'error':
        return 'Verification Failed';
    }
  };

  const getAlertVariant = () => {
    switch (verificationState.status) {
      case 'success':
        return 'default';
      case 'error':
      case 'expired':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            {getIcon()}
          </div>
          <CardTitle className="text-2xl font-bold">
            {getTitle()}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant={getAlertVariant()}>
            {verificationState.status === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : verificationState.status === 'error' || verificationState.status === 'expired' ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            <AlertDescription>
              {verificationState.message}
            </AlertDescription>
          </Alert>

          {verificationState.status === 'success' && verificationState.nextStep && (
            <div className="text-center space-y-2">
              {verificationState.nextStep === 'approval_pending' && (
                <p className="text-sm text-gray-600">
                  Your account is pending admin approval. You'll receive an email when your account is reviewed.
                </p>
              )}

              {verificationState.nextStep === 'account_created' && (
                <p className="text-sm text-green-600">
                  Your account has been created successfully! You can now log in.
                </p>
              )}

              {verificationState.nextStep === 'approval_rejected' && (
                <p className="text-sm text-red-600">
                  Your registration has been rejected. Please contact an administrator for more information.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            {verificationState.status === 'success' && (
              <Button onClick={handleContinue} className="w-full">
                Continue
              </Button>
            )}

            {verificationState.status === 'expired' && (
              <div className="space-y-2">
                <Button
                  onClick={() => navigate('/auth/resend-verification')}
                  className="w-full"
                >
                  Request New Verification Link
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/auth/register')}
                  className="w-full"
                >
                  Back to Registration
                </Button>
              </div>
            )}

            {verificationState.status === 'error' && (
              <div className="space-y-2">
                <Button
                  onClick={performVerification}
                  className="w-full"
                  disabled={!token}
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/auth/register')}
                  className="w-full"
                >
                  Back to Registration
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              onClick={() => navigate('/auth/login')}
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}