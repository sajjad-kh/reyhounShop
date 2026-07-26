import React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';

export const CheckoutSuccessPage: React.FC = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const orderId = params.get('orderId');
    const orderCode = params.get('orderCode');

    return (
        <div className="min-h-[70vh] flex items-center justify-center p-6" dir="rtl">
            <GlassCard className="max-w-md w-full p-8 text-center">
                <div
                    className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                    style={{
                        background: 'linear-gradient(135deg, #10b981, #10b981cc)',
                        boxShadow: '0 10px 30px rgba(16,185,129,0.35)',
                    }}
                >
                    <span className="text-4xl text-white font-bold">✓</span>
                </div>

                <h1 className="text-2xl font-bold text-text-primary mb-2">سفارش شما ثبت شد</h1>
                <p className="text-text-secondary mb-1">
                    سفارش شما با موفقیت ثبت و در حال پردازش است.
                </p>
                {orderCode && (
                    <p className="text-sm text-text-muted mb-6 font-mono">
                        شماره سفارش: {orderCode}
                    </p>
                )}

                <div className="flex flex-col gap-3">
                    <GlassButton variant="accent" onClick={() => navigate(`/orders/${orderId}`)}>
                        مشاهده جزئیات سفارش
                    </GlassButton>
                    <Link to="/products">
                        <GlassButton variant="secondary" className="w-full">
                            ادامه خرید
                        </GlassButton>
                    </Link>
                </div>
            </GlassCard>
        </div>
    );
};

export default CheckoutSuccessPage;
