import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassInput } from '../../components/ui/GlassInput';
import { PasswordStrengthIndicator } from '../../components/ui/PasswordStrengthIndicator';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import {
    validateName,
    validatePhone,
    validateBirthDate,
    validatePassword,
    validateConfirmPassword
} from '../../utils/validation';
import { checkPasswordStrength } from '../../utils/passwordStrength';
import { cn } from '../../utils';

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

const StarIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
);

interface ProfileFormData {
    name: string;
    phone: string;
    birthDate: string;
}

interface PasswordFormData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

interface FormErrors {
    [key: string]: string | undefined;
}

export const ProfilePage: React.FC = () => {
    const { state } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'password' |  'bale' >('profile');

    const [baleConnected, setBaleConnected] = useState(false);

    // Profile form state
    const [profileData, setProfileData] = useState<ProfileFormData>({
        name: '',
        phone: '',
        birthDate: '',
    });
    const [profileErrors, setProfileErrors] = useState<FormErrors>({});
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState('');

    // Password form state
    const [passwordData, setPasswordData] = useState<PasswordFormData>({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordErrors, setPasswordErrors] = useState<FormErrors>({});
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState('');

    // Initialize profile data
    useEffect(() => {
        if (state.user) {
            setProfileData({
                name: state.user.name || '',
                phone: state.user.phone || '',
                birthDate: state.user.birthDate || '',
            });
        }
    }, [state.user]);

    // Profile form handlers
    const handleProfileInputChange = (field: keyof ProfileFormData) => (value: string) => {
        setProfileData(prev => ({ ...prev, [field]: value }));

        // Clear field error
        if (profileErrors[field]) {
            setProfileErrors(prev => ({ ...prev, [field]: undefined }));
        }

        // Clear success message
        if (profileSuccess) {
            setProfileSuccess('');
        }
    };

    const validateProfileForm = (): boolean => {
        const errors: FormErrors = {};

        const nameValidation = validateName(profileData.name);
        if (!nameValidation.isValid) {
            errors.name = nameValidation.error;
        }

        const phoneValidation = validatePhone(profileData.phone);
        if (!phoneValidation.isValid) {
            errors.phone = phoneValidation.error;
        }

        const birthDateValidation = validateBirthDate(profileData.birthDate);
        if (!birthDateValidation.isValid) {
            errors.birthDate = birthDateValidation.error;
        }

        setProfileErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateProfileForm()) {
            return;
        }

        setIsUpdatingProfile(true);

        try {
            // TODO: Implement profile update API call
            // await userService.updateProfile(profileData);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            setProfileSuccess('Profile updated successfully!');
        } catch (error) {
            setProfileErrors({
                general: error instanceof Error ? error.message : 'Failed to update profile'
            });
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    // Password form handlers
    const handlePasswordInputChange = (field: keyof PasswordFormData) => (value: string) => {
        setPasswordData(prev => ({ ...prev, [field]: value }));

        // Clear field error
        if (passwordErrors[field]) {
            setPasswordErrors(prev => ({ ...prev, [field]: undefined }));
        }

        // Clear success message
        if (passwordSuccess) {
            setPasswordSuccess('');
        }
    };

    const validatePasswordForm = (): boolean => {
        const errors: FormErrors = {};

        if (!passwordData.currentPassword) {
            errors.currentPassword = 'Current password is required';
        }

        const newPasswordValidation = validatePassword(passwordData.newPassword);
        if (!newPasswordValidation.isValid) {
            errors.newPassword = newPasswordValidation.error;
        } else {
            const strength = checkPasswordStrength(passwordData.newPassword);
            if (!strength.isValid) {
                errors.newPassword = 'Password is not strong enough';
            }
        }

        const confirmPasswordValidation = validateConfirmPassword(
            passwordData.newPassword,
            passwordData.confirmPassword
        );
        if (!confirmPasswordValidation.isValid) {
            errors.confirmPassword = confirmPasswordValidation.error;
        }

        setPasswordErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validatePasswordForm()) {
            return;
        }

        setIsChangingPassword(true);

        try {
            await authService.changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            });

            setPasswordSuccess('Password changed successfully!');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
        } catch (error) {
            setPasswordErrors({
                general: error instanceof Error ? error.message : 'Failed to change password'
            });
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (!state.user) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="glass-spinner w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-text-primary mb-2">
                    Profile Settings
                </h1>
                <p className="text-text-secondary">
                    Manage your account information and security settings
                </p>
            </div>

            {/* User Info Card */}
            <GlassCard className="p-6">
                <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 glass-card rounded-full flex items-center justify-center">
                        <UserIcon />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-text-primary">
                            {state.user.name}
                        </h2>
                        <p className="text-text-secondary">{state.user.email}</p>
                        <div className="flex items-center mt-2 text-sm text-accent-primary">
                            <StarIcon />
                            <span className="ml-1">{state.user.loyaltyPoints} Loyalty Points</span>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Tabs */}
            <div className="flex space-x-1 glass-card p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={cn(
                        'px-6 py-2 rounded-lg font-medium transition-all duration-200',
                        activeTab === 'profile'
                            ? 'bg-glass-medium text-text-primary shadow-glass'
                            : 'text-text-secondary hover:text-text-primary hover:bg-glass-light'
                    )}
                >
                    Profile Information
                </button>
                <button
                    onClick={() => setActiveTab('password')}
                    className={cn(
                        'px-6 py-2 rounded-lg font-medium transition-all duration-200',
                        activeTab === 'password'
                            ? 'bg-glass-medium text-text-primary shadow-glass'
                            : 'text-text-secondary hover:text-text-primary hover:bg-glass-light'
                    )}
                >
                    Change Password
                </button>
                <button
                onClick={() => setActiveTab('bale')}
                className={cn(
                    'px-6 py-2 rounded-lg font-medium transition-all duration-200',
                    activeTab === 'bale'
                    ? 'bg-glass-medium text-text-primary shadow-glass'
                    : 'text-text-secondary hover:text-text-primary hover:bg-glass-light'
                )}
                >
                Bale Login
                </button>

            </div>

            {/* Tab Content */}
            {activeTab === 'profile' && (
                <GlassCard className="p-8">
                    <h3 className="text-lg font-semibold text-text-primary mb-6">
                        Update Profile Information
                    </h3>

                    <form onSubmit={handleProfileSubmit} className="space-y-6 text-right">
                        {/* Success Message */}
                        {profileSuccess && (
                            <div className="glass-card p-4 bg-green-500/10 border-green-500/20 text-green-400 text-sm rounded-xl">
                                {profileSuccess}
                            </div>
                        )}

                        {/* General Error */}
                        {profileErrors.general && (
                            <div className="glass-card p-4 bg-red-500/10 border-red-500/20 text-red-400 text-sm rounded-xl">
                                {profileErrors.general}
                            </div>
                        )}

                        {/* Email (Read-only) */}
                        <GlassInput
                            type="email"
                            label="Email Address"
                            value={state.user.email}
                            icon={<EmailIcon />}
                            iconPosition="left"
                            disabled
                            helperText="Email cannot be changed. Contact support if needed."
                        />

                        {/* Name */}
                        <GlassInput
                            type="text"
                            label="Full Name"
                            value={profileData.name}
                            onChange={handleProfileInputChange('name')}
                            error={profileErrors.name}
                            icon={<UserIcon />}
                            iconPosition="left"
                            required
                        />

                        {/* Phone */}
                        <GlassInput
                            type="tel"
                            label="Phone Number"
                            value={profileData.phone}
                            onChange={handleProfileInputChange('phone')}
                            error={profileErrors.phone}
                            icon={<PhoneIcon />}
                            iconPosition="left"
                        />

                        {/* Birth Date */}
                        {/* <GlassInput
                            type="date"
                            label="Birth Date"
                            value={profileData.birthDate}
                            onChange={handleProfileInputChange('birthDate')}
                            error={profileErrors.birthDate}
                            icon={<CalendarIcon />}
                            iconPosition="left"
                        /> */}

                        {/* Submit Button */}
                        <div className="flex justify-end">
                            <GlassButton
                                type="submit"
                                variant="accent"
                                loading={isUpdatingProfile}
                                ripple
                            >
                                {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
                            </GlassButton>
                        </div>
                    </form>
                </GlassCard>
            )}

            {activeTab === 'password' && (
                <GlassCard className="p-8">
                    <h3 className="text-lg font-semibold text-text-primary mb-6">
                        Change Password
                    </h3>

                    <form onSubmit={handlePasswordSubmit} className="space-y-6">
                        {/* Success Message */}
                        {passwordSuccess && (
                            <div className="glass-card p-4 bg-green-500/10 border-green-500/20 text-green-400 text-sm rounded-xl">
                                {passwordSuccess}
                            </div>
                        )}

                        {/* General Error */}
                        {passwordErrors.general && (
                            <div className="glass-card p-4 bg-red-500/10 border-red-500/20 text-red-400 text-sm rounded-xl">
                                {passwordErrors.general}
                            </div>
                        )}

                        {/* Current Password */}
                        <GlassInput
                            type="password"
                            label="Current Password"
                            value={passwordData.currentPassword}
                            onChange={handlePasswordInputChange('currentPassword')}
                            error={passwordErrors.currentPassword}
                            icon={<PasswordIcon />}
                            iconPosition="left"
                            required
                        />

                        {/* New Password */}
                        <div className="space-y-2">
                            <GlassInput
                                type="password"
                                label="New Password"
                                value={passwordData.newPassword}
                                onChange={handlePasswordInputChange('newPassword')}
                                error={passwordErrors.newPassword}
                                icon={<PasswordIcon />}
                                iconPosition="left"
                                required
                            />
                            <PasswordStrengthIndicator password={passwordData.newPassword} />
                        </div>

                        {/* Confirm New Password */}
                        <GlassInput
                            type="password"
                            label="Confirm New Password"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordInputChange('confirmPassword')}
                            error={passwordErrors.confirmPassword}
                            icon={<PasswordIcon />}
                            iconPosition="left"
                            required
                        />

                        {/* Submit Button */}
                        <div className="flex justify-end">
                            <GlassButton
                                type="submit"
                                variant="accent"
                                loading={isChangingPassword}
                                ripple
                            >
                                {isChangingPassword ? 'Changing...' : 'Change Password'}
                            </GlassButton>
                        </div>
                    </form>
                </GlassCard>
            )}

            {activeTab === 'bale' && (
            <GlassCard className="p-8">
                <h3 className="text-lg font-semibold text-text-primary mb-6">
                اتصال حساب بله
                </h3>

                {!baleConnected ? (
                <div className="space-y-6">

                    <div className="glass-card p-4">
                    <p className="text-text-secondary">
                        برای ورود سریع‌تر می‌توانید حساب بله خود را
                        به حساب کاربری متصل کنید.
                    </p>
                    </div>

                    <div className="flex justify-end">
                    <GlassButton
                        variant="accent"
                        ripple
                    >
                        اتصال حساب بله
                    </GlassButton>
                    </div>

                </div>
                ) : (
                <div className="space-y-6">

                    <div className="glass-card p-4 border-green-500/20 bg-green-500/10">
                    <p className="text-green-400">
                        حساب بله شما متصل شده است
                    </p>
                    </div>

                    <div className="space-y-2">
                    <p className="text-text-secondary">
                        نام کاربری بله:
                    </p>

                    <p className="text-text-primary">
                        @username
                    </p>
                    </div>

                    <div className="flex justify-end">
                    <GlassButton
                        variant="secondary"
                    >
                        قطع اتصال
                    </GlassButton>
                    </div>

                </div>
                )}
            </GlassCard>
            )}


        </div>
    );
};