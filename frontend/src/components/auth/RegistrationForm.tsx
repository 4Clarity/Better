import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnhancedAuth } from '../../contexts/EnhancedAuthContext';
import { UserRegistrationRequest } from '../../services/registrationApi';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Eye, EyeOff, CheckCircle, XCircle, Info } from 'lucide-react';

interface RegistrationFormProps {
  onSuccess?: (email: string) => void;
  onCancel?: () => void;
}

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  position: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  [key: string]: string;
}

export function RegistrationForm({ onSuccess, onCancel }: RegistrationFormProps) {
  const { registerUser, config, registrationInProgress, error: authError } = useEnhancedAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
    organizationName: '',
    position: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    strength: 'weak' | 'fair' | 'good' | 'strong';
    errors: string[];
  }>({ score: 0, strength: 'weak', errors: [] });

  // Password strength validation
  useEffect(() => {
    if (formData.password) {
      const validation = validatePassword(formData.password);
      setPasswordStrength(validation);
    } else {
      setPasswordStrength({ score: 0, strength: 'weak', errors: [] });
    }
  }, [formData.password]);

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    let score = 0;

    if (password.length < 8) {
      errors.push('At least 8 characters long');
    } else {
      score += 1;
      if (password.length >= 12) score += 1;
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Contain lowercase letters');
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Contain uppercase letters');
    } else {
      score += 1;
    }

    if (!/\d/.test(password)) {
      errors.push('Contain numbers');
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
      errors.push('Contain special characters');
    } else {
      score += 1;
    }

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

    return { score, strength, errors };
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (passwordStrength.errors.length > 0) {
      newErrors.password = 'Password does not meet security requirements';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const registrationData: UserRegistrationRequest = {
        email: formData.email.toLowerCase().trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        organizationName: formData.organizationName.trim() || undefined,
        position: formData.position.trim() || undefined,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        requestedRoles: ['user'], // Default role
      };

      const result = await registerUser(registrationData);

      // Handle success
      if (onSuccess) {
        onSuccess(formData.email);
      } else {
        navigate('/auth/registration-success', {
          state: {
            email: formData.email,
            status: result.data.status,
            adminApprovalRequired: result.data.adminApprovalRequired,
          },
        });
      }
    } catch (error) {
      console.error('Registration failed:', error);
      // Error is handled by the auth context
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength.strength) {
      case 'weak': return 'bg-red-500';
      case 'fair': return 'bg-yellow-500';
      case 'good': return 'bg-blue-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const getPasswordStrengthWidth = () => {
    return `${(passwordStrength.score / 6) * 100}%`;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
        <CardDescription className="text-center">
          Join the TIP Platform to get started
        </CardDescription>
        {config.adminApprovalRequired && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              New registrations require admin approval. You'll receive email updates on your application status.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
              disabled={registrationInProgress}
            />
            {errors.email && (
              <p className="text-sm text-red-600 flex items-center">
                <XCircle className="h-4 w-4 mr-1" />
                {errors.email}
              </p>
            )}
          </div>

          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              type="text"
              placeholder="Enter your first name"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className={errors.firstName ? 'border-red-500' : ''}
              disabled={registrationInProgress}
            />
            {errors.firstName && (
              <p className="text-sm text-red-600 flex items-center">
                <XCircle className="h-4 w-4 mr-1" />
                {errors.firstName}
              </p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Enter your last name"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className={errors.lastName ? 'border-red-500' : ''}
              disabled={registrationInProgress}
            />
            {errors.lastName && (
              <p className="text-sm text-red-600 flex items-center">
                <XCircle className="h-4 w-4 mr-1" />
                {errors.lastName}
              </p>
            )}
          </div>

          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization</Label>
            <Input
              id="organizationName"
              type="text"
              placeholder="Your organization or company"
              value={formData.organizationName}
              onChange={(e) => handleInputChange('organizationName', e.target.value)}
              disabled={registrationInProgress}
            />
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              type="text"
              placeholder="Your role or job title"
              value={formData.position}
              onChange={(e) => handleInputChange('position', e.target.value)}
              disabled={registrationInProgress}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                disabled={registrationInProgress}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                      style={{ width: getPasswordStrengthWidth() }}
                    />
                  </div>
                  <span className={`text-sm font-medium ${
                    passwordStrength.strength === 'weak' ? 'text-red-600' :
                    passwordStrength.strength === 'fair' ? 'text-yellow-600' :
                    passwordStrength.strength === 'good' ? 'text-blue-600' :
                    'text-green-600'
                  }`}>
                    {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
                  </span>
                </div>

                {passwordStrength.errors.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">Password must:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      {passwordStrength.errors.map((error, index) => (
                        <li key={index} className="text-red-600">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {errors.password && (
              <p className="text-sm text-red-600 flex items-center">
                <XCircle className="h-4 w-4 mr-1" />
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                disabled={registrationInProgress}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {formData.confirmPassword && (
              <p className={`text-sm flex items-center ${
                formData.password === formData.confirmPassword
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {formData.password === formData.confirmPassword ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Passwords match
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-1" />
                    Passwords do not match
                  </>
                )}
              </p>
            )}
            {errors.confirmPassword && (
              <p className="text-sm text-red-600 flex items-center">
                <XCircle className="h-4 w-4 mr-1" />
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Global Error */}
          {authError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={registrationInProgress}
            >
              {registrationInProgress ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            {onCancel && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onCancel}
                disabled={registrationInProgress}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>

        <div className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 font-medium"
            onClick={() => navigate('/auth/login')}
          >
            Sign in here
          </button>
        </div>
      </CardContent>
    </Card>
  );
}