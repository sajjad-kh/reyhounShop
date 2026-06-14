import React, { memo, useMemo, useCallback } from 'react';
import { ShippingMethod } from '../../types/shipping';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils';

export interface ShippingMethodCardProps {
    shippingMethod: ShippingMethod;
    selected: boolean;
    onSelect: (id: number) => void;
    showCost: boolean;
    disabled?: boolean;
    selectionMode?: 'checkbox' | 'radio';
}

const ShippingMethodCardComponent: React.FC<ShippingMethodCardProps> = ({
    shippingMethod,
    selected,
    onSelect,
    showCost,
    disabled = false,
    selectionMode = 'checkbox',
}) => {

    // ✅ normalize numbers once (avoid recalculation in render)
    const baseCost = useMemo(() => Number(shippingMethod.baseCost ?? 0), [shippingMethod.baseCost]);
    const additionalCost = useMemo(() => Number(shippingMethod.additionalCost ?? 0), [shippingMethod.additionalCost]);
    const additionalDimensionsCost = useMemo(
        () => Number(shippingMethod.additionalDimensionsCost ?? 0),
        [shippingMethod.additionalDimensionsCost]
    );

    // ✅ stable handler
    const handleSelect = useCallback(() => {
        if (!disabled) {
            onSelect(shippingMethod.id);
        }
    }, [disabled, onSelect, shippingMethod.id]);

    return (
        <div
            onClick={disabled ? undefined : handleSelect}
            className={cn(
                'glass-card p-4 transition-all duration-300 cursor-pointer',
                'border-2 hover:brightness-110',
                selected
                    ? 'border-blue-400 bg-blue-500/10'
                    : 'border-white/10 hover:border-white/20',
                disabled && 'opacity-50 cursor-not-allowed hover:brightness-100'
            )}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-pressed={selected}
            aria-disabled={disabled}
        >
            <div className="flex items-start gap-3">

                {/* Selection */}
                <div className="flex-shrink-0 mt-1">
                    {selectionMode === 'checkbox' ? (
                        <div
                            className={cn(
                                'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                                selected
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'border-white/40 bg-white/5'
                            )}
                        >
                            {selected && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                    ) : (
                        <div
                            className={cn(
                                'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                                selected ? 'border-blue-500' : 'border-white/40'
                            )}
                        >
                            {selected && <div className="w-3 h-3 rounded-full bg-blue-500" />}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">

                    <h3 className="text-white font-semibold text-base mb-1">
                        {shippingMethod.name}
                    </h3>

                    {shippingMethod.description && (
                        <p className="text-white/60 text-sm mb-2 line-clamp-2">
                            {shippingMethod.description}
                        </p>
                    )}

                    {showCost && (
                        <div className="flex flex-wrap gap-3 mt-3">

                            {/* Base */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-white/80 text-sm">
                                    هزینه پایه:{' '}
                                    <span className="font-medium text-white">
                                        {formatCurrency(baseCost)}
                                    </span>
                                </span>
                            </div>

                            {/* Additional */}
                            {additionalCost > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-white/80 text-sm">
                                        هزینه اضافی:{' '}
                                        <span className="font-medium text-white">
                                            {formatCurrency(additionalCost)}
                                        </span>
                                    </span>
                                </div>
                            )}

                            {/* Dimensions */}
                            {additionalDimensionsCost > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-white/80 text-sm">
                                        هزینه ابعاد:{' '}
                                        <span className="font-medium text-white">
                                            {formatCurrency(additionalDimensionsCost)}
                                        </span>
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Private */}
                    {shippingMethod.isPrivate && (
                        <div className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full bg-purple-500/20 border border-purple-400/30">
                            <span className="text-purple-300 text-xs font-medium">
                                خصوصی
                            </span>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

// ✅ IMPORTANT: prevents useless re-renders
export const ShippingMethodCard = memo(ShippingMethodCardComponent);