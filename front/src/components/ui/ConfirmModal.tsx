import React from 'react';
import { GlassCard } from './GlassCard';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'تأیید',
    cancelText = 'لغو',
    onConfirm,
    onCancel,
    type = 'warning',
}) => {
    // Keyboard navigation: Close modal on Escape key
    React.useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const getTypeColor = () => {
        switch (type) {
            case 'danger':
                return 'text-red-500';
            case 'warning':
                return 'text-yellow-500';
            case 'info':
                return 'text-blue-500';
            default:
                return 'text-yellow-500';
        }
    };

    const getConfirmButtonColor = () => {
        switch (type) {
            case 'danger':
                return 'bg-red-500/20 hover:bg-red-500/30 text-red-500';
            case 'warning':
                return 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500';
            case 'info':
                return 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-500';
            default:
                return 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500';
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            aria-describedby="confirm-modal-message"
        >
            <GlassCard className="w-full max-w-md animate-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 space-x-reverse">
                        <div className={`p-2 rounded-lg ${type === 'danger' ? 'bg-red-500/20' : type === 'warning' ? 'bg-yellow-500/20' : 'bg-blue-500/20'}`}>
                            <AlertCircle className={`w-6 h-6 ${getTypeColor()}`} aria-hidden="true" />
                        </div>
                        <h2 id="confirm-modal-title" className="text-xl font-bold text-text-primary">
                            {title}
                        </h2>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 rounded-lg bg-glass-light hover:bg-glass-medium transition-colors"
                        aria-label="بستن پنجره تأیید"
                    >
                        <X className="w-5 h-5 text-text-primary" aria-hidden="true" />
                    </button>
                </div>

                <p id="confirm-modal-message" className="text-text-secondary mb-6 text-right">
                    {message}
                </p>

                <div className="flex items-center justify-end space-x-3 space-x-reverse">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2 rounded-xl bg-glass-light hover:bg-glass-medium text-text-primary transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                        aria-label={`${cancelText} و بستن پنجره`}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-6 py-2 rounded-xl font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 ${getConfirmButtonColor()}`}
                        aria-label={`${confirmText} عملیات`}
                    >
                        {confirmText}
                    </button>
                </div>
            </GlassCard>
        </div>
    );
};
