import React from 'react';
import ErrorBoundary from '../ErrorBoundary';
import { BasalamError, BasalamErrorType } from '../../types/basalam';

interface BasalamErrorFallbackProps {
    error: Error;
    retry: () => void;
}

/**
 * Custom error fallback UI for Basalam components
 */
const BasalamErrorFallback: React.FC<BasalamErrorFallbackProps> = ({ error, retry }) => {
    const isBasalamError = error instanceof BasalamError;

    const getErrorIcon = () => {
        if (isBasalamError) {
            const error_ = error as BasalamError;
            switch (error_.type) {
                case BasalamErrorType.NETWORK_ERROR:
                    return (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                        </svg>
                    );
                case BasalamErrorType.AUTH_ERROR:
                    return (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    );
                case BasalamErrorType.PAYMENT_FAILED:
                    return (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                    );
                default:
                    return (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    );
            }
        }

        return (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        );
    };

    const getErrorTitle = () => {
        if (isBasalamError) {
            const error_ = error as BasalamError;
            switch (error_.type) {
                case BasalamErrorType.NETWORK_ERROR:
                    return 'خطا در اتصال';
                case BasalamErrorType.AUTH_ERROR:
                    return 'خطا در احراز هویت';
                case BasalamErrorType.VALIDATION_ERROR:
                    return 'اطلاعات نامعتبر';
                case BasalamErrorType.PRODUCT_UNAVAILABLE:
                    return 'محصول موجود نیست';
                case BasalamErrorType.ORDER_CREATION_FAILED:
                    return 'خطا در ثبت سفارش';
                case BasalamErrorType.PAYMENT_FAILED:
                    return 'خطا در پرداخت';
                case BasalamErrorType.ORDER_NOT_FOUND:
                    return 'سفارش یافت نشد';
                default:
                    return 'خطایی رخ داده است';
            }
        }
        return 'خطایی رخ داده است';
    };

    const getErrorMessage = () => {
        if (isBasalamError) {
            const error_ = error as BasalamError;
            const messages: Record<BasalamErrorType, string> = {
                [BasalamErrorType.NETWORK_ERROR]: 'اتصال به سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.',
                [BasalamErrorType.AUTH_ERROR]: 'خطا در احراز هویت. لطفاً دوباره وارد شوید.',
                [BasalamErrorType.VALIDATION_ERROR]: 'اطلاعات وارد شده نامعتبر است. لطفاً اطلاعات را بررسی کنید.',
                [BasalamErrorType.PRODUCT_UNAVAILABLE]: 'محصول مورد نظر در حال حاضر موجود نیست.',
                [BasalamErrorType.ORDER_CREATION_FAILED]: 'ثبت سفارش با خطا مواجه شد. لطفاً دوباره تلاش کنید.',
                [BasalamErrorType.PAYMENT_FAILED]: 'پرداخت با خطا مواجه شد. لطفاً دوباره تلاش کنید.',
                [BasalamErrorType.ORDER_NOT_FOUND]: 'سفارش مورد نظر یافت نشد.',
            };
            return messages[error_.type] || error_.message;
        }
        return 'خطایی در پردازش درخواست شما رخ داده است.';
    };

    const showRetryButton = () => {
        if (isBasalamError) {
            const error_ = error as BasalamError;
            // Don't show retry for auth errors or not found errors
            return error_.type !== BasalamErrorType.AUTH_ERROR &&
                error_.type !== BasalamErrorType.ORDER_NOT_FOUND;
        }
        return true;
    };

    return (
        <div className="flex items-center justify-center p-8">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4 text-red-600">
                    {getErrorIcon()}
                </div>

                <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
                    {getErrorTitle()}
                </h3>

                <p className="text-center text-gray-600 mb-6">
                    {getErrorMessage()}
                </p>

                <div className="flex gap-3">
                    {showRetryButton() && (
                        <button
                            onClick={retry}
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            تلاش مجدد
                        </button>
                    )}
                    <button
                        onClick={() => window.location.href = '/basalam/orders'}
                        className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                        بازگشت به سفارشات
                    </button>
                </div>
            </div>
        </div>
    );
};

interface BasalamErrorBoundaryProps {
    children: React.ReactNode;
}

/**
 * ErrorBoundary specifically for Basalam components
 * Provides custom error UI for Basalam-related errors
 */
const BasalamErrorBoundary: React.FC<BasalamErrorBoundaryProps> = ({ children }) => {
    return (
        <ErrorBoundary fallback={(error, retry) => <BasalamErrorFallback error={error} retry={retry} />}>
            {children}
        </ErrorBoundary>
    );
};

export default BasalamErrorBoundary;
