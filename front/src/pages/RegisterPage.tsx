import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassInput } from '../components/ui/GlassInput';
import { PasswordStrengthIndicator } from '../components/ui/PasswordStrengthIndicator';
import { useAuth } from '../hooks/useAuth';
import {
    validateEmail,
    validatePassword,
    validateConfirmPassword,
    validateName,
    validatePhone,
    // validateBirthDate
} from '../utils/validation';
import { checkPasswordStrength } from '../utils/passwordStrength';
import { cn } from '../utils';

// Icons
const UserIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const EmailIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
    </svg>
);

const PhoneIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
);

const CalendarIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const PasswordIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

const EyeIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const EyeOffIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
    </svg>
);

interface FormData {
    name: string;
    email: string;
    phone: string;
    // birthDate: string;
    password: string;
    confirmPassword: string;
}

interface FormErrors {
    name?: string;
    email?: string;
    phone?: string;
    // birthDate?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
}

export const RegisterPage: React.FC = () => {
    const { state, register, clearError } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        phone: '',
        // birthDate: '',
        password: '',
        confirmPassword: '',
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);


    // Redirect if already authenticated
    useEffect(() => {
        if (state.isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [state.isAuthenticated, navigate]);

    // Clear errors when auth error changes
    useEffect(() => {
        if (state.error) {
            setErrors(prev => ({ ...prev, general: state.error ?? undefined }));
        }
    }, [state.error]);

    const handleInputChange = (field: keyof FormData) => (value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear field error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }

        // Clear general error
        if (errors.general) {
            setErrors(prev => ({ ...prev, general: undefined }));
            clearError();
        }
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        // Validate name
        const nameValidation = validateName(formData.name);
        if (!nameValidation.isValid) {
            newErrors.name = nameValidation.error;
        }

        // Validate email
        const emailValidation = validateEmail(formData.email);
        if (!emailValidation.isValid) {
            newErrors.email = emailValidation.error;
        }

        // Validate phone (optional)
        const phoneValidation = validatePhone(formData.phone);
        if (!phoneValidation.isValid) {
            newErrors.phone = phoneValidation.error;
        }

        // Validate password
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
            newErrors.password = passwordValidation.error;
        } else {
            // Check password strength
            const strength = checkPasswordStrength(formData.password);
            if (!strength.isValid) {
                newErrors.password = 'Password is not strong enough';
            }
        }

        // Validate confirm password
        const confirmPasswordValidation = validateConfirmPassword(formData.password, formData.confirmPassword);
        if (!confirmPasswordValidation.isValid) {
            newErrors.confirmPassword = confirmPasswordValidation.error;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const userData = {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                ...(formData.phone && { phone: formData.phone }),
                // ...(formData.birthDate && { birthDate: formData.birthDate }),
            };

            await register(userData);
            // Navigation will be handled by the useEffect above
        } catch (error) {
            // Error is handled by the auth context and useEffect above
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-primary">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-text-primary mb-2">
                        Create Account
                    </h1>
                    <p className="text-text-secondary">
                        Join us and start your shopping journey
                    </p>
                </div>

                {/* Registration Form */}
                <GlassCard className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* General Error */}
                        {errors.general && (
                            <div className="glass-card p-4 bg-red-500/10 border-red-500/20 text-red-400 text-sm rounded-xl">
                                {errors.general}
                            </div>
                        )}

                        {/* Name Field */}
                        <GlassInput
                            type="text"
                            label="Full Name"
                            value={formData.name}
                            onChange={handleInputChange('name')}
                            error={errors.name}
                            icon={<UserIcon />}
                            iconPosition="left"
                            autoComplete="name"
                            required
                        />

                        {/* Email Field */}
                        <GlassInput
                            type="email"
                            label="Email Address"
                            value={formData.email}
                            onChange={handleInputChange('email')}
                            error={errors.email}
                            icon={<EmailIcon />}
                            iconPosition="left"
                            autoComplete="email"
                            required
                        />

                        {/* Phone Field */}
                        <GlassInput
                            type="tel"
                            label="Phone Number (Optional)"
                            value={formData.phone}
                            onChange={handleInputChange('phone')}
                            error={errors.phone}
                            icon={<PhoneIcon />}
                            iconPosition="left"
                            autoComplete="tel"
                        />

                        {/* Birth Date Field */}
                        {/* <GlassInput
                            type="date"
                            label="Birth Date (Optional)"
                            value={formData.birthDate}
                            onChange={handleInputChange('birthDate')}
                            error={errors.birthDate}
                            icon={<CalendarIcon />}
                            iconPosition="left"
                            autoComplete="bday"
                        /> */}

                        {/* Password Field */}
                        <div className="space-y-2">
                            <GlassInput
                                type={showPassword ? 'text' : 'password'}
                                label="Password"
                                value={formData.password}
                                onChange={handleInputChange('password')}
                                error={errors.password}
                                icon={<PasswordIcon />}
                                iconPosition="left"
                                autoComplete="new-password"
                                required
                            />

                            {/* Password Strength Indicator */}
                            <PasswordStrengthIndicator password={formData.password} />
                        </div>

                        {/* Confirm Password Field */}
                        <GlassInput
                            type={showConfirmPassword ? 'text' : 'password'}
                            label="Confirm Password"
                            value={formData.confirmPassword}
                            onChange={handleInputChange('confirmPassword')}
                            error={errors.confirmPassword}
                            icon={<PasswordIcon />}
                            iconPosition="left"
                            autoComplete="new-password"
                            required
                        />

                        {/* Show/Hide Password */}
                        <div className="flex items-center justify-between text-sm">
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="flex items-center text-text-secondary hover:text-text-primary transition-colors"
                            >
                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                <span className="ml-2">
                                    {showPassword ? 'Hide' : 'Show'} password
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="flex items-center text-text-secondary hover:text-text-primary transition-colors"
                            >
                                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                                <span className="ml-2">
                                    {showConfirmPassword ? 'Hide' : 'Show'} confirm
                                </span>
                            </button>
                        </div>

                        {/* Submit Button */}
                        <GlassButton
                            type="submit"
                            variant="accent"
                            size="lg"
                            loading={isSubmitting || state.isLoading}
                            className="w-full"
                            ripple
                        >
                            {isSubmitting || state.isLoading ? 'Creating Account...' : 'Create Account'}
                        </GlassButton>
                    </form>

                    {/* Login Link */}
                    <div className="mt-6 text-center">
                        <p className="text-text-secondary">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-accent-primary hover:text-accent-primary/80 transition-colors font-medium"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>
                </GlassCard>

                {/* Additional Links */}
                <div className="mt-6 text-center">
                    <Link
                        to="/"
                        className="text-text-muted hover:text-text-secondary transition-colors text-sm"
                    >
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
};