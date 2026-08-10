import { useEffect, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  dir?: 'rtl' | 'ltr';
}

interface ModalHeaderProps {
  children: ReactNode;
  icon?: ReactNode;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  className?: string;
}

interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

const GlassModal = ({
  isOpen,
  onClose,
  children,
  size = 'md',
  className,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  dir = 'rtl',
}: GlassModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, closeOnEscape]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md"
      onClick={handleOverlayClick}
      dir={dir}
    >
      <div
        ref={modalRef}
        className={cn(
          'w-full flex flex-col max-h-[90vh] rounded-2xl border border-white/10',
          'bg-glass-light backdrop-blur-md shadow-glass',
          sizeClasses[size],
          className
        )}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
};

const ModalHeader = ({
  children,
  icon,
  title,
  subtitle,
  onClose,
  className,
}: ModalHeaderProps) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-6 py-4 border-b border-white/10 rounded-t-2xl shrink-0',
        className
      )}
      style={{ background: 'linear-gradient(180deg, rgba(51,65,85,0.9) 0%, rgba(30,41,59,0.85) 100%)', backdropFilter: 'blur(16px)' }}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 border border-accent-primary/20 flex items-center justify-center">
            {icon}
          </div>
        )}
        <div>
          {title && <h2 className="text-lg font-bold text-text-primary leading-tight">{title}</h2>}
          {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
          {!title && children}
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/15 border border-white/10 hover:border-red-400/30 flex items-center justify-center transition-all duration-200"
        >
          <X className="w-4 h-4 text-text-muted hover:text-red-400" />
        </button>
      )}
    </div>
  );
};

const ModalBody = ({ children, className }: ModalBodyProps) => {
  return (
    <div className={cn('px-4 sm:px-6 py-4 sm:py-5 space-y-4 overflow-y-auto flex-1', className)}>
      {children}
    </div>
  );
};

const ModalFooter = ({ children, className }: ModalFooterProps) => {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 rounded-b-2xl shrink-0',
        className
      )}
      style={{ background: 'linear-gradient(0deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.85) 100%)', backdropFilter: 'blur(20px)' }}
    >
      {children}
    </div>
  );
};

export { GlassModal, ModalHeader, ModalBody, ModalFooter };
export type { GlassModalProps, ModalHeaderProps, ModalBodyProps, ModalFooterProps };
