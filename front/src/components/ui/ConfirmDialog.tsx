import { ConfirmDialogProps } from '../../types/modal';
import { GlassModal } from './GlassModal';
import { GlassButton } from './GlassButton';
import { cn } from '../../utils';

export const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'info',
}: ConfirmDialogProps) => {
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    const variantStyles = {
        danger: {
            icon: '⚠',
            iconBg: 'bg-red-500/20',
            iconColor: 'text-red-400',
            confirmBg: 'bg-red-500/30 hover:bg-red-500/40',
        },
        warning: {
            icon: '⚠',
            iconBg: 'bg-yellow-500/20',
            iconColor: 'text-yellow-400',
            confirmBg: 'bg-yellow-500/30 hover:bg-yellow-500/40',
        },
        info: {
            icon: 'ℹ',
            iconBg: 'bg-blue-500/20',
            iconColor: 'text-blue-400',
            confirmBg: 'bg-blue-500/30 hover:bg-blue-500/40',
        },
    };

    const style = variantStyles[variant];

    return (
        <GlassModal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            showCloseButton={false}
            closeOnOverlayClick={false}
        >
            <div className="flex flex-col items-center text-center">
                {/* Icon */}
                <div
                    className={cn(
                        'w-16 h-16 rounded-full flex items-center justify-center mb-4',
                        style.iconBg
                    )}
                >
                    <span className={cn('text-3xl', style.iconColor)}>
                        {style.icon}
                    </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                    {title}
                </h3>

                {/* Message */}
                <p className="text-text-secondary mb-6">{message}</p>

                {/* Actions */}
                <div className="flex gap-3 w-full">
                    <GlassButton
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1"
                    >
                        {cancelText}
                    </GlassButton>
                    <GlassButton
                        variant="primary"
                        onClick={handleConfirm}
                        className={cn('flex-1', style.confirmBg)}
                    >
                        {confirmText}
                    </GlassButton>
                </div>
            </div>
        </GlassModal>
    );
};
