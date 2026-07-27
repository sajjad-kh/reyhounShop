import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, CheckCircle2, Truck } from "lucide-react";
import { toast } from '../../../utils/toast';

import type { UnifiedAdminOrderRow } from "../types";

type Props = {
  open: boolean;
  isOpen: boolean;
  onToggle: () => void;
  order: UnifiedAdminOrderRow | null;
  onSubmitShipment: (trackingCode: string) => Promise<void>;
};

export default function SendActionsPanel({
  open,
  isOpen,
  onToggle,
  order,
  onSubmitShipment,
}: Props) {
  if (!open) return null;

  const selectedShippingId = order?.shippingTitle;
  const [trackingCode, setTrackingCode] = useState("");

  useEffect(() => {
    setTrackingCode(order?.trackingCode ?? "");
  }, [order]);

  const isShipped = order?.status === "SHIPPED" || order?.status === "DELIVERED";

  const submitShipment = async () => {
    if (isShipped) return;
    if (!trackingCode.trim()) {
      toast.error("کد رهگیری یا شماره موبایل پیک را وارد کنید");
      return;
    }
    await onSubmitShipment(trackingCode);
  };

  return (
    <div className="rounded-xl sm:rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] backdrop-blur-xl shadow-xl overflow-hidden">

      {/* HEADER */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-white/5 transition"
      >
        <h3 className="text-xs sm:text-sm font-semibold text-white">ارسال سفارش نهایی</h3>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-white/70" />
        </motion.div>
      </button>

      {/* BODY */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-5 pb-6 sm:pb-8">
              {isShipped ? (
                <>
                  {/* SENT INFO */}
                  <div className="rounded-xl sm:rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 sm:p-4">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="text-emerald-400 font-semibold text-xs sm:text-sm">سفارش ارسال شده است</p>
                        <p className="text-[10px] sm:text-xs text-white/60 mt-0.5 sm:mt-1">امکان ثبت مجدد ارسال وجود ندارد</p>
                      </div>
                    </div>
                  </div>

                  {/* TRACKING */}
                  <div>
                    <label className="block mb-1.5 sm:mb-2 text-[10px] sm:text-xs text-white/60">کد رهگیری / موبایل پیک</label>
                    <div className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-black/20 border border-white/10 flex items-center text-white text-xs sm:text-sm">
                      {order?.trackingCode || "-"}
                    </div>
                  </div>

                  {/* SHIPPING METHOD */}
                  <div>
                    <label className="block mb-1.5 sm:mb-2 text-[10px] sm:text-xs text-white/60">روش ارسال</label>
                    <div className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-black/20 border border-white/10 flex items-center gap-2 text-white text-xs sm:text-sm">
                      <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 flex-shrink-0" />
                      {selectedShippingId || "-"}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* TRACKING */}
                  <div>
                    <label className="block mb-1.5 sm:mb-2 text-[10px] sm:text-xs text-white/60">پست (کد رهگیری) / پیک (موبایل)</label>
                    <input
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                      type="text"
                      placeholder="مثلاً 770123456789"
                      className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-black/20 border border-white/10 text-white text-xs sm:text-sm outline-none focus:border-accent-primary/50 transition"
                    />
                  </div>

                  {/* SHIPPING METHOD */}
                  <div>
                    <label className="block mb-1.5 sm:mb-2 text-[10px] sm:text-xs text-white/60">روش ارسال</label>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {["پست پیشتاز", "پست سفارشی", "پیک"].map((method) => (
                        <button
                          key={method}
                          type="button"
                          className={`
                            h-11 sm:h-14 rounded-xl border transition-all text-[11px] sm:text-sm
                            ${selectedShippingId === method
                              ? "border-accent-primary bg-accent-primary/20 text-white"
                              : "border-white/10 bg-white/[0.03] text-white/40"
                            }
                          `}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SUBMIT */}
                  <button
                    type="button"
                    onClick={submitShipment}
                    disabled={!trackingCode.trim()}
                    className="w-full h-11 sm:h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-white text-xs sm:text-sm font-medium shadow-lg shadow-green-500/20"
                  >
                    ثبت ارسال سفارش
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
