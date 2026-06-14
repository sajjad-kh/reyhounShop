import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassInput } from '../components/ui/GlassInput';
import { useAuth } from '../hooks/useAuth';
import { validateEmail, validatePassword } from '../utils/validation';

import.meta.env



// Icons
const EmailIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
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
    email: string;
    password: string;
}

interface FormErrors {
    email?: string;
    password?: string;
    general?: string;
}

export const LoginPage: React.FC = () => {
    const { state, login,loginWithBale, clearError } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [loginUrl, setLoginUrl] = useState<string>('');
    const [showQR, setShowQR] = useState(false);

    const [formData, setFormData] = useState<FormData>({
        email: '',
        password: '',
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [baleLoading, setBaleLoading] = useState(false);

    const [tgLoading, setTgLoading] = useState(false);
    const [tgQR, setTgQR] = useState(false);
    const [tgUrl, setTgUrl] = useState('');

    

    // Redirect if already authenticated
    useEffect(() => {
        console.log('🔍 Login redirect check:', {
            isAuthenticated: state.isAuthenticated,
            user: state.user,
            role: state.user?.role,
            from: location.state?.from?.pathname
        });

        if (state.isAuthenticated && state.user) {
            // If there's a specific page they were trying to access, go there
            if (location.state?.from?.pathname) {
                console.log('📍 Redirecting to requested page:', location.state.from.pathname);
                navigate(location.state.from.pathname, { replace: true });
            } else {
                // Otherwise, redirect based on role
                const defaultPath = state.user.role === 'ADMIN' ? '/admin' : '/';
                console.log('📍 Redirecting user:', state.user.email, 'Role:', state.user.role, 'To:', defaultPath);
                navigate(defaultPath, { replace: true });
            }
        }
    }, [state.isAuthenticated, state.user, navigate, location]);

    // Clear errors when auth error changes
    useEffect(() => {
        if (state.error) {
            setErrors(prev => ({ ...prev, general: state.error || undefined }));
        }
    }, [state.error]);

    const handleInputChange = (field: keyof FormData) => (value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        // Validate email
        const emailValidation = validateEmail(formData.email);
        if (!emailValidation.isValid) {
            newErrors.email = emailValidation.error;
        }

        // Validate password
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
            newErrors.password = passwordValidation.error;
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

            await login(formData.email, formData.password);
            // Navigation will be handled by the useEffect above
        } catch (error) {
            if (error instanceof Error && error.message === '2FA_REQUIRED') {
                // Handle 2FA flow - redirect to 2FA page
                navigate('/verify-2fa', {
                    state: {
                        email: formData.email,
                        requiresVerification: true
                    }
                });
            }
            // Other errors are handled by the auth context and useEffect above
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBaleLogin = async () => {
        try {
            setBaleLoading(true);

            const res = await fetch('/api/v1/auth/bale/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source: 'web' }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error();

            const { loginId } = data.data;
            localStorage.setItem('bale_login_id', loginId);

            const botUsername = import.meta.env.VITE_BALE_BOT_USERNAME;
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isMobile) {
                window.location.href = `https://ble.ir/${botUsername}?start=${loginId}`;
            } else {
                // دسکتاپ → QR نشان بده
                setLoginUrl(`https://ble.ir/${botUsername}?start=${loginId}`);
                setShowQR(true);
            }

        } catch (err) {
            setErrors({ general: 'Bale login failed' });
        } finally {
            setBaleLoading(false);
        }
    };

    
    const handleTelegramLogin = async () => {
        try {
            setTgLoading(true);

            const res = await fetch('/api/v1/auth/telegram/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await res.json();
            if (!res.ok) throw new Error();

            const { loginId, url } = data.data;
            localStorage.setItem('telegram_login_id', loginId);

            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isMobile) {
                window.location.href = url;
            } else {
                setTgUrl(url);
                setTgQR(true);
            }
        } catch (err) {
            setErrors({ general: 'Telegram login failed' });
        } finally {
            setTgLoading(false);
        }
    };

    // Polling effect
    useEffect(() => {
        const loginId = localStorage.getItem('telegram_login_id');
        if (!loginId) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/v1/auth/telegram/status/${loginId}`);
                const data = await res.json();

                if (data?.data?.status === 'APPROVED') {
                    clearInterval(interval);
                    localStorage.removeItem('telegram_login_id');
                    await loginWithBale(data.data.token, data.data.user); // یا یه متد عمومی‌تر مثل loginWithToken
                    navigate('/');
                }

                if (data?.data?.status === 'EXPIRED') {
                    clearInterval(interval);
                    localStorage.removeItem('telegram_login_id');
                    setTgQR(false);
                    setErrors({ general: 'لینک منقضی شد، دوباره تلاش کنید' });
                }
            } catch (err) {
                console.error(err);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, []);


    useEffect(() => {
        const loginId = localStorage.getItem('bale_login_id');
        if (!loginId) return;

        console.log('🔄 Polling started');

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/v1/auth/bale/status/${loginId}`);
                const data = await res.json();

                console.log('📊 Status:', data?.data?.status);

                if (data?.data?.status === 'APPROVED') {
                    clearInterval(interval);
                    localStorage.removeItem('bale_login_id');
                    await loginWithBale(data.data.token, data.data.user); // ✅
                    navigate('/');
                }
            } catch (err) {
                console.error(err);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, []);



    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-primary">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-text-primary mb-2">
                        Welcome Back
                    </h1>
                    <p className="text-text-secondary">
                        Sign in to your account to continue
                    </p>
                </div>

                {/* Login Form */}
                <GlassCard className="p-8">
                    {/* Bale Login Section */}
                    <div className="mb-6">
                        <GlassCard className="p-6 border border-blue-500/20">
                            <div className="text-center space-y-3">
                                
                                <h2 className="text-lg font-semibold text-text-primary">
                                    Login with Bale
                                </h2>

                                <p className="text-sm text-text-secondary">
                                    Sign in instantly using your Bale account
                                </p>

                                <GlassButton
                                    type="button"
                                    variant="primary"
                                    size="lg"
                                    className="w-full"
                                    loading={baleLoading}
                                    onClick={handleBaleLogin}
                                    ripple
                                >
                                    {baleLoading ? 'Connecting...' : '🔵 Continue with Bale'}
                                </GlassButton>


                                {showQR && (
                                    <div className="text-center space-y-3 mt-4">
                                        <p className="text-text-secondary text-sm">با موبایل اسکن کنید:</p>
                                        <div className="flex justify-center bg-white p-3 rounded-xl">
                                            <QRCodeSVG value={loginUrl} size={180} />
                                        </div>
                                        <p className="text-text-muted text-xs">بعد از اسکن، صفحه خودکار redirect می‌شود</p>
                                    </div>
                                )}


                            </div>
                        </GlassCard>
                    </div>

                    <div className="mb-6">
                        <GlassCard className="p-6 border border-sky-500/20">
                            <div className="text-center space-y-3">
                                <h2 className="text-lg font-semibold text-text-primary">
                                    Login with Telegram
                                </h2>
                                <p className="text-sm text-text-secondary">
                                    ورود سریع با اکانت تلگرام (شماره تماس لازم است)
                                </p>

                                <GlassButton
                                    type="button"
                                    variant="primary"
                                    size="lg"
                                    className="w-full"
                                    loading={tgLoading}
                                    onClick={handleTelegramLogin}
                                    ripple
                                >
                                    {tgLoading ? 'در حال اتصال...' : '✈️ Continue with Telegram'}
                                </GlassButton>

                                {tgQR && (
                                    <div className="text-center space-y-3 mt-4">
                                        <p className="text-text-secondary text-sm">با موبایل اسکن کنید:</p>
                                        <div className="flex justify-center bg-white p-3 rounded-xl">
                                            <QRCodeSVG value={tgUrl} size={180} />
                                        </div>
                                        <p className="text-text-muted text-xs">
                                            بعد از اسکن، ربات شماره تماس‌تون رو ازتون می‌خواد
                                        </p>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </div>



                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* General Error */}
                        {errors.general && (
                            <div className="glass-card p-4 bg-red-500/10 border-red-500/20 text-red-400 text-sm rounded-xl">
                                {errors.general}
                            </div>
                        )}

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

                        {/* Password Field */}
                        <GlassInput
                            type={showPassword ? 'text' : 'password'}
                            label="Password"
                            value={formData.password}
                            onChange={handleInputChange('password')}
                            error={errors.password}
                            icon={<PasswordIcon />}
                            iconPosition="left"
                            autoComplete="current-password"
                            required
                        />

                        {/* Show/Hide Password */}
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="flex items-center text-sm text-text-secondary hover:text-text-primary transition-colors"
                            >
                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                <span className="ml-2">
                                    {showPassword ? 'Hide' : 'Show'} password
                                </span>
                            </button>

                            <Link
                                to="/forgetPasswordPage"
                                className="text-sm text-accent-primary hover:text-accent-primary/80 transition-colors"
                            >
                                Forgot password?
                            </Link>
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
                            {isSubmitting || state.isLoading ? 'Signing In...' : 'Sign In'}
                        </GlassButton>
                    </form>

                    {/* Register Link */}
                    <div className="mt-6 text-center">
                        <p className="text-text-secondary">
                            Don't have an account?{' '}
                            <Link
                                to="/register"
                                className="text-accent-primary hover:text-accent-primary/80 transition-colors font-medium"
                            >
                                Sign up
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