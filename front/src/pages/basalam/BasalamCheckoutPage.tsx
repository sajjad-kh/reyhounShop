import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassInput } from '../../components/ui/GlassInput';
import { useCart } from '../../hooks/basalam/useCart';
import BasalamOrderApiService from '../../services/basalam/BasalamOrderApiService';
import PaymentService from '../../services/basalam/PaymentService';
import { addressService } from '../../services/addressService';
import { shippingMethodService } from '../../services/shippingMethodService';
import { Address, ContactInfo } from '../../types/basalam';
import { ShippingMethod } from '../../types/shipping';

export const BasalamCheckoutPage: React.FC = () => {
    const navigate = useNavigate();
    const { cart, clearCart } = useCart();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
    const [isLoadingShippingMethods, setIsLoadingShippingMethods] = useState(true);

    // Form state
    const [contactInfo, setContactInfo] = useState<ContactInfo>({
        fullName: '',
        phone: '',
        email: ''
    });

    const [shippingAddress, setShippingAddress] = useState<Address>({
        province: '',
        city: '',
        address: '',
        postalCode: ''
    });

    const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<number | null>(null);

    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

    // Load shipping methods on mount
    useEffect(() => {
        const loadShippingMethods = async () => {
            try {
                setIsLoadingShippingMethods(true);
                const methods = await shippingMethodService.getShippingMethodsBySource('basalam');
                setShippingMethods(methods);
                // Auto-select first method if available
                if (methods.length > 0) {
                    setSelectedShippingMethodId(methods[0].id);
                }
            } catch (error) {
                console.error('Failed to load shipping methods:', error);
                setErrors({ shippingMethod: 'خطا در بارگذاری روش‌های ارسال' });
            } finally {
                setIsLoadingShippingMethods(false);
            }
        };

        loadShippingMethods();
    }, []);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Contact info validation
        if (!contactInfo.fullName.trim()) {
            newErrors.fullName = 'نام و نام خانوادگی الزامی است';
        }
        if (!contactInfo.phone.trim()) {
            newErrors.phone = 'شماره تماس الزامی است';
        } else if (!/^09\d{9}$/.test(contactInfo.phone)) {
            newErrors.phone = 'شماره تماس معتبر نیست';
        }
        if (contactInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo.email)) {
            newErrors.email = 'ایمیل معتبر نیست';
        }

        // Address validation
        if (!shippingAddress.province.trim()) {
            newErrors.province = 'استان الزامی است';
        }
        if (!shippingAddress.city.trim()) {
            newErrors.city = 'شهر الزامی است';
        }
        if (!shippingAddress.address.trim()) {
            newErrors.address = 'آدرس الزامی است';
        }
        if (!shippingAddress.postalCode.trim()) {
            newErrors.postalCode = 'کد پستی الزامی است';
        } else if (!/^\d{10}$/.test(shippingAddress.postalCode)) {
            newErrors.postalCode = 'کد پستی باید 10 رقم باشد';
        }

        // Shipping method validation
        if (!selectedShippingMethodId) {
            newErrors.shippingMethod = 'لطفا روش ارسال را انتخاب کنید';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        if (!selectedShippingMethodId) {
            setErrors({ submit: 'لطفا روش ارسال را انتخاب کنید' });
            return;
        }

        setIsSubmitting(true);
        try {
            // Check if user is authenticated
            const token = localStorage.getItem('token');
            if (!token) {
                setErrors({ submit: 'لطفاً ابتدا وارد شوید' });
                navigate('/login?redirect=/basalam/checkout');
                return;
            }

            // Step 1: Create address first
            const createdAddress = await addressService.createAddress({
                title: 'آدرس سفارش بسلام',
                fullName: contactInfo.fullName,
                phone: contactInfo.phone,
                address: shippingAddress.address,
                city: shippingAddress.city,
                province: shippingAddress.province,
                postalCode: shippingAddress.postalCode,
                isDefault: false
            });

            // Step 2: Call new checkout endpoint with addressId and shippingMethodId
            const response = await BasalamOrderApiService.checkout({
                addressId: createdAddress.id,
                shippingMethodId: selectedShippingMethodId,
                callbackUrl: `${window.location.origin}/basalam/payment/callback`
            });

            console.log('✅ Checkout response:', response);

            // Validate response
            if (!response || !response.paymentUrl) {
                throw new Error('پاسخ نامعتبر از سرور. لینک پرداخت دریافت نشد');
            }

            // Save pending order to localStorage for callback verification
            PaymentService.savePendingOrder(
                response.orderId,
                response.basalamOrderId.toString(),
                new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes expiry
            );

            // Clear cart
            clearCart();

            console.log('🔄 Redirecting to payment URL:', response.paymentUrl);

            // Small delay to ensure state is saved
            await new Promise(resolve => setTimeout(resolve, 100));

            // Redirect to payment
            PaymentService.redirectToPayment(response.paymentUrl);
        } catch (error: any) {
            console.error('Order creation failed:', error);

            // Handle authentication errors
            if (error.response?.data?.error?.code === 'MISSING_TOKEN' ||
                error.response?.data?.error?.code === 'INVALID_TOKEN' ||
                error.response?.status === 401) {
                setErrors({ submit: 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید' });
                setTimeout(() => {
                    navigate('/login?redirect=/basalam/checkout');
                }, 2000);
            } else {
                setErrors({ submit: error.message || error.response?.data?.error?.message || 'خطا در ثبت سفارش' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (cart.length === 0) {
        return (
            <div className="container mx-auto px-4 py-8 page-enter">
                <GlassCard className="text-center py-16 scale-in">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-glass-light flex items-center justify-center">
                        <svg className="w-12 h-12 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                    </div>
                    <p className="text-text-primary text-lg font-medium mb-2">سبد خرید شما خالی است</p>
                    <p className="text-text-muted text-sm mb-6">برای ادامه خرید، محصولات را به سبد اضافه کنید</p>
                    <GlassButton onClick={() => navigate('/basalam/products')} className="hover-lift">
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        بازگشت به محصولات
                    </GlassButton>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 page-enter">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-8 fade-in-up">تکمیل سفارش</h1>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Forms */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Contact Information */}
                    <GlassCard className="fade-in-up" style={{ animationDelay: '0.1s' }}>
                        <h2 className="text-xl font-bold text-text-primary mb-4">اطلاعات تماس</h2>
                        <div className="space-y-4">
                            <div>
                                <GlassInput
                                    label="نام و نام خانوادگی"
                                    value={contactInfo.fullName}
                                    onChange={(e) => setContactInfo({ ...contactInfo, fullName: e.target.value })}
                                    error={errors.fullName}
                                    required
                                />
                            </div>
                            <div>
                                <GlassInput
                                    label="شماره تماس"
                                    value={contactInfo.phone}
                                    onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                                    error={errors.phone}
                                    placeholder="09123456789"
                                    required
                                />
                            </div>
                            <div>
                                <GlassInput
                                    label="ایمیل (اختیاری)"
                                    type="email"
                                    value={contactInfo.email}
                                    onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                                    error={errors.email}
                                />
                            </div>
                        </div>
                    </GlassCard>

                    {/* Shipping Address */}
                    <GlassCard className="fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <h2 className="text-xl font-bold text-text-primary mb-4">آدرس تحویل</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <GlassInput
                                        label="استان"
                                        value={shippingAddress.province}
                                        onChange={(e) => setShippingAddress({ ...shippingAddress, province: e.target.value })}
                                        error={errors.province}
                                        required
                                    />
                                </div>
                                <div>
                                    <GlassInput
                                        label="شهر"
                                        value={shippingAddress.city}
                                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                                        error={errors.city}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    آدرس کامل *
                                </label>
                                <textarea
                                    value={shippingAddress.address}
                                    onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                                    className="glass-input w-full px-4 py-2.5 text-base rounded-xl bg-glass-light border-border-glass-light transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                                    rows={3}
                                    required
                                />
                                {errors.address && (
                                    <p className="mt-2 text-sm text-accent-error">{errors.address}</p>
                                )}
                            </div>
                            <div>
                                <GlassInput
                                    label="کد پستی"
                                    value={shippingAddress.postalCode}
                                    onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                                    error={errors.postalCode}
                                    placeholder="1234567890"
                                    required
                                />
                            </div>
                        </div>
                    </GlassCard>

                    {/* Shipping Method */}
                    <GlassCard className="fade-in-up" style={{ animationDelay: '0.3s' }}>
                        <h2 className="text-xl font-bold text-text-primary mb-4">روش ارسال</h2>
                        {isLoadingShippingMethods ? (
                            <div className="text-center py-4">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
                                <p className="text-text-muted mt-2">در حال بارگذاری روش‌های ارسال...</p>
                            </div>
                        ) : shippingMethods.length === 0 ? (
                            <div className="text-center py-4">
                                <p className="text-accent-error">روش ارسالی یافت نشد</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {shippingMethods.map((method) => (
                                    <div
                                        key={method.id}
                                        onClick={() => setSelectedShippingMethodId(method.id)}
                                        className={`p-4 rounded-xl cursor-pointer transition-all duration-300 ${selectedShippingMethodId === method.id
                                            ? 'bg-accent-primary/20 border-2 border-accent-primary'
                                            : 'bg-glass-light border-2 border-transparent hover:border-accent-primary/50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 space-x-reverse">
                                                <div
                                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedShippingMethodId === method.id
                                                        ? 'border-accent-primary bg-accent-primary'
                                                        : 'border-text-muted'
                                                        }`}
                                                >
                                                    {selectedShippingMethodId === method.id && (
                                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-text-primary font-medium">{method.name}</p>
                                                    {method.description && (
                                                        <p className="text-sm text-text-muted mt-1">{method.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {method.baseCost && (
                                                <p className="text-text-primary font-medium">
                                                    {method.baseCost.toLocaleString('fa-IR')} تومان
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {errors.shippingMethod && (
                                    <p className="text-sm text-accent-error mt-2">{errors.shippingMethod}</p>
                                )}
                            </div>
                        )}
                    </GlassCard>
                </div>

                {/* Right Column - Order Summary */}
                <div className="lg:col-span-1">
                    <GlassCard className="sticky top-4 fade-in-up" style={{ animationDelay: '0.15s' }}>
                        <h2 className="text-xl font-bold text-text-primary mb-4">خلاصه سفارش</h2>

                        {/* Order Items */}
                        <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                            {cart.map((item) => (
                                <div key={item.productId} className="flex items-center space-x-3 space-x-reverse">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                        {item.image ? (
                                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-glass-light" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-text-primary truncate">{item.title}</p>
                                        <p className="text-xs text-text-muted">
                                            {item.quantity} × {item.price.toLocaleString('fa-IR')}
                                        </p>
                                    </div>
                                    <p className="text-sm font-medium text-text-primary">
                                        {item.subtotal.toLocaleString('fa-IR')}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Total */}
                        <div className="border-t border-border-glass-light pt-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-text-muted">جمع کل:</span>
                                <span className="text-2xl font-bold text-text-primary">
                                    {subtotal.toLocaleString('fa-IR')} تومان
                                </span>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <GlassButton
                            type="submit"
                            variant="accent"
                            size="lg"
                            className="w-full mt-4"
                            loading={isSubmitting}
                            disabled={isSubmitting}
                        >
                            پرداخت و ثبت سفارش
                        </GlassButton>

                        {errors.submit && (
                            <p className="text-accent-error text-sm mt-2 text-center">
                                {errors.submit}
                            </p>
                        )}
                    </GlassCard>
                </div>
            </form>
        </div>
    );
};
