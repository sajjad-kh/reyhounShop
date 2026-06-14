import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { GlassCard } from './GlassCard';
import { productService } from '../../services/productService';
import { Product } from '../../types/product';
import { cn } from '../../utils';
import { getImageUrl } from '../../utils/constants';

// Default popular search terms (fallback)
const DEFAULT_POPULAR_SEARCHES = [
    'iPhone',
    'Laptop',
    'Headphones',
    'Gaming',
    'Smartphone',
    'Tablet',
    'Camera',
    'Watch'
];

// Local storage key for search history
const SEARCH_HISTORY_KEY = 'search_history';

export interface SearchSuggestionsProps {
    query: string;
    isOpen: boolean;
    onClose: () => void;
    onSelect: (product: Product) => void;
    className?: string;
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
    query,
    isOpen,
    onClose,
    onSelect,
    className
}) => {
    const [suggestions, setSuggestions] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [popularSearches, setPopularSearches] = useState<string[]>(DEFAULT_POPULAR_SEARCHES);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load search history and popular searches
    useEffect(() => {
        try {
            const history = localStorage.getItem(SEARCH_HISTORY_KEY);
            if (history) {
                setSearchHistory(JSON.parse(history));
            }
        } catch (error) {
            console.error('Failed to load search history:', error);
        }

        // Load popular searches from API
        const loadPopularSearches = async () => {
            try {
                const popular = await productService.getPopularSearches(8);
                if (popular.length > 0) {
                    setPopularSearches(popular);
                }
            } catch (error) {
                console.error('Failed to load popular searches:', error);
            }
        };

        loadPopularSearches();
    }, []);

    // Save search to history
    const saveToHistory = (searchTerm: string) => {
        try {
            const trimmedTerm = searchTerm.trim();
            if (!trimmedTerm) return;

            const updatedHistory = [
                trimmedTerm,
                ...searchHistory.filter(term => term !== trimmedTerm)
            ].slice(0, 5); // Keep only last 5 searches

            setSearchHistory(updatedHistory);
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
        } catch (error) {
            console.error('Failed to save search history:', error);
        }
    };

    // Clear search history
    const clearHistory = () => {
        setSearchHistory([]);
        localStorage.removeItem(SEARCH_HISTORY_KEY);
    };

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!query.trim() || query.length < 2) {
                setSuggestions([]);
                return;
            }

            try {
                setLoading(true);
                // Use the main search API with a small limit for suggestions
                const response = await productService.getProducts({
                    search: query,
                    limit: 8,
                    page: 1
                });
                setSuggestions(response.products);
                setSelectedIndex(-1);
            } catch (error) {
                console.error('Search suggestions failed:', error);
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        };

        const debounceTimer = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(debounceTimer);
    }, [query]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev =>
                        prev < (suggestions?.length || 0) - 1 ? prev + 1 : prev
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => prev > -1 ? prev - 1 : prev);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0 && suggestions && suggestions[selectedIndex]) {
                        onSelect(suggestions[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    onClose();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, suggestions, onSelect, onClose]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    // Show suggestions, history, or popular searches based on query
    const showProductSuggestions = query.length >= 2;
    const showHistory = !showProductSuggestions && searchHistory.length > 0;
    const showPopular = !showProductSuggestions && !showHistory;

    // Handle search term selection
    const handleSearchTermSelect = (searchTerm: string) => {
        saveToHistory(searchTerm);
        onClose();
        // Navigate to search results
        window.location.href = `/search?search=${encodeURIComponent(searchTerm)}`;
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                'search-suggestions-container absolute top-full left-0 right-0 z-[9999] mt-2 min-h-0',
                className
            )}
        >
            <GlassCard className="max-h-96 overflow-y-auto shadow-2xl border border-white/10 bg-glass-medium/90">
                {showProductSuggestions ? (
                    // Product Suggestions
                    loading ? (
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
                                    <div className="w-12 h-12 bg-glass-medium rounded-lg"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-glass-medium rounded w-3/4"></div>
                                        <div className="h-3 bg-glass-medium rounded w-1/2"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : !suggestions || suggestions.length === 0 ? (
                        <div className="p-4 text-center text-text-muted">
                            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p>No products found for "{query}"</p>
                            <button
                                onClick={() => handleSearchTermSelect(query)}
                                className="mt-2 text-accent-primary hover:text-accent-primary/80 text-sm font-medium"
                            >
                                Search anyway
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {suggestions?.map((product, index) => {
                                const primaryImage = product.images?.find(img => img.isMain) || product.images?.[0];
                                const isSelected = index === selectedIndex;

                                return (
                                    <Link
                                        key={product.id}
                                        to={`/products/${product.id}`}
                                        onClick={() => {
                                            saveToHistory(query);
                                            onSelect(product);
                                        }}
                                        className={cn(
                                            'flex items-center space-x-3 p-3 rounded-lg transition-colors',
                                            'hover:bg-glass-light focus:bg-glass-light focus:outline-none',
                                            isSelected && 'bg-glass-light'
                                        )}
                                    >
                                        {/* Product Image */}
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-glass-light flex-shrink-0">
                                            {primaryImage ? (
                                                <img
                                                    src={getImageUrl(primaryImage.url)}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-text-muted">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>

                                        {/* Product Info */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-text-primary truncate">
                                                {product.name}
                                            </h4>
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-text-muted">
                                                    {product.category.name}
                                                </p>
                                                <span className="font-semibold text-text-primary">
                                                    {product.effectivePrice.toLocaleString('fa-IR')} ریال
                                                </span>
                                            </div>
                                        </div>

                                        {/* Arrow Icon */}
                                        <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                );
                            })}

                            {/* View All Results */}
                            <button
                                onClick={() => handleSearchTermSelect(query)}
                                className="w-full flex items-center justify-center space-x-2 p-3 border-t border-border-glass-light text-accent-primary hover:text-accent-primary/80 transition-colors"
                            >
                                <span className="font-medium">View all results for "{query}"</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    )
                ) : showHistory ? (
                    // Search History
                    <div>
                        <div className="flex items-center justify-between p-3 border-b border-border-glass-light">
                            <h4 className="text-sm font-medium text-text-primary">Recent Searches</h4>
                            <button
                                onClick={clearHistory}
                                className="text-xs text-text-muted hover:text-text-primary transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                        <div className="space-y-1">
                            {searchHistory.map((term, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSearchTermSelect(term)}
                                    className="w-full flex items-center space-x-3 p-3 text-left hover:bg-glass-light transition-colors rounded-lg"
                                >
                                    <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-text-secondary">{term}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : showPopular ? (
                    // Popular Searches
                    <div>
                        <div className="p-3 border-b border-border-glass-light">
                            <h4 className="text-sm font-medium text-text-primary">Popular Searches</h4>
                        </div>
                        <div className="space-y-1">
                            {popularSearches.map((term, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSearchTermSelect(term)}
                                    className="w-full flex items-center space-x-3 p-3 text-left hover:bg-glass-light transition-colors rounded-lg"
                                >
                                    <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                    <span className="text-text-secondary">{term}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}
            </GlassCard>
        </div>
    );
};