import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils';

export interface GlassPaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    maxVisiblePages?: number;
    className?: string;
    showInfo?: boolean;
    dir?: 'rtl' | 'ltr';
}

export const GlassPagination: React.FC<GlassPaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    maxVisiblePages = 5,
    className,
    showInfo = true,
    dir = 'rtl',
}) => {
    if (totalPages <= 1) return null;

    const getVisiblePages = (): number[] => {
        const pages: number[] = [];
        const half = Math.floor(maxVisiblePages / 2);

        let start = Math.max(1, currentPage - half);
        let end = Math.min(totalPages, currentPage + half);

        if (currentPage <= half) {
            end = Math.min(totalPages, maxVisiblePages);
        }
        if (currentPage > totalPages - half) {
            start = Math.max(1, totalPages - maxVisiblePages + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    const visiblePages = getVisiblePages();
    const isRtl = dir === 'rtl';
    const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
    const NextIcon = isRtl ? ChevronLeft : ChevronRight;

    return (
        <div dir={dir} className={cn('flex items-center justify-between', className)}>
            {showInfo && (
                <p className="text-xs text-text-muted">
                    صفحه {currentPage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
                </p>
            )}

            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-border-glass-light text-text-secondary hover:text-text-primary hover:border-white/30 disabled:opacity-30 transition"
                >
                    <PrevIcon className="w-4 h-4" />
                </button>

                <div className="flex gap-1">
                    {visiblePages.map((pageNum) => (
                        <button
                            key={pageNum}
                            onClick={() => onPageChange(pageNum)}
                            className={cn(
                                'w-8 h-8 rounded-lg text-xs transition',
                                pageNum === currentPage
                                    ? 'bg-white/20 text-text-primary border border-white/30'
                                    : 'border border-border-glass-light text-text-secondary hover:text-text-primary hover:border-white/30'
                            )}
                        >
                            {pageNum.toLocaleString('fa-IR')}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-border-glass-light text-text-secondary hover:text-text-primary hover:border-white/30 disabled:opacity-30 transition"
                >
                    <NextIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default GlassPagination;
