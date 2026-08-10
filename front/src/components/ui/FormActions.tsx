import React from 'react';
import { GlassButton } from './GlassButton';
import { ModalFooter } from './GlassModal';

interface FormActionsProps {
    loading?: boolean;
    disabled?: boolean;
    cancelText?: string;
    submitText?: string;
    onCancel?: () => void;
    formId?: string;
    size?: 'sm' | 'md' | 'lg' | 'full' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
}

export const FormActions: React.FC<FormActionsProps> = ({
    loading = false,
    disabled = false,
    cancelText = 'لغو',
    submitText,
    onCancel,
    formId,
    size = 'xl',
}) => {
    return (
        <ModalFooter>
            <GlassButton
                type="button"
                variant="secondary"
                onClick={onCancel}
                disabled={loading || disabled}
                size={size}
            >
                {cancelText}
            </GlassButton>
            {submitText && (
                <GlassButton
                    type="submit"
                    form={formId}
                    variant="accent"
                    loading={loading}
                    disabled={loading || disabled}
                    size={size}
                >
                    {submitText}
                </GlassButton>
            )}
        </ModalFooter>
    );
};
