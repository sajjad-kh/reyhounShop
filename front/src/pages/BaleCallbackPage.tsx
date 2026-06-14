import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const BaleCallbackPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { loginWithBale } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');

    useEffect(() => {
        const loginId = searchParams.get('loginId');
        if (!loginId) {
            setStatus('error');
            return;
        }

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/v1/auth/bale/status/${loginId}`);
                const data = await res.json();

                console.log('📊 Status:', data?.data?.status);

                if (data?.data?.status === 'APPROVED') {
                    clearInterval(interval);
                    localStorage.removeItem('bale_login_id');
                    await loginWithBale(data.data.token, data.data.user);
                    setStatus('success');
                    navigate('/');
                }

                if (data?.data?.status === 'EXPIRED') {
                    clearInterval(interval);
                    setStatus('error');
                }

            } catch (err) {
                console.error(err);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
            <div className="text-center space-y-4">
                {status === 'checking' && (
                    <>
                        <div className="text-4xl animate-spin">⚙️</div>
                        <p className="text-text-primary text-lg">در حال ورود...</p>
                        <p className="text-text-secondary text-sm">لطفاً صبر کنید</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <div className="text-4xl">✅</div>
                        <p className="text-text-primary text-lg">ورود موفق!</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div className="text-4xl">❌</div>
                        <p className="text-text-primary text-lg">خطا در ورود</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="text-accent-primary underline"
                        >
                            بازگشت به صفحه ورود
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};