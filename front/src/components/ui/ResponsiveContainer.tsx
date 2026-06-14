import { HTMLAttributes } from 'react';
import { cn } from '../../utils';

export interface ResponsiveContainerProps extends HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    padding?: boolean;
    className?: string;
}

const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
};

export const ResponsiveContainer = ({
    children,
    maxWidth = 'xl',
    padding = true,
    className,
    ...props
}: ResponsiveContainerProps) => {
    return (
        <div
            className={cn(
                'mx-auto w-full',
                maxWidthClasses[maxWidth],
                padding && 'px-4 sm:px-6 lg:px-8',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
