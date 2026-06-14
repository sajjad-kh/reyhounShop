import React from 'react';
import { useToast } from '../../context/ToastContext';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastType } from '../../types/toast';

const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToast();

    const getToastIcon = (type: ToastType) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-5 h-5" />;
            case 'error':
                return <AlertCircle className="w-5 h-5" />;
            case 'warning':
                return <AlertTriangle className="w-5 h-5" />;
            case 'info':
                return <Info className="w-5 h-5" />;
        }
    };

    const getToastStyles = (type: ToastType) => {
        switch (type) {
            case 'success':
                return 'bg-green-500/20 text-green-500 border-green-500/30';
            case 'error':
                return 'bg-red-500/20 text-red-500 border-red-500/30';
            case 'warning':
                return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
            case 'info':
                return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
        }
    };

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2" dir="rtl">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`flex items-center space-x-2 space-x-reverse px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-right duration-300 ${getToastStyles(
                        toast.type
                    )}`}
                >
                    {getToastIcon(toast.type)}
                    <span className="font-medium flex-1">{toast.message}</span>
                    {toast.dismissible && (
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="ml-2 p-1 rounded-lg hover:bg-black/10 transition-colors"
                            aria-label="بستن پیام"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
