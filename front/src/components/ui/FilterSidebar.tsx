import React, { useState } from 'react';
import { GlassCard } from './GlassCard';
import { Category, ProductFilters } from '../../types/product';
import { cn } from '../../utils';

export interface FilterSidebarProps {
    categories: Category[];
    filters: ProductFilters;
    onFiltersChange: (filters: ProductFilters) => void;
    onClearFilters: () => void;
    className?: string;
}

const QUICK_PRICE_RANGES = [
    { label: 'زیر ۱ میلیون', min: 0, max: 1000000 },
    { label: '۱ تا ۳ میلیون', min: 1000000, max: 3000000 },
    { label: '۳ تا ۵ میلیون', min: 3000000, max: 5000000 },
    { label: 'بالای ۵ میلیون', min: 5000000, max: undefined },
];

const RATINGS = [4, 3, 2, 1];

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
    categories,
    filters,
    onFiltersChange,
    onClearFilters,
    className
}) => {
    const [priceRange, setPriceRange] = useState({
        min: filters.minPrice?.toString() || '',
        max: filters.maxPrice?.toString() || ''
    });

    const selectedCategory = filters.categories?.[0];

    const handleCategoryToggle = (categoryId: number) => {
        const next = selectedCategory === categoryId ? undefined : [categoryId];
        onFiltersChange({
            ...filters,
            categories: next
        });
    };

    const handlePriceChange = (field: 'min' | 'max', value: string) => {
        setPriceRange(prev => ({ ...prev, [field]: value }));

        const numValue = value ? parseFloat(value) : undefined;
        onFiltersChange({
            ...filters,
            [field === 'min' ? 'minPrice' : 'maxPrice']: numValue
        });
    };

    const handleQuickRange = (range: typeof QUICK_PRICE_RANGES[number]) => {
        setPriceRange({
            min: range.min.toString(),
            max: range.max?.toString() || ''
        });
        onFiltersChange({
            ...filters,
            minPrice: range.min,
            maxPrice: range.max
        });
    };

    const handleRatingChange = (rating: number) => {
        onFiltersChange({
            ...filters,
            minRating: filters.minRating === rating ? undefined : rating
        });
    };

    const handleToggle = (field: 'inStock' | 'onSale') => {
        onFiltersChange({
            ...filters,
            [field]: filters[field] ? undefined : true
        });
    };

    const activeCount = (
        (filters.categories?.length ? 1 : 0) +
        (filters.minPrice ? 1 : 0) +
        (filters.maxPrice ? 1 : 0) +
        (filters.minRating ? 1 : 0) +
        (filters.inStock ? 1 : 0) +
        (filters.onSale ? 1 : 0)
    );

    const isQuickRangeActive = (range: typeof QUICK_PRICE_RANGES[number]) =>
        filters.minPrice === range.min && filters.maxPrice === range.max;

    return (
        <GlassCard className={cn('overflow-y-auto', className)}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-white">فیلترها</h2>
                    {activeCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-accent-primary/15 text-accent-primary text-[10px] font-semibold">
                            {activeCount}
                        </span>
                    )}
                </div>
                {activeCount > 0 && (
                    <button
                        onClick={onClearFilters}
                        className="text-[11px] text-white/40 hover:text-white transition-colors"
                    >
                        پاک کردن همه
                    </button>
                )}
            </div>

            {/* Categories */}
            <Section title="دسته‌بندی">
                <div className="space-y-1 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                    {categories.length === 0 ? (
                        <p className="text-xs text-white/30">دسته‌ای یافت نشد</p>
                    ) : (
                        categories.map(category => {
                            const active = selectedCategory === category.id;
return (
                                            <button
                                                key={category.id}
                                                onClick={() => handleCategoryToggle(category.id)}
                                                className={cn(
                                                    'w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] sm:text-xs transition-all',
                                                    active
                                                        ? 'bg-accent-primary/15 text-accent-primary font-medium'
                                                        : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                                                )}
                                            >
                                                <span className="truncate">{category.name}</span>
                                                {active && (
                                                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </button>
                                        );
                        })
                    )}
                </div>
            </Section>

            {/* Price Range */}
            <Section title="محدوده قیمت (ریال)">
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <PriceInput
                        placeholder="از"
                        value={priceRange.min}
                        onChange={(v) => handlePriceChange('min', v)}
                    />
                    <PriceInput
                        placeholder="تا"
                        value={priceRange.max}
                        onChange={(v) => handlePriceChange('max', v)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {QUICK_PRICE_RANGES.map((range, index) => (
                        <button
                            key={index}
                            onClick={() => handleQuickRange(range)}
                            className={cn(
                                'px-3 py-2 text-[11px] sm:text-xs rounded-lg border transition-all',
                                isQuickRangeActive(range)
                                    ? 'bg-accent-primary/20 border-accent-primary text-accent-primary font-medium'
                                    : 'border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20'
                            )}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </Section>

            {/* Rating */}
            <Section title="حداقل امتیاز">
                <div className="space-y-1.5">
                    {RATINGS.map(rating => {
                        const active = filters.minRating === rating;
                        return (
                            <button
                                key={rating}
                                onClick={() => handleRatingChange(rating)}
                                className={cn(
                                    'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all',
                                    active
                                        ? 'bg-white/[0.06] ring-1 ring-accent-primary/40'
                                        : 'hover:bg-white/[0.04]'
                                )}
                            >
                                <div className="flex items-center gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <svg
                                            key={i}
                                            className={cn(
                                                'w-3.5 h-3.5',
                                                i < rating
                                                    ? 'text-amber-400 fill-current'
                                                    : 'text-white/15'
                                            )}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976-2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                            />
                                        </svg>
                                    ))}
                                </div>
                                <span className={cn(
                                    'text-[11px] sm:text-xs',
                                    active ? 'text-accent-primary' : 'text-white/40'
                                )}>
                                    {rating} ستاره به بالا
                                </span>
                            </button>
                        );
                    })}
                </div>
            </Section>

            {/* Availability */}
            <Section title="وضعیت محصول" last>
                <div className="space-y-2">
                    <TogglePill
                        label="فقط کالاهای موجود"
                        active={!!filters.inStock}
                        onClick={() => handleToggle('inStock')}
                    />
                    <TogglePill
                        label="فقط کالاهای تخفیف‌دار"
                        active={!!filters.onSale}
                        onClick={() => handleToggle('onSale')}
                    />
                </div>
            </Section>
        </GlassCard>
    );
};

const Section: React.FC<{ title: string; last?: boolean; children: React.ReactNode }> = ({
    title,
    last,
    children
}) => (
    <div className={cn('mb-6', last && 'mb-1')}>
        <h3 className="text-[11px] sm:text-xs font-semibold text-white/40 mb-3 uppercase tracking-wide">
            {title}
        </h3>
        {children}
    </div>
);

const PriceInput: React.FC<{
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
}> = ({ placeholder, value, onChange }) => (
    <div className="relative">
        <input
            type="number"
            inputMode="numeric"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white text-xs sm:text-sm placeholder:text-white/25 focus:outline-none focus:border-accent-primary/40 focus:bg-white/[0.05] transition-all"
        />
    </div>
);

const TogglePill: React.FC<{
    label: string;
    active: boolean;
    onClick: () => void;
}> = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={cn(
            'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs sm:text-sm transition-all',
            active
                ? 'bg-accent-primary/15 border-accent-primary/50 text-accent-primary font-medium'
                : 'border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20'
        )}
    >
        <span>{label}</span>
        <span className={cn(
            'w-4 h-4 rounded-full border flex items-center justify-center transition-all',
            active ? 'bg-accent-primary border-accent-primary' : 'border-white/25'
        )}>
            {active && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            )}
        </span>
    </button>
);