import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { CheckoutSteps } from '../components/checkout/CheckoutSteps';
import { AddressSelection } from '../components/checkout/AddressSelection';
import { OrderSummary } from '../components/checkout/OrderSummary';
import { GlassButton } from '../components/ui/GlassButton';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ShippingMethodSelector } from '../components/shipping/ShippingMethodSelector';
import { addressService } from '../services/addressService';
import { Address } from '../types/auth';
import { ShippingMethod } from '../types/shipping';
import { PaymentUpload } from '../components/checkout/PaymentUpload';
import { ReviewStep } from '../components/checkout/ReviewStep';

import { STORAGE_KEYS } from '../utils/constants';
import { secureStorage } from '../utils/security';

type CheckoutStep = 'address' | 'shipping' | 'payment' | 'review';

export const CheckoutPage: React.FC = () => {
    const navigate = useNavigate();
    const { state: cartState } = useCart();
    const { state: authState } = useAuth();

    const { cart, isLoading } = cartState;
    const { user } = authState;

    const [currentStep, setCurrentStep] = useState<CheckoutStep>('address');

    const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
    const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<number | null>(null);

    const [shippingCost, setShippingCost] = useState<number>(0);
    const [paymentProof, setPaymentProof] = useState<File | null>(null);

    // States for ReviewStep
    const [reviewFiles, setReviewFiles] = useState<File[]>([]);
    const [reviewNotes, setReviewNotes] = useState<string>('');

    const [userAddresses, setUserAddresses] = useState<Address[]>([]);
    const [addressesLoading, setAddressesLoading] = useState(false);

    const [shippingMethodsCache, setShippingMethodsCache] = useState<ShippingMethod[]>([]);

    const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
        isOpen: boolean;
        addressId: number | null;
    }>({ isOpen: false, addressId: null });

    // =============================
    // Redirects
    // =============================
    React.useEffect(() => {
        if (!cart.items || cart.items.length === 0) {
            navigate('/');
        }
    }, [cart.items, navigate]);

    React.useEffect(() => {
        if (!user) {
            navigate('/login?redirect=/checkout');
        }
    }, [user, navigate]);

    React.useEffect(() => {
        if (cart.items?.length) {
            const hasBasalam = cart.items.some(i => i.product.basalamProductId);
            const hasInternal = cart.items.some(i => !i.product.basalamProductId);

            if (hasBasalam && !hasInternal) {
                navigate('/basalam/checkout');
            }
        }
    }, [cart.items, navigate]);

    // =============================
    // Load addresses
    // =============================
    React.useEffect(() => {
        const load = async () => {
            if (!user) return;
            setAddressesLoading(true);
            try {
                const res = await addressService.getAddresses();
                setUserAddresses(res);
            } finally {
                setAddressesLoading(false);
            }
        };
        load();
    }, [user]);

    // =============================
    // Shipping Cost
    // =============================
    const calculateShippingCost = (method: ShippingMethod, itemsCount: number) => {
        const base = method.baseCost || 0;
        const additional = method.additionalCost || 0;
        if (itemsCount <= 1) return base;
        return base + additional * (itemsCount - 1);
    };

    React.useEffect(() => {
        if (!selectedShippingMethodId) return;
        const method = shippingMethodsCache.find(m => m.id === selectedShippingMethodId);
        if (!method) return;
        const cost = calculateShippingCost(method, cart.totalItems || 1);
        setShippingCost(cost);
    }, [selectedShippingMethodId, cart.totalItems, shippingMethodsCache]);

    const handleShippingMethodChange = (selectedIds: number[]) => {
        const methodId = selectedIds[0] || null;
        setSelectedShippingMethodId(methodId);

        const method = shippingMethodsCache.find(m => m.id === methodId);
        if (!method) {
            setShippingCost(0);
            return;
        }
        const cost = calculateShippingCost(method, cart.totalItems || 1);
        setShippingCost(cost);
    };

    // =============================
    // Validation
    // =============================
    const canProceed = () => {
        if (currentStep === 'address') return !!selectedAddressId;
        if (currentStep === 'shipping') return !!selectedShippingMethodId;
        if (currentStep === 'payment') return !!paymentProof;
        return true;
    };

    const handleNextStep = () => {
        if (currentStep === 'address') setCurrentStep('shipping');
        else if (currentStep === 'shipping') setCurrentStep('payment');
        else if (currentStep === 'payment') setCurrentStep('review');
    };

    const handlePreviousStep = () => {
        if (currentStep === 'shipping') setCurrentStep('address');
        else if (currentStep === 'payment') setCurrentStep('shipping');
        else if (currentStep === 'review') setCurrentStep('payment');
    };

    // =============================
    // Submit Order
    // =============================
    const handleSubmitOrder = async () => {
        try {
            const formData = new FormData();

            const addressId = Number(selectedAddressId);
            const shippingMethodId = Number(selectedShippingMethodId);
            const cost = Number(shippingCost);

            if (!addressId || addressId <= 0) throw new Error("Invalid addressId");
            if (!shippingMethodId || shippingMethodId <= 0) throw new Error("Invalid shippingMethodId");

            formData.append("addressId", String(addressId));
            formData.append("shippingMethodId", String(shippingMethodId));
            formData.append("shippingCost", String(cost));
            formData.append("items", JSON.stringify(cart.items));

            // Notes
            if (reviewNotes?.trim()) {
                formData.append("notes", reviewNotes.trim());
            }

            // فایل پرداخت (جداگانه)
            if (paymentProof instanceof File) {
                formData.append("paymentProof", paymentProof);
            }

            // فایل‌های اضافی کاربر (طرح، عکس مرجع و ...)
            reviewFiles.forEach((file) => {
                formData.append("userFiles", file);
            });

            const token = secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            if (!token) throw new Error("User is not authenticated");

            // Debug (برای تست)
            console.log("📤 Sending FormData:");
            for (const [key, value] of formData.entries()) {
                console.log(key, value instanceof File ? (value as File).name : value);
            }

            const res = await fetch("http://localhost:3000/api/v1/orders", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                console.error("API ERROR:", data);
                throw new Error(data.message || data.error || "Order creation failed");
            }

            const order = Array.isArray(data.data)
            ? data.data[0]
            : data.data;

            navigate(`/checkout/success?orderId=${order.id}`);

        } catch (err) {
            console.error("Order submit failed:", err);
            alert("خطا در ثبت سفارش");
        }
    };

    // =============================
    // Loading
    // =============================
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-b-2 border-white" />
            </div>
        );
    }

    if (!user || !cart.items?.length) return null;

    return (
        <div className="min-h-screen py-8 px-4" dir="rtl">
            <div className="max-w-7xl mx-auto">

                <CheckoutSteps currentStep={currentStep} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">

                    {/* LEFT SIDE */}
                    <div className="lg:col-span-2 space-y-6">

                        {currentStep === 'address' && (
                            <div className="glass-card p-6">
                                <AddressSelection
                                    addresses={userAddresses}
                                    selectedAddressId={selectedAddressId}
                                    onSelectAddress={setSelectedAddressId}
                                />
                            </div>
                        )}

                        {currentStep === 'shipping' && (
                            <div className="glass-card p-6">
                                <ShippingMethodSelector
                                    selectedIds={selectedShippingMethodId ? [selectedShippingMethodId] : []}
                                    onChange={handleShippingMethodChange}
                                    multiple={false}
                                    showCost
                                    required
                                    onMethodsLoaded={setShippingMethodsCache}
                                />
                            </div>
                        )}

                        {currentStep === 'payment' && (
                            <div className="glass-card p-6">
                                <PaymentUpload
                                    paymentProof={paymentProof}
                                    onChange={setPaymentProof}
                                />
                            </div>
                        )}

                        {currentStep === 'review' && (
                            <ReviewStep
                                cart={cart}
                                shippingCost={shippingCost}
                                files={reviewFiles}
                                onChangeFiles={setReviewFiles}
                                notes={reviewNotes}
                                onChangeNotes={setReviewNotes}
                            />
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex gap-4">
                            {currentStep !== 'address' && (
                                <GlassButton onClick={handlePreviousStep}>
                                    بازگشت
                                </GlassButton>
                            )}

                            {currentStep !== 'review' ? (
                                <GlassButton
                                    onClick={handleNextStep}
                                    disabled={!canProceed()}
                                >
                                    ادامه
                                </GlassButton>
                            ) : (
                                <GlassButton onClick={handleSubmitOrder}>
                                    ثبت نهایی سفارش
                                </GlassButton>
                            )}
                        </div>
                    </div>

                    {/* RIGHT SIDE */}
                    <div className="lg:col-span-1">
                        <div className="glass-card p-6 sticky top-20">
                            <OrderSummary
                                cart={cart}
                                selectedAddressId={selectedAddressId}
                                selectedShippingMethodId={selectedShippingMethodId}
                                shippingCost={shippingCost}
                                paymentMethod="manual"
                            />
                        </div>
                    </div>

                </div>
            </div>

            <ConfirmModal
                isOpen={deleteConfirmModal.isOpen}
                title="حذف آدرس"
                message="آیا مطمئن هستید؟"
                onConfirm={() => {}}
                onCancel={() => setDeleteConfirmModal({ isOpen: false, addressId: null })}
            />
        </div>
    );
};