import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassInput } from '../components/ui/GlassInput';
import { validateEmail } from '../utils/validation';

const EmailIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
    />
  </svg>
);

interface FormErrors {
  email?: string;
  general?: string;
}

export const ForgetPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const validateForm = () => {
    const newErrors: FormErrors = {};

    const emailValidation = validateEmail(email);

    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: API Call
      // await authService.forgotPassword(email);

      await new Promise(resolve =>
        setTimeout(resolve, 1500)
      );

      setEmailSent(true);
    } catch (error) {
      setErrors({
        general:
          'خطا در ارسال لینک بازیابی. لطفاً مجدداً تلاش کنید.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-primary">
      <div className="w-full max-w-md">
        {!emailSent ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                بازیابی رمز عبور
              </h1>

              <p className="text-text-secondary">
                ایمیل حساب کاربری خود را وارد کنید.
                <br />
                لینک بازیابی برای شما ارسال خواهد شد.
              </p>
            </div>

            <GlassCard className="p-8">
              <form
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                {errors.general && (
                  <div className="glass-card p-4 bg-red-500/10 border-red-500/20 text-red-400 text-sm rounded-xl">
                    {errors.general}
                  </div>
                )}

                <GlassInput
                  type="email"
                  label="ایمیل"
                  value={email}
                  onChange={setEmail}
                  error={errors.email}
                  icon={<EmailIcon />}
                  iconPosition="left"
                  autoComplete="email"
                  required
                />

                <GlassButton
                  type="submit"
                  variant="accent"
                  size="lg"
                  loading={isSubmitting}
                  className="w-full"
                >
                  ارسال لینک بازیابی
                </GlassButton>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  بازگشت به صفحه ورود
                </Link>
              </div>
            </GlassCard>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📧</div>

              <h1 className="text-3xl font-bold text-text-primary mb-2">
                ایمیل ارسال شد
              </h1>

              <p className="text-text-secondary">
                اگر حسابی با این ایمیل وجود داشته باشد،
                <br />
                لینک بازیابی برای شما ارسال خواهد شد.
              </p>
            </div>

            <GlassCard className="p-8">
              <div className="glass-card p-4 bg-green-500/10 border-green-500/20 text-green-400 text-center rounded-xl">
                لینک بازیابی با موفقیت ارسال شد.
              </div>

              <div className="mt-6 text-center text-sm text-text-muted">
                پوشه Spam را نیز بررسی کنید.
              </div>

              <div className="mt-6 space-y-3">
                <GlassButton
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  onClick={() => setEmailSent(false)}
                >
                  ارسال مجدد لینک
                </GlassButton>

                <Link
                  to="/login"
                  className="block text-center text-accent-primary hover:text-accent-primary/80 transition-colors"
                >
                  بازگشت به ورود
                </Link>
              </div>
            </GlassCard>
          </>
        )}
      </div>
    </div>
  );
};