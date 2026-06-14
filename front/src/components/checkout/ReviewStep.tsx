import React, { useEffect, useState, useRef, useCallback } from 'react';
import { UploadCloud } from 'lucide-react';

interface ReviewStepProps {
    cart: any;
    shippingCost: number;
    notes?: string;
    onChangeNotes?: (notes: string) => void;

    files?: File[];
    onChangeFiles?: (files: File[]) => void;
}

type FilePreview = {
    file: File;
    url: string;
};

export const ReviewStep: React.FC<ReviewStepProps> = ({
    cart,
    shippingCost,
    notes = '',
    onChangeNotes,
    files = [],
    onChangeFiles,
}) => {

    const [progress, setProgress] = useState(0);
    const [noteText, setNoteText] = useState(notes);
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState('');

    const [previews, setPreviews] = useState<FilePreview[]>([]);

    const fileRef = useRef<HTMLInputElement>(null);

    // ================= PREVIEW GENERATION =================
    useEffect(() => {
        previews.forEach(p => URL.revokeObjectURL(p.url));

        const newPreviews = files.map(file => ({
            file,
            url: URL.createObjectURL(file),
        }));

        setPreviews(newPreviews);

        return () => {
            newPreviews.forEach(p => URL.revokeObjectURL(p.url));
        };
    }, [files]);

    // Progress Animation
    useEffect(() => {
        let frame: number;
        const animate = () => {
            setProgress(p => (p >= 100 ? 100 : p + 1.5));
            frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, []);

    // Validation
    const validateFile = (file: File): boolean => {
        if (!file.type.startsWith('image/')) {
            setError('فقط فایل تصویری مجاز است');
            return false;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('حداکثر حجم ۵ مگابایت است');
            return false;
        }
        return true;
    };

    // File Handlers
    const handleFiles = (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;

        const validFiles = Array.from(fileList).filter(validateFile);
        if (validFiles.length === 0) return;

        setError('');
        onChangeFiles?.([...files, ...validFiles]);

        if (fileRef.current) fileRef.current.value = '';
    };

    const removeFile = (index: number) => {
        onChangeFiles?.(files.filter((_, i) => i !== index));
    };

    // Drag & Drop
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
    }, [files]);

    // Total Calculation
    const total = cart.items.reduce(
        (sum: number, item: any) => sum + (item.subtotal || 0),
        0
    );

    return (
        <div className="glass-card p-6 space-y-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-fuchsia-500/5 blur-3xl" />

            <div className="relative z-10 space-y-6">

                {/* HEADER */}
                <div>
                    <h2 className="text-white text-xl font-bold">بررسی نهایی سفارش</h2>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-3">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* ITEMS */}
                <div className="space-y-2">
                    <p className="text-white/70 text-sm">آیتم‌های سفارش</p>
                    {cart.items.map((item: any) => (
                        <div
                            key={item.id}
                            className="flex justify-between bg-white/5 border border-white/10 rounded-xl p-3"
                        >
                            <span className="text-white text-sm">{item.product.name}</span>
                            <span className="text-white/80 text-sm">
                                {item.subtotal.toLocaleString('fa-IR')}
                            </span>
                        </div>
                    ))}
                </div>

                {/* NOTES */}
                <div>
                    <p className="text-white/70 text-sm mb-2">توضیحات سفارش</p>
                    <textarea
                        value={noteText}
                        onChange={(e) => {
                            setNoteText(e.target.value);
                            onChangeNotes?.(e.target.value);
                        }}
                        className="w-full min-h-[120px] bg-white/5 border border-white/10 rounded-2xl p-3 text-white placeholder:text-white/40"
                        placeholder="توضیحات یا درخواست خاص خود را اینجا بنویسید..."
                    />
                </div>

                {/* UPLOAD SECTION */}
                <div>
                    <p className="text-white/70 text-sm mb-3">آپلود فایل</p>

                    <div
                        onClick={() => fileRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-3xl p-4 text-center cursor-pointer transition-all
                        ${isDragOver ? 'border-purple-400 bg-purple-500/10' : 'border-purple-400/30 hover:bg-white/5'}`}
                    >
                        <UploadCloud className="mx-auto w-10 h-10 text-purple-300" />
                        <p className="text-white mt-3">آپلود فایل (چندتایی)</p>
                        <p className="text-white/50 text-xs mt-1">فقط تصویر • حداکثر ۵ مگابایت</p>
                    </div>

                    <input
                        ref={fileRef}
                        type="file"
                        multiple
                        hidden
                        accept="image/*"
                        onChange={(e) => handleFiles(e.target.files)}
                    />

                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

                    {/* FILES GRID - Responsive */}
                    {files.length > 0 && (
                        <div className="mt-6">
                            <p className="text-white/60 text-sm mb-3">
                                فایل‌های انتخاب شده ({files.length})
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {files.map((file, index) => {
                                    const preview = previews[index];
                                    return (
                                        <div
                                            key={index}
                                            className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-400/50 transition-all"
                                        >
                                            {/* Thumbnail */}
                                            <div className="aspect-square w-full bg-black/30 relative">
                                                {preview?.url ? (
                                                    <img
                                                        src={preview.url}
                                                        alt={file.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">
                                                        🖼️
                                                    </div>
                                                )}
                                            </div>

                                            {/* File Info */}
                                            <div className="p-3">
                                                <p className="text-white text-xs truncate font-medium">
                                                    {file.name}
                                                </p>
                                                <p className="text-white/50 text-[10px] mt-0.5">
                                                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                                                </p>
                                            </div>

                                            {/* Remove Button */}
                                            <button
                                                onClick={() => removeFile(index)}
                                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                حذف
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};