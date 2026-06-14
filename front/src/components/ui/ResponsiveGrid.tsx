import { HTMLAttributes } from 'react';
import { cn } from '../../utils';

export interface ResponsiveGridProps extends HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    cols?: {
        xs?: number;
        sm?: number;
        md?: number;
        lg?: number;
        xl?: number;
        '2xl'?: number;
    };
    gap?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
};

export const ResponsiveGrid = ({
    children,
    cols = { xs: 1, sm: 2, md: 3, lg: 4 },
    gap = 'md',
    className,
    ...props
}: ResponsiveGridProps) => {
    const gridColsClasses = [
        cols.xs && `grid-cols-${cols.xs}`,
        cols.sm && `sm:grid-cols-${cols.sm}`,
        cols.md && `md:grid-cols-${cols.md}`,
        cols.lg && `lg:grid-cols-${cols.lg}`,
        cols.xl && `xl:grid-cols-${cols.xl}`,
        cols['2xl'] && `2xl:grid-cols-${cols['2xl']}`,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={cn(
                'grid',
                gridColsClasses,
                gapClasses[gap],
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
