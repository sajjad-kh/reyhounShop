import { Component, ErrorInfo, ReactNode } from 'react';
import { BasalamError, BasalamErrorType } from '../types/basalam';

interface Props {
    children: ReactNode;
    fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }

        // Log error details
        this.logError(error, errorInfo);

        this.setState({
            error,
            errorInfo,
        });
    }

    logError(error: Error, errorInfo: ErrorInfo) {
        // Log to console with details
        console.error('Error caught by ErrorBoundary:', {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
        });

        // In production, you could send this to an error tracking service
        // Example: Sentry, LogRocket, etc.
    }

    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    getErrorMessage(error: Error): string {
        if (error instanceof BasalamError) {
            const messages: Record<BasalamErrorType, string> = {
                [BasalamErrorType.NETWORK_ERROR]: 'اتصال به سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.',
                [BasalamErrorType.AUTH_ERROR]: 'خطا در احراز هویت. لطفاً دوباره وارد شوید.',
                [BasalamErrorType.VALIDATION_ERROR]: 'اطلاعات وارد شده نامعتبر است.',
                [BasalamErrorType.PRODUCT_UNAVAILABLE]: 'محصول مورد نظر در حال حاضر موجود نیست.',
                [BasalamErrorType.ORDER_CREATION_FAILED]: 'ثبت سفارش با خطا مواجه شد. لطفاً دوباره تلاش کنید.',
                [BasalamErrorType.PAYMENT_FAILED]: 'پرداخت با خطا مواجه شد. لطفاً دوباره تلاش کنید.',
                [BasalamErrorType.ORDER_NOT_FOUND]: 'سفارش مورد نظر یافت نشد.',
            };
            return messages[error.type] || error.message;
        }
        return 'خطایی رخ داده است. لطفاً دوباره تلاش کنید.';
    }

    render() {
        if (this.state.hasError && this.state.error) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.handleRetry);
            }

            // Default error UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                            <svg
                                className="w-6 h-6 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>

                        <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
                            خطایی رخ داده است
                        </h2>

                        <p className="text-center text-gray-600 mb-6">
                            {this.getErrorMessage(this.state.error)}
                        </p>

                        {process.env.NODE_ENV === 'development' && (
                            <details className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                                    جزئیات خطا (فقط در حالت توسعه)
                                </summary>
                                <div className="text-xs text-gray-600 space-y-2">
                                    <div>
                                        <strong>پیام:</strong>
                                        <pre className="mt-1 whitespace-pre-wrap break-words">
                                            {this.state.error.message}
                                        </pre>
                                    </div>
                                    {this.state.error.stack && (
                                        <div>
                                            <strong>Stack Trace:</strong>
                                            <pre className="mt-1 whitespace-pre-wrap break-words text-xs">
                                                {this.state.error.stack}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={this.handleRetry}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                تلاش مجدد
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                                بازگشت به صفحه اصلی
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
