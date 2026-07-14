import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { TourStep } from '../../types/tour';
import { GlassButton } from '../ui/GlassButton';
import { X, HelpCircle } from 'lucide-react';

interface TourProps {
    steps: TourStep[];
    isOpen: boolean;
    onClose: (persist?: boolean) => void;
}

interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

const PADDING = 8;
const GAP = 12;
const TOOLTIP_W = 360;
const TOOLTIP_H = 240;

type ConcretePlacement = Exclude<TourPlacement, 'auto'>;

// Pick the side with the most free space around the target so the tooltip
// never overflows the viewport. Prefers bottom, then top, then right, then left.
const resolvePlacement = (
    placement: TourPlacement,
    rect: Rect,
    vw: number,
    vh: number
): ConcretePlacement => {
    if (placement !== 'auto') return placement;

    const spaceTop = rect.top;
    const spaceBottom = vh - (rect.top + rect.height);
    const spaceLeft = rect.left;
    const spaceRight = vw - (rect.left + rect.width);

    if (spaceBottom >= TOOLTIP_H) return 'bottom';
    if (spaceTop >= TOOLTIP_H) return 'top';
    if (spaceRight >= TOOLTIP_W) return 'right';
    if (spaceLeft >= TOOLTIP_W) return 'left';

    const max = Math.max(spaceTop, spaceBottom, spaceLeft, spaceRight);
    if (max === spaceBottom) return 'bottom';
    if (max === spaceTop) return 'top';
    if (max === spaceRight) return 'right';
    return 'left';
};

