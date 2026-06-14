import React, { useState, useRef, useEffect } from 'react';
import {
    CreditCard,
    UploadCloud,
    Trash2,
    ShieldCheck,
    Copy,
    CheckCircle2,
    Building2,
    User2,
    QrCode,
} from 'lucide-react';

import { QRCodeCanvas } from 'qrcode.react';
import { api } from '../../utils/api';

interface PaymentProofProps {
    paymentProof: File | null;
    onChange: (file: File | null) => void;
}

interface BankAccount {
    id: number;
    bankName: string;
    cardNumber: string;
    holderName: string;
    sheba: string;
    isActive: boolean;
    priority: number;
}

export const PaymentUpload: React.FC<PaymentProofProps> = ({
    paymentProof,
    onChange,
}) => {

    const [preview, setPreview] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [copied, setCopied] = useState<string | null>(null);
    const [activeQR, setActiveQR] = useState<BankAccount | null>(null);

    const fileRef = useRef<HTMLInputElement>(null);

    // ================= FETCH =================
    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const res = await api.get('/bank-accounts');
                setAccounts(res?.data || []);
            } catch (err) {
                console.error(err);
            }
        };

        fetchAccounts();
    }, []);

    const sortedAccounts = [...accounts].sort((a, b) => a.priority - b.priority);
    const primaryAccount = sortedAccounts[0];

    // ================= COPY + AUTOFILL =================
    const copyAutoFill = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);

            // autofill event (for future mobile integration)
            window.dispatchEvent(
                new CustomEvent('autofill-card', { detail: text })
            );

            setCopied(key);

            setTimeout(() => setCopied(null), 1500);

        } catch (err) {
            console.error(err);
        }
    };

    // ================= FILE =================
    const handleFile = (file: File | null) => {
        if (!file) return;

        if (!file.type.startsWith('image/')) return;

        if (file.size > 5 * 1024 * 1024) return;

        onChange(file);
        setPreview(URL.createObjectURL(file));
    };

    return (
        <div className="space-y-6">

            {/* ================= HEADER ================= */}
            <div className="rounded-3xl">

                <div className="flex items-center gap-3">

                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                        <ShieldCheck className="text-purple-300 w-6 h-6" />
                    </div>

                    <div>
                        <h2 className="text-white text-xl font-bold">
                            پرداخت کارت به کارت
                        </h2>
                        <p className="text-white/50 text-sm mt-1">
                            QR را اسکن کنید یا کارت را کپی کنید
                        </p>
                    </div>

                </div>

            </div>

            {/* ================= BANK ACCOUNTS ================= */}
            <div className="space-y-4">

                {sortedAccounts.map((acc, i) => {

                    const isPrimary = primaryAccount?.id === acc.id;

                    return (
                        <div
                            key={acc.id}
                            style={{
                                animation: `fadeUp .4s ease ${(i * 0.08)}s both`
                            }}
                            className={`
                                relative overflow-hidden rounded-3xl border p-5
                                transition-all duration-300 hover:scale-[1.01]
                                ${isPrimary
                                    ? 'border-purple-500/40 bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10'
                                    : 'border-white/10 bg-white/[0.03]'
                                }
                            `}
                        >

                            {/* glow */}
                            {isPrimary && (
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 blur-3xl rounded-full" />
                            )}

                            <div className="relative z-10">

                                {/* TOP */}
                                <div className="flex items-center justify-between">

                                    <div className="flex items-center gap-3">

                                        <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
                                            <Building2 className="w-5 h-5 text-white" />
                                        </div>

                                        <div>
                                            <h3 className="text-white font-bold">
                                                {acc.bankName}
                                            </h3>
                                            <p className="text-white/40 text-xs">
                                                حساب بانکی
                                            </p>
                                        </div>

                                    </div>

                                    {isPrimary && (
                                        <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-200">
                                            پیشنهاد
                                        </span>
                                    )}

                                </div>
                                {/* CARD */}
                                <div className="mt-4 bg-black/20 border border-white/10 rounded-2xl p-4">

                                    <div className="flex justify-between items-center">

                                        <div>

                                            <p className="text-white/40 text-xs mb-2">
                                                کارت
                                            </p>

                                            <p className="text-white tracking-[2px] font-bold">
                                                {acc.cardNumber}
                                            </p>

                                            {/* SHEBA زیر کارت (کوچک و حرفه‌ای) */}
                                            <p className="text-white/30 text-[11px] mt-2 break-all">
                                                IR {acc.sheba}
                                            </p>

                                        </div>

                                        <div className="flex gap-2">

                                            {/* COPY */}
                                            <button
                                                onClick={() =>
                                                    copyAutoFill(acc.cardNumber, `c-${acc.id}`)
                                                }
                                                className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"
                                            >
                                                {copied === `c-${acc.id}`
                                                    ? <CheckCircle2 className="text-green-400 w-4 h-4" />
                                                    : <Copy className="w-4 h-4 text-white" />
                                                }
                                            </button>

                                            {/* QR */}
                                            <button
                                                onClick={() => setActiveQR(acc)}
                                                className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center"
                                            >
                                                <QrCode className="w-4 h-4 text-purple-300" />
                                            </button>

                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    );
                })}

            </div>

            {/* ================= QR MODAL ================= */}
            {activeQR && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">

                    <div className="bg-[#14101f] p-6 rounded-3xl border border-white/10 w-[320px] animate-[fadeUp_.25s_ease]">

                        <h3 className="text-white text-center mb-4 font-bold">
                            اسکن برای پرداخت
                        </h3>

                        {/* QR */}
                        <div className="bg-white p-3 rounded-2xl flex justify-center">
                            <QRCodeCanvas
                                value={activeQR.cardNumber}
                                size={180}
                            />
                        </div>

                        {/* ACTION */}
                        <button
                            onClick={() => {
                                copyAutoFill(activeQR.cardNumber, 'qr');
                                setActiveQR(null);
                            }}
                            className="mt-4 w-full bg-purple-500/20 text-purple-200 py-2 rounded-xl hover:bg-purple-500/30 transition"
                        >
                            کپی شماره کارت
                        </button>

                    </div>

                </div>
            )}

            {/* ================= UPLOAD ================= */}
            <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-purple-400/30 rounded-3xl p-8 text-center cursor-pointer"
            >
                <UploadCloud className="mx-auto w-10 h-10 text-purple-300" />
                <p className="text-white mt-3">آپلود فیش پرداخت</p>
            </div>

            <input
                ref={fileRef}
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />

            {/* ================= PREVIEW ================= */}
            {preview && (
                <div className="relative mt-4">

                    <img src={preview} className="rounded-2xl" />

                    <button
                        onClick={() => {
                            setPreview(null);
                            onChange(null);
                        }}
                        className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-xl"
                    >
                        حذف
                    </button>

                </div>
            )}

            {/* animation */}
            <style>{`
                @keyframes fadeUp {
                    from { opacity:0; transform:translateY(10px); }
                    to { opacity:1; transform:translateY(0); }
                }
            `}</style>

        </div>
    );
};