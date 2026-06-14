import React, {
  forwardRef,
  InputHTMLAttributes,
  useState,
  useId,
} from 'react';
import { cn } from '../../utils';

export interface GlassInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled';
  className?: string;

  onChange?: (value: string) => void;
}

const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      iconPosition = 'left',
      size = 'md',
      variant = 'default',
      className,
      placeholder,
      value,
      id,
      onChange,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = !!value;

    const inputId = useId();
    const finalId = id || inputId;

    const baseClasses =
      'text-right glass-input w-full transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm rounded-lg',
      md: 'px-4 py-2.5 text-base rounded-xl',
      lg: 'px-5 py-3 text-lg rounded-2xl',
    };

    const variantClasses = {
      default: 'bg-glass-light border-border-glass-light',
      filled: 'bg-glass-medium border-border-glass-medium',
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange?.(newValue);
    };

    return (
      <div className="relative">
        {label && (
          <label
            htmlFor={finalId}
            className={cn(
              'absolute transition-all duration-300 ease-out pointer-events-none text-right',
              icon && iconPosition === 'left'
                ? size === 'sm'
                  ? 'left-10'
                  : size === 'lg'
                  ? 'left-12'
                  : 'left-11'
                : 'left-4',
              'text-text-secondary',
              isFocused || hasValue || placeholder
                ? 'top-2 text-xs text-accent-primary transform -translate-y-1 text-right'
                : size === 'sm'
                ? 'top-2 text-sm'
                : size === 'lg'
                ? 'top-3.5 text-lg'
                : 'top-2.5 text-base'
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div
              className={cn(
                'absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted pointer-events-none z-10',
                size === 'sm'
                  ? 'w-4 h-4'
                  : size === 'lg'
                  ? 'w-6 h-6'
                  : 'w-5 h-5'
              )}
            >
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={finalId}
            className={cn(
              baseClasses,
              sizeClasses[size],
              variantClasses[variant],
              icon &&
                iconPosition === 'left' &&
                (size === 'sm'
                  ? 'pl-10'
                  : size === 'lg'
                  ? 'pl-12'
                  : 'pl-11'),
              icon &&
                iconPosition === 'right' &&
                (size === 'sm'
                  ? 'pr-10'
                  : size === 'lg'
                  ? 'pr-12'
                  : 'pr-11'),
              label &&
                (size === 'sm'
                  ? 'pt-6 pb-2'
                  : size === 'lg'
                  ? 'pt-8 pb-3'
                  : 'pt-7 pb-2.5'),
              error && 'border-accent-error focus:ring-accent-error',
              'placeholder:text-text-muted',
              className
            )}
            placeholder={label ? '' : placeholder}
            value={value ?? ''}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${finalId}-error`
                : helperText
                ? `${finalId}-helper`
                : undefined
            }
            {...props}
          />

          {icon && iconPosition === 'right' && (
            <div
              className={cn(
                'absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted pointer-events-none z-10',
                size === 'sm'
                  ? 'w-4 h-4'
                  : size === 'lg'
                  ? 'w-6 h-6'
                  : 'w-5 h-5'
              )}
            >
              {icon}
            </div>
          )}
        </div>

        {error && (
          <div
            id={`${finalId}-error`}
            className="mt-2 text-sm text-accent-error glass-card p-2 bg-accent-error/10 border-accent-error/20"
            role="alert"
          >
            {error}
          </div>
        )}

        {helperText && !error && (
          <div
            id={`${finalId}-helper`}
            className="mt-2 text-sm text-text-muted"
          >
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';

export { GlassInput };