const Tour: React.FC<TourProps> = ({ steps, isOpen, onClose }) => {
    const [current, setCurrent] = useState(0);
    const [rect, setRect] = useState<Rect | null>(null);
    const [targetMissing, setTargetMissing] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const handleClose = useCallback(() => {
        onClose(dontShowAgain);
    }, [onClose, dontShowAgain]);

    const computeRect = useCallback(
        (step: TourStep | undefined) => {
            if (!step) {
                setRect(null);
                setTargetMissing(true);
                return;
            }

            const el = (() => {
                try {
                    return document.querySelector(step.selector);
                } catch {
                    // Invalid selector (e.g. contains illegal CSS chars) must not
                    // crash the app — treat it as a missing target.
                    return null;
                }
            })();

            if (!el) {
                setRect(null);
                setTargetMissing(true);
                return;
            }

            setTargetMissing(false);
            const r = el.getBoundingClientRect();
            setRect({
                top: r.top,
                left: r.left,
                width: r.width,
                height: r.height,
            });
        },
        []
    );

    // Reset to first step whenever the tour opens
    useEffect(() => {
        if (isOpen) {
            setCurrent(0);
            setDontShowAgain(false);
        }
    }, [isOpen]);

    // Position the highlighted element on step change + scroll into view
    useLayoutEffect(() => {
        if (!isOpen) return;
        const step = steps[current];
        computeRect(step);

        if (step) {
            let el: Element | null = null;
            try {
                el = document.querySelector(step.selector);
            } catch {
                el = null;
            }
            el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }, [isOpen, current, steps, computeRect]);

    // Re-position on scroll / resize
    useEffect(() => {
        if (!isOpen) return;

        const handler = () => computeRect(steps[current]);
        window.addEventListener('scroll', handler, true);
        window.addEventListener('resize', handler);

        return () => {
            window.removeEventListener('scroll', handler, true);
            window.removeEventListener('resize', handler);
        };
    }, [isOpen, current, steps, computeRect]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
            if (e.key === 'ArrowRight') next();
            if (e.key === 'ArrowLeft') prev();
        };

        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, current, handleClose]);

    if (!isOpen || steps.length === 0) return null;

    const step = steps[current];
    const isLast = current === steps.length - 1;

    const next = () => {
        if (isLast) handleClose();
        else setCurrent((c) => c + 1);
    };

    const prev = () => {
        if (current > 0) setCurrent((c) => c - 1);
    };

    // Tooltip placement
    const tooltipStyle: React.CSSProperties = (() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const w = Math.min(TOOLTIP_W, vw - 24);

        if (!rect || targetMissing) {
            return {
                top: vh / 2 - TOOLTIP_H / 2,
                left: vw / 2 - w / 2,
                width: w,
            };
        }

        const placement = resolvePlacement(step.placement, rect, vw, vh);
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let top = rect.top;
        let left = rect.left;

        if (placement === 'bottom') {
            top = rect.top + rect.height + GAP + PADDING;
            left = cx - w / 2;
        } else if (placement === 'top') {
            top = rect.top - GAP - PADDING - TOOLTIP_H;
            left = cx - w / 2;
        } else if (placement === 'left') {
            top = cy - TOOLTIP_H / 2;
            left = rect.left - GAP - w;
        } else if (placement === 'right') {
            top = cy - TOOLTIP_H / 2;
            left = rect.left + rect.width + GAP + PADDING;
        }

        // Clamp within viewport
        left = Math.max(12, Math.min(left, vw - w - 12));
        top = Math.max(12, Math.min(top, vh - TOOLTIP_H - 12));

        return { top, left, width: w };
    })();

    return (
        <div className="fixed inset-0 z-[1000]" role="dialog" aria-modal="true">
            {/* Dark overlay with a cutout around the highlighted element */}
            {rect && !targetMissing && (
                <div
                    className="absolute pointer-events-none rounded-xl transition-all duration-300"
                    style={{
                        top: rect.top - PADDING,
                        left: rect.left - PADDING,
                        width: rect.width + PADDING * 2,
                        height: rect.height + PADDING * 2,
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
                        border: '2px solid rgba(255,255,255,0.9)',
                    }}
                />
            )}

            {/* Plain dark overlay when there is no target element */}
            {(!rect || targetMissing) && (
                <div className="absolute inset-0 bg-black/75" />
            )}

            {/* Tooltip */}
            <div
                dir="rtl"
                className="absolute z-[1001] rounded-2xl border border-accent-primary/30 bg-gradient-to-br from-[#241f38] to-[#15121f] backdrop-blur-xl shadow-2xl shadow-black/60 ring-1 ring-white/5 p-3 max-w-[calc(100vw-24px)] transition-all duration-300"
                style={tooltipStyle}
            >
                <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2 text-accent-primary min-w-0">
                        <HelpCircle className="w-5 h-5 shrink-0" />
                        <h3 className="font-bold text-base text-text-primary leading-snug">
                            {step.title}
                        </h3>
                    </div>
                    <button
                        onClick={handleClose}
                        className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        aria-label="بستن"
                    >
                        <X className="w-4 h-4 text-text-secondary" />
                    </button>
                </div>

                <p className="text-sm text-text-secondary leading-relaxed mb-2 whitespace-pre-line">
                    {step.description}
                </p>

                {/* Progress bar */}
                <div className="mt-3 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-accent transition-all duration-300"
                        style={{ width: `${((current + 1) / steps.length) * 100}%` }}
                    />
                </div>

                <span className="mt-3 block text-right text-xs text-text-muted whitespace-nowrap tabular-nums">
                    {current + 1} از {steps.length}
                </span>

                {/* Navigation footer */}
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
                    <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer select-none shrink-0">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="accent-accent-primary w-3.5 h-3.5"
                        />
                        دیگر این صفحه را نشان نده
                    </label>

                    <div className="flex items-center gap-2 shrink-0">
                        {current > 0 && (
                            <GlassButton
                                size="sm"
                                variant="secondary"
                                onClick={prev}
                                className="!px-4 !py-1.5 rounded-lg text-xs justify-center"
                            >
                                قبلی
                            </GlassButton>
                        )}

                        <GlassButton
                            size="sm"
                            variant="accent"
                            onClick={next}
                            className="!px-5 !py-1.5 rounded-lg text-xs justify-center shadow-lg shadow-accent-primary/30 min-w-[88px]"
                        >
                            {isLast ? 'پایان' : 'بعدی'}
                        </GlassButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Tour;
