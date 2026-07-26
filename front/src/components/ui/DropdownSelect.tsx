import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface DropdownOption {
    value: string;
    label: string;
    hint?: string;
}

interface DropdownSelectProps {
    options: DropdownOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const DropdownSelect: React.FC<DropdownSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'انتخاب کنید',
    className = '',
    disabled = false,
}) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
        top: 0,
        left: 0,
        width: 0,
    });
    const selected = options.find((o) => o.value === value);

    // Recalculate position when opening (handles scroll/resize)
    useEffect(() => {
        if (!open || !buttonRef.current) return;
        const update = () => {
            const rect = buttonRef.current!.getBoundingClientRect();
            setCoords({ top: rect.bottom + 8, left: rect.left, width: rect.width });
        };
        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [open]);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    const list = open ? (
        <div
            className="fixed z-[9999] rounded-xl shadow-2xl max-h-60 overflow-auto p-1.5 space-y-1 border border-white/10"
            style={{
                top: coords.top,
                left: coords.left,
                width: coords.width,
                background: 'rgba(30, 32, 48, 0.98)',
                backdropFilter: 'blur(14px)',
            }}
            // stop propagation so document mousedown (outside-click) doesn't fire before click
            onMouseDown={(e) => e.stopPropagation()}
        >
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                    }}
                    style={
                        opt.value === value
                            ? { background: 'linear-gradient(to left, rgba(110,142,251,0.30), rgba(110,142,251,0.10))' }
                            : undefined
                    }
                    className={`group w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm rounded-lg border-b border-white/5 last:border-b-0 transition ${
                        opt.value === value
                            ? 'text-accent-primary font-semibold'
                            : 'text-text-secondary hover:text-text-primary'
                    }`}
                    onMouseEnter={(e) => {
                        if (opt.value !== value) e.currentTarget.style.background = 'rgba(110,142,251,0.15)';
                    }}
                    onMouseLeave={(e) => {
                        if (opt.value !== value) e.currentTarget.style.background = 'transparent';
                    }}
                >
                    <span className="flex items-center gap-2">
                        <span
                            className={`w-1.5 h-1.5 rounded-full transition ${
                                opt.value === value ? 'bg-accent-primary' : 'bg-white/30 group-hover:bg-accent-primary'
                            }`}
                        />
                        {opt.label}
                        {opt.hint && <span className="text-text-muted text-xs">({opt.hint})</span>}
                    </span>
                    {opt.value === value && <span className="text-accent-primary text-base">✓</span>}
                </button>
            ))}
        </div>
    ) : null;

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                ref={buttonRef}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen((o) => !o)}
                className="glass-input w-full rounded-xl p-3 text-text-primary text-sm border border-accent/40 outline-none focus:ring-2 focus:ring-accent/50 transition flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(to left, rgba(110,142,251,0.18), var(--glass-bg-light))' }}
            >
                <span className={selected ? 'text-text-primary' : 'text-text-muted'}>
                    {selected ? selected.label + (selected.hint ? ` (${selected.hint})` : '') : placeholder}
                </span>
                <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {createPortal(list, document.body)}
        </div>
    );
};

export default DropdownSelect;
