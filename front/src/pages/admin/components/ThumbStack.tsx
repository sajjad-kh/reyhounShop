// components/ThumbStack.tsx
import React from 'react';
import { Package } from 'lucide-react';
import type { UnifiedAdminOrderRow } from '../types';

export function ThumbStack({
    thumbs,
    overflow,
}: {
    thumbs: UnifiedAdminOrderRow['productThumbs'];
    overflow: number;
}) {
    return (
        <div className="flex items-center justify-center -space-x-4 space-x-reverse">
            {thumbs.length === 0 ? (
                <div className="w-10 h-10 sm:w-10 sm:h-10 bg-glass-light rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-text-muted" />
                </div>
            ) : (
                thumbs.map((item, idx) => {
                    const validSrc = !!item.src && !item.src.includes('placeholder');
                    return (
                        <div key={`${idx}-${item.alt}`} className="relative group" style={{ zIndex: thumbs.length - idx }}>
                            {validSrc ? (
                                <div className="relative">
                                    <img
                                        src={item.src}
                                        alt={item.alt}
                                        className="w-10 h-10 sm:w-10 sm:h-10 object-cover rounded-lg border-2 border-white transition-all md:group-hover:scale-150 md:group-hover:relative md:group-hover:z-50"
                                        title={item.alt}
                                    />
                                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center pointer-events-none">
                                        <span className="text-white text-xs sm:text-sm font-bold">{item.quantity}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-10 h-10 bg-glass-light rounded-lg flex items-center justify-center border-2 border-white">
                                    <Package className="w-5 h-5 text-text-muted" />
                                </div>
                            )}
                        </div>
                    );
                })
            )}
            {overflow > 0 && (
                <div className="w-10 h-10 bg-glass-medium rounded-lg flex items-center justify-center border-2 border-white text-text-primary text-xs font-bold">
                    +{overflow}
                </div>
            )}
        </div>
    );
}