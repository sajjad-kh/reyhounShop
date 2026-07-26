import React, { useEffect, useState } from 'react';
import { toast, type Toast } from 'react-hot-toast';

interface ToastCardProps {
    t: Toast;
    type: 'success' | 'error' | 'info';
    message: string;
}

const THEME = {
    success: { base: '#10b981', glow: 'rgba(16,185,129,0.35)', soft: 'rgba(16,185,129,0.14)' },
    error: { base: '#ef4444', glow: 'rgba(239,68,68,0.35)', soft: 'rgba(239,68,68,0.14)' },
    info: { base: '#6366f1', glow: 'rgba(99,102,241,0.35)', soft: 'rgba(99,102,241,0.14)' },
};

const ICON = {
    success: '✓',
    error: '✕',
    info: 'i',
};

export const ToastCard: React.FC<ToastCardProps> = ({ t, type, message }) => {
    const c = THEME[type];
    const [entered, setEntered] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setEntered(true));
    }, []);

    const isVisible = entered && t.visible;

    return (
        <div
            style={{
                position: 'relative',
                minWidth: '260px',
                maxWidth: '380px',
                padding: '9px 12px',
                borderRadius: '13px',
                direction: 'rtl',
                textAlign: 'right',
                color: '#f5f5f7',
                background:
                    'linear-gradient(135deg, rgba(38,40,58,0.9) 0%, rgba(24,26,40,0.85) 100%)',
                backdropFilter: 'blur(22px) saturate(180%)',
                WebkitBackdropFilter: 'blur(22px) saturate(180%)',
                border: `1px solid ${c.glow}`,
                boxShadow: `0 18px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`,
                overflow: 'hidden',
                opacity: isVisible ? 1 : 0,
                transform: isVisible
                    ? 'translateY(0) scale(1)'
                    : 'translateY(-100%) scale(0.92)',
                transition: 'all 400ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span
                    style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '8px',
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#fff',
                        background: `linear-gradient(135deg, ${c.base}, ${c.base}cc)`,
                        boxShadow: `0 6px 16px ${c.glow}`,
                    }}
                >
                    {ICON[type]}
                </span>
                <span
                    style={{
                        flex: 1,
                        fontSize: '13px',
                        lineHeight: '1.4',
                        fontWeight: 500,
                        letterSpacing: '0.1px',
                    }}
                >
                    {message}
                </span>
            </div>
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'rgba(255,255,255,0.07)',
                }}
            >
                <div
                    style={{
                        height: '100%',
                        background: `linear-gradient(90deg, ${c.base}, ${c.base}66)`,
                        width: t.visible ? '100%' : '0%',
                        transformOrigin: 'right',
                        animation: t.visible ? 'toast-progress 3s linear forwards' : 'none',
                        boxShadow: `0 0 10px ${c.glow}`,
                    }}
                />
            </div>
        </div>
    );
};

export const showToast = {
    success: (msg: string) =>
        toast.custom((t) => <ToastCard t={t} type="success" message={msg} />, {
            duration: 3000,
        }),
    error: (msg: string) =>
        toast.custom((t) => <ToastCard t={t} type="error" message={msg} />, {
            duration: 4000,
        }),
    info: (msg: string) =>
        toast.custom((t) => <ToastCard t={t} type="info" message={msg} />, {
            duration: 3000,
        }),
};
