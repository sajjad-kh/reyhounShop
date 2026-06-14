// components/OrderDetailModal.tsx
import React, { useState } from 'react';
import { X, Clock, User, Truck, Image as ImageIcon } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { UnifiedAdminOrderRow } from '../types';

type Props = {
    row: UnifiedAdminOrderRow;
    onClose: () => void;
};

export default function OrderDetailModal({ row, onClose }: Props) {
    const [newImage, setNewImage] = useState<File | null>(null);
    const [adminNote, setAdminNote] = useState('');

    // اینجا بعداً از API واقعی فعالیت‌ها رو می‌گیری
    const activities = [
        { time: '۲ ساعت پیش', text: 'سفارش ثبت شد', icon: Clock },
        { time: '۱ ساعت پیش', text: 'مشتری رسید پرداخت آپلود کرد', icon: User },
        { time: '۴۵ دقیقه پیش', text: 'ادمین عکس نمونه ارسال کرد', icon: ImageIcon },
    ];

    return (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl" onClick={onClose}>
            <GlassCard 
                className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto" 
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute left-4 top-4 p-2 rounded-lg hover:bg-white/10">
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-bold mb-1">مدیریت سفارش</h2>
                <p className="text-text-secondary mb-6">شماره سفارش: <span className="font-mono">{row.displayId}</span></p>



                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Activity Log */}
                    <div className="lg:col-span-1">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5" /> فعالیت‌ها
                        </h3>
                        <div className="space-y-4 border-r border-border-glass-light pr-4">
                            {activities.map((act, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className="w-2 h-2 mt-2 bg-accent-primary rounded-full" />
                                    <div>
                                        <p className="text-sm">{act.text}</p>
                                        <p className="text-xs text-text-muted">{act.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Columns - Details & Actions */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Customer Info */}
                        <div>
                            <h3 className="font-semibold mb-2">اطلاعات مشتری</h3>
                            <p><strong>نام:</strong> {row.customerName}</p>
                            <p className="text-sm text-text-muted mt-1">{row.detailLine}</p>
                        </div>

                        {/* User Note */}
                        <div>
                            <h3 className="font-semibold mb-2">توضیحات کاربر</h3>
                            <div className="bg-glass-light p-4 rounded-xl text-sm">
                                توضیحات مشتری اینجا نمایش داده می‌شود...
                            </div>
                        </div>

                        {/* Images Section */}
                        <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <ImageIcon className="w-5 h-5" /> عکس‌های ارسالی
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {/* عکس‌های قبلی */}
                                <div className="aspect-square bg-glass-light rounded-xl flex items-center justify-center border border-dashed">
                                    عکس مشتری
                                </div>
                                <div className="aspect-square bg-glass-light rounded-xl flex items-center justify-center border border-dashed">
                                    عکس قبلی ادمین
                                </div>
                            </div>
                        </div>

                        {/* Admin Upload */}
                        <div>
                            <h3 className="font-semibold mb-2">ارسال طرح جدید توسط ادمین</h3>
                            <div className="border-2 border-dashed border-border-glass-light rounded-2xl p-6 text-center">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => e.target.files && setNewImage(e.target.files[0])}
                                    className="hidden"
                                    id="admin-upload"
                                />
                                <label htmlFor="admin-upload" className="cursor-pointer flex flex-col items-center">
                                    <ImageIcon className="w-10 h-10 mb-2 text-text-muted" />
                                    <p>کلیک کنید یا عکس را بکشید</p>
                                </label>
                            </div>

                            {newImage && (
                                <p className="text-sm text-green-500 mt-2">فایل انتخاب شد: {newImage.name}</p>
                            )}
                        </div>

                        {/* Admin Note */}
                        <div>
                            <h3 className="font-semibold mb-2">یادداشت ادمین</h3>
                            <textarea
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                placeholder="یادداشت خود را برای مشتری بنویسید..."
                                className="w-full h-24 px-4 py-3 rounded-xl bg-glass-light border border-border-glass-light focus:ring-2 focus:ring-accent-primary"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button className="flex-1 py-3 bg-green-500/20 text-green-500 rounded-xl font-medium hover:bg-green-500/30">
                                تأیید و اطلاع‌رسانی به مشتری
                            </button>
                            <button className="flex-1 py-3 bg-red-500/20 text-red-500 rounded-xl font-medium hover:bg-red-500/30">
                                رد و درخواست اصلاح
                            </button>
                        </div>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}