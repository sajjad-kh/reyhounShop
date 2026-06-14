import React, { useState } from 'react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { GlassInput } from './GlassInput';
import { Category, ProductFilters } from '../../types/product';
import { cn } from '../../utils';

export interface FilterSidebarProps {
    categories: Category[];
    filters: ProductFilters;
    onFiltersChange: (filters: ProductFilters) => void;
    onClearFilters: () => void;
    isOpen: boolean;
    onToggle: () => void;
    className?: string;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
    categories,
    filters,
    onFiltersChange,
    onClearFilters,
    isOpen,
    onToggle,
    className
}) => {
    const [priceRange, setPriceRange] = useState({
        min: filters.minPrice?.toString() || '',
        max: filters.maxPrice?.toString() || ''
    });



    const handlePriceChange = (field: 'min' | 'max', value: string) => {
        setPriceRange(prev => ({ ...prev, [field]: value }));

        const numValue = value ? parseFloat(value) : undefined;
        onFiltersChange({
            ...filters,
            [field === 'min' ? 'minPrice' : 'maxPrice']: numValue
        });
    };

    const handleRatingChange = (rating: number) => {
        onFiltersChange({
            ...filters,
            minRating: filters.minRating === rating ? undefined : rating
        });
    };

    const hasActiveFilters = !!(
        (filters.categories?.length ?? 0) > 0 ||
        filters.minPrice ||
        filters.maxPrice ||
        filters.minRating ||
        filters.inStock !== undefined ||
        filters.onSale !== undefined
    );

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar */}
            <div
                className={cn(
                    'fixed lg:sticky top-0 left-0 h-screen lg:h-auto w-80 lg:w-full',
                    'transform transition-transform duration-300 ease-out z-50 lg:z-auto',
                    'lg:transform-none',
                    isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                    className
                )}
            >
                <GlassCard className="h-full lg:h-auto overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-text-primary">Filters</h2>
                        <div className="flex items-center space-x-2">
                            {hasActiveFilters && (
                                <GlassButton
                                    variant="secondary"
                                    size="sm"
                                    onClick={onClearFilters}
                                >
                                    Clear All
                                </GlassButton>
                            )}
                            <button
                                onClick={onToggle}
                                className="lg:hidden glass-card bg-glass-medium hover:bg-glass-heavy p-2 rounded-lg transition-colors"
                                aria-label="Close filters"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Price Range */}
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-text-primary mb-3">Price Range</h3>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <GlassInput
                                type="number"
                                placeholder="Min"
                                value={priceRange.min}
                                onChange={(e) => handlePriceChange('min', e.target.value)}
                                size="sm"
                            />
                            <GlassInput
                                type="number"
                                placeholder="Max"
                                value={priceRange.max}
                                onChange={(e) => handlePriceChange('max', e.target.value)}
                                size="sm"
                            />
                        </div>

                        {/* Quick Price Ranges */}
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'Under $50', min: 0, max: 50 },
                                { label: '$50 - $100', min: 50, max: 100 },
                                { label: '$100 - $200', min: 100, max: 200 },
                                { label: 'Over $200', min: 200, max: undefined }
                            ].map((range, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setPriceRange({
                                            min: range.min.toString(),
                                            max: range.max?.toString() || ''
                                        });
                                        onFiltersChange({
                                            ...filters,
                                            minPrice: range.min,
                                            maxPrice: range.max
                                        });
                                    }}
                                    className={cn(
                                        'px-3 py-2 text-xs rounded-lg border transition-colors',
                                        'border-border-glass-light bg-glass-light hover:bg-glass-medium',
                                        'text-text-secondary hover:text-text-primary',
                                        filters.minPrice === range.min && filters.maxPrice === range.max &&
                                        'bg-accent-primary/20 border-accent-primary text-accent-primary'
                                    )}
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rating */}
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-text-primary mb-3">Minimum Rating</h3>
                        <div className="space-y-2">
                            {[4, 3, 2, 1].map(rating => (
                                <label
                                    key={rating}
                                    className="flex items-center space-x-3 cursor-pointer group"
                                >
                                    <input
                                        type="radio"
                                        name="rating"
                                        checked={filters.minRating === rating}
                                        onChange={() => handleRatingChange(rating)}
                                        className="w-4 h-4 border-border-glass-light bg-glass-light text-accent-primary focus:ring-accent-primary focus:ring-offset-0"
                                    />
                                    <div className="flex items-center space-x-1">
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <svg
                                                    key={i}
                                                    className={cn(
                                                        'w-4 h-4',
                                                        i < rating
                                                            ? 'text-yellow-400 fill-current'
                                                            : 'text-text-muted'
                                                    )}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                                    />
                                                </svg>
                                            ))}
                                        </div>
                                        <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                                            & up
                                        </span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </GlassCard>
            </div>
        </>
    );
};