import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, CheckCircle2, Truck } from "lucide-react";

import type { UnifiedAdminOrderRow } from "../types";

type Props = {
  open: boolean;
  isOpen: boolean;
  onToggle: () => void;
  order: UnifiedAdminOrderRow | null;
  onSubmitShipment: (
    trackingCode: string
  ) => Promise<void>;
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

  const isShipped =
    order?.status === "SHIPPED" ||
    order?.status === "DELIVERED";

  const submitShipment = async () => {
    if (isShipped) return;

    if (!trackingCode.trim()) {
      alert("کد رهگیری یا شماره موبایل پیک را وارد کنید");
      return;
    }

    await onSubmitShipment(trackingCode);
  };

  return (
    <div className="mx-8 my-2 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] backdrop-blur-xl shadow-xl overflow-hidden">
      {/* HEADER */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition"
      >
        <h3 className="text-white font-semibold">
          ارسال سفارش نهایی
        </h3>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
        >
          <ChevronDown className="w-5 h-5 text-white/70" />
        </motion.div>
      </button>

      {/* BODY */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: "easeInOut",
            }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-5 pb-8">
              {isShipped ? (
                <>
                  {/* SENT INFO */}
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />

                      <div>
                        <p className="text-emerald-400 font-semibold">
                          سفارش ارسال شده است
                        </p>

                        <p className="text-xs text-white/60 mt-1">
                          امکان ثبت مجدد ارسال وجود ندارد
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* TRACKING */}
                  <div>
                    <label className="block mb-2 text-xs text-white/60">
                      کد رهگیری / موبایل پیک
                    </label>

                    <div className="h-11 px-4 rounded-xl bg-black/20 border border-white/10 flex items-center text-white">
                      {order?.trackingCode || "-"}
                    </div>
                  </div>

                  {/* SHIPPING METHOD */}
                  <div>
                    <label className="block mb-2 text-xs text-white/60">
                      روش ارسال
                    </label>

                    <div className="h-11 px-4 rounded-xl bg-black/20 border border-white/10 flex items-center gap-2 text-white">
                      <Truck className="w-4 h-4 text-cyan-400" />

                      {selectedShippingId || "-"}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* TRACKING */}
                  <div>
                    <label className="block mb-2 text-xs text-white/60">
                      پست (کد رهگیری) / پیک (موبایل)
                    </label>

                    <input
                      value={trackingCode}
                      onChange={(e) =>
                        setTrackingCode(e.target.value)
                      }
                      type="text"
                      placeholder="مثلاً 770123456789"
                      className="
                        w-full h-11 px-4 rounded-xl
                        bg-black/20
                        border border-white/10
                        text-white text-sm
                        outline-none
                        focus:border-accent-primary/50
                        transition
                      "
                    />
                  </div>

                  {/* SHIPPING METHOD */}
                  <div>
                    <label className="block mb-2 text-xs text-white/60">
                      روش ارسال
                    </label>

                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        className={`
                          h-14 rounded-xl border transition-all text-sm
                          ${
                            selectedShippingId === "پست پیشتاز"
                              ? "border-accent-primary bg-accent-primary/20 text-white"
                              : "border-white/10 bg-white/[0.03] text-white/40"
                          }
                        `}
                      >
                        پست پیشتاز
                      </button>

                      <button
                        type="button"
                        className={`
                          h-14 rounded-xl border transition-all text-sm
                          ${
                            selectedShippingId === "پست سفارشی"
                              ? "border-accent-primary bg-accent-primary/20 text-white"
                              : "border-white/10 bg-white/[0.03] text-white/40"
                          }
                        `}
                      >
                        پست سفارشی
                      </button>

                      <button
                        type="button"
                        className={`
                          h-14 rounded-xl border transition-all text-sm
                          ${
                            selectedShippingId === "پیک"
                              ? "border-accent-primary bg-accent-primary/20 text-white"
                              : "border-white/10 bg-white/[0.03] text-white/40"
                          }
                        `}
                      >
                        پیک
                      </button>
                    </div>
                  </div>

                  {/* SUBMIT */}
                  <button
                    type="button"
                    onClick={submitShipment}
                    disabled={!trackingCode.trim()}
                    className="
                      w-full h-12 rounded-xl
                      bg-gradient-to-r
                      from-emerald-500
                      to-green-600
                      hover:opacity-90
                      disabled:opacity-40
                      disabled:cursor-not-allowed
                      transition-all
                      text-white font-medium
                      shadow-lg shadow-green-500/20
                    "
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