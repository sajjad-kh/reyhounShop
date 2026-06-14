import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassInput } from './GlassInput';
import { SearchSuggestions } from './SearchSuggestions';
import { Product } from '../../types/product';
import { cn } from '../../utils';

export interface SearchBarProps {
    placeholder?: string;
    initialValue?: string;
    onSearch?: (query: string) => void;
    showSuggestions?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    placeholder = 'Search products...',
    initialValue = '',
    onSearch,
    showSuggestions = true,
    size = 'md',
    className
}) => {
    const [query, setQuery] = useState(initialValue);
    const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);

        if (showSuggestions && value.trim().length >= 2) {
            setShowSuggestionsDropdown(true);
        } else {
            setShowSuggestionsDropdown(false);
        }
    };

    const handleInputFocus = () => {
        setIsFocused(true);
        if (showSuggestions && query.trim().length >= 2) {
            setShowSuggestionsDropdown(true);
        }
    };

    const handleInputBlur = () => {
        setIsFocused(false);
        // Delay hiding suggestions to allow for clicks
        setTimeout(() => {
            if (!isFocused) {
                setShowSuggestionsDropdown(false);
            }
        }, 200);
    };

    const handleSearch = (searchQuery?: string) => {
        const finalQuery = searchQuery || query;
        if (!finalQuery.trim()) return;

        setShowSuggestionsDropdown(false);

        if (onSearch) {
            onSearch(finalQuery);
        } else {
            navigate(`/search?search=${encodeURIComponent(finalQuery)}`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    };

    const handleProductSelect = (product: Product) => {
        setShowSuggestionsDropdown(false);
        navigate(`/products/${product.id}`);
    };

    const handleSuggestionsClose = () => {
        setShowSuggestionsDropdown(false);
        inputRef.current?.blur();
    };

    return (
        <div className={cn('relative z-50', className)}>
            <GlassInput
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
                size={size}
                icon={
                    <button
                        onClick={() => handleSearch()}
                        className="text-text-muted hover:text-text-primary transition-colors"
                        type="button"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                }
                iconPosition="right"
                className="pr-12"
            />

            {/* Search Suggestions */}
            {showSuggestions && (
                <SearchSuggestions
                    query={query}
                    isOpen={showSuggestionsDropdown}
                    onClose={handleSuggestionsClose}
                    onSelect={handleProductSelect}
                />
            )}
        </div>
    );
};