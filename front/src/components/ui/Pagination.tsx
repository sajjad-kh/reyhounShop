import React from 'react';
import { GlassButton } from './GlassButton';
import { cn } from '../../utils';

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    showFirstLast?: boolean;
    showPrevNext?: boolean;
    maxVisiblePages?: number;
    className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    showFirstLast = true,
    showPrevNext = true,
    maxVisiblePages = 5,
    className
}) => {
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
        const pages: (number | string)[] = [];
        const halfVisible = Math.floor(maxVisiblePages / 2);

        let startPage = Math.max(1, currentPage - halfVisible);
        let endPage = Math.min(totalPages, currentPage + halfVisible);

        // Adjust if we're near the beginning or end
        if (currentPage <= halfVisible) {
            endPage = Math.min(totalPages, maxVisiblePages);
        }
        if (currentPage > totalPages - halfVisible) {
            startPage = Math.max(1, totalPages - maxVisiblePages + 1);
        }

        // Add first page and ellipsis if needed
        if (startPage > 1) {
            pages.push(1);
            if (startPage > 2) {
                pages.push('...');
            }
        }

        // Add visible pages
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        // Add ellipsis and last page if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push('...');
            }
            pages.push(totalPages);
        }

        return pages;
    };

    const visiblePages = getVisiblePages();

    return (
        <nav
            className={cn('flex items-center justify-center space-x-2', className)}
            aria-label="Pagination"
        >
            {/* First Page */}
            {showFirstLast && currentPage > 1 && (
                <GlassButton
                    variant="secondary"
                    size="sm"
                    onClick={() => onPageChange(1)}
                    aria-label="Go to first page"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                </GlassButton>
            )}

            {/* Previous Page */}
            {showPrevNext && currentPage > 1 && (
                <GlassButton
                    variant="secondary"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    aria-label="Go to previous page"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </GlassButton>
            )}

            {/* Page Numbers */}
            {visiblePages.map((page, index) => (
                <React.Fragment key={index}>
                    {page === '...' ? (
                        <span className="px-3 py-2 text-text-muted">...</span>
                    ) : (
                        <GlassButton
                            variant={currentPage === page ? 'accent' : 'secondary'}
                            size="sm"
                            onClick={() => onPageChange(page as number)}
                            className={cn(
                                'min-w-[2.5rem]',
                                currentPage === page && 'ring-2 ring-accent-primary ring-offset-2 ring-offset-transparent'
                            )}
                            aria-label={`Go to page ${page}`}
                            aria-current={currentPage === page ? 'page' : undefined}
                        >
                            {page}
                        </GlassButton>
                    )}
                </React.Fragment>
            ))}

            {/* Next Page */}
            {showPrevNext && currentPage < totalPages && (
                <GlassButton
                    variant="secondary"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    aria-label="Go to next page"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </GlassButton>
            )}

            {/* Last Page */}
            {showFirstLast && currentPage < totalPages && (
                <GlassButton
                    variant="secondary"
                    size="sm"
                    onClick={() => onPageChange(totalPages)}
                    aria-label="Go to last page"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                </GlassButton>
            )}
        </nav>
    );
};