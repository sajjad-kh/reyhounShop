// components/OrderTimeline.tsx

import {
    MessageCircle,
    Palette,
    Flag,
    Clock
} from "lucide-react";
import { getTimelineMeta } from "../../../utils/getTimelineMeta";
import type { UnifiedAdminOrderRow } from "../types";

/* ==================== TYPES ==================== */


type TimelineItem = {
  type: "MESSAGE" | "DESIGN" | "STATUS";
  side?: "left" | "right"; // 👈 این مهمه
  data?: {
    fileUrl?: string;
    isAdmin?: boolean;
  };
};

/* ==================== PROPS ==================== */

type Props = {
    order: UnifiedAdminOrderRow;
};

/* ==================== META ==================== */

// const getTimelineMeta = (item: TimelineItem) => {
//     const isAdminSide = item.data?.isAdmin || item.type === "DESIGN";
//     switch (item.type) {
//         case "MESSAGE":
//             return {
//                 icon: MessageCircle,
//                 label: item.data?.isAdmin ? "" : "",
//                 color: item.data?.isAdmin
//                     ? "text-blue-400"
//                     : "text-white",
//                 bg: item.data?.isAdmin
//                     ? "bg-blue-500/10 border-blue-500/20"
//                     : "bg-white/5 border-white/10",
//             };

//         case "DESIGN":
//             return {
//                 icon: Palette,
//                 label: "طراحی ارسال شده",
//                 color: "text-purple-300",
//                 bg: "bg-purple-500/10 border-purple-400/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]",
//             };
//         case "STATUS":
//             return {
//                 icon: Flag,
//                 label: "تغییر وضعیت",
//                 color: "text-emerald-400",
//                 bg: "bg-emerald-500/10 border-emerald-500/20",
//             };

//         default:
//             return {
//                 icon: Clock,
//                 label: "رویداد",
//                 color: "text-white/60",
//                 bg: "bg-white/5 border-white/10",
//             };
//     }
// };

/* ==================== COMPONENT ==================== */

export default function OrderTimeline({ order }: Props) {
    const timeline: TimelineItem[] = order?.timeline || [];
    return (
        <div className="w-full">

            {/* HEADER */}
            <div className="sticky top-0 z-20 w-full flex items-center justify-between gap-2 py-2 px-2  border-white/10">
                <span className="w-full px-3 py-1 rounded-full text-[12px] font-bold bg-blue-950/90 text-blue-300 border border-blue-500/20 text-center">
                    کاربر
                </span>

                <span className="w-full px-3 py-1 rounded-full text-[12px] font-bold bg-purple-900/75 text-purple-300 border border-purple-500/20 text-center">
                    ادمین
                </span>

            </div>


            {/* TIMELINE LINE */}
            <div className="relative">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />

                <div className="space-y-6">
                    {timeline.length ? (
                        timeline.map((item: TimelineItem, index: number) => {
                            const meta = getTimelineMeta(item);
                            const Icon = meta.icon;

                            const side =
                            item.type === "DESIGN" ? "right" :
                            item.data?.isAdmin ? "right" : "left";

                            const isAdminSide =
                                item.type === "DESIGN" ||
                                item.data?.isAdmin === true;

                            const date = item.data?.createdAt
                                ? new Date(item.data.createdAt)
                                : null;
                            const formattedDate =
                                date && !isNaN(date.getTime())
                                    ? date.toLocaleString("fa-IR", {
                                          year: "2-digit",
                                          month: "2-digit",
                                          day: "2-digit",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                      })
                                    : "—";

                            return (
                                <div
                                    key={item.data?.id || index}
                                    className="grid grid-cols-12 items-start"
                                >

                                    {/* LEFT */}
                                    <div className="col-span-5 flex justify-end pr-4">
                                        {!isAdminSide && (
                                            <div
                                                className={`max-w-md w-full rounded-xl p-3 border ${meta.bg}`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span
                                                        className={`text-sm font-medium ${meta.color} flex items-center gap-2`}
                                                    >
                                                        <Icon className="w-4 h-4" />
                                                        {meta.label}
                                                    </span>

                                                    <span className="text-white/30 text-[10px]">
                                                        {formattedDate}
                                                    </span>
                                                </div>





                                                {item.type == "DESIGN" ? (
                                                    <div className="mt-3 space-y-3">

                                                        {/* IMAGE PREVIEW */}
                                                        {item.data?.fileUrl ? (
                                                            <div className="relative group overflow-hidden rounded-xl border border-purple-400/30 shadow-lg">

                                                                <img
                                                                    src={item.data.fileUrl}
                                                                    alt="design"
                                                                    className="w-full h-52 object-cover transition-transform duration-300 group-hover:scale-105"
                                                                />

                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">

                                                                    <a
                                                                        href={item.data.fileUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="opacity-0 group-hover:opacity-100 transition bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm shadow-lg"
                                                                    >
                                                                        مشاهده طرح
                                                                    </a>

                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-white/40 text-sm">فایلی موجود نیست</div>
                                                        )}

                                                        {/* meta info */}
                                                        <div className="flex items-center justify-between text-xs text-white/50">
                                                            <span>ID: {item.data?.id ?? "-"}</span>

                                                            {item.data?.status && (
                                                                <span className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-300 border border-purple-400/20">
                                                                    {item.data.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="mt-2 text-white/80 text-sm leading-5">
                                                        {item.data?.message || item.data?.note || "—"}
                                                    </p>
                                                )}

                                            </div>
                                        )}
                                    </div>

                                    {/* DOT */}
                                    <div className="col-span-2 flex justify-center">
                                        <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs text-white/80 shadow-md">
                                            {index + 1}
                                        </div>
                                    </div>

                                    {/* RIGHT */}
                                    <div className="col-span-5 flex justify-start pl-4">
                                        {isAdminSide && (
                                            <div
                                                className={`max-w-md w-full rounded-xl p-3 border ${meta.bg}`}
                                            >
                                                {/* <div className="flex justify-between items-center">
                                                    <span className="text-white/30 text-[10px]">
                                                        {formattedDate}
                                                    </span>
                                                </div> */}
                                                {item.type === "DESIGN" && side === "right"? (
                                                    <div className="mt-3 space-y-3">

                                                        {/* IMAGE PREVIEW */}
                                                        {item.data?.fileUrl ? (
                                                            <div className="relative group overflow-hidden rounded-xl border border-purple-400/30 shadow-lg">

                                                                <img
                                                                    src={item.data.fileUrl}
                                                                    alt="design"
                                                                    className="w-full h-52 object-cover transition-transform duration-300 group-hover:scale-105"
                                                                />

                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">

                                                                    <a
                                                                        href={item.data.fileUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="opacity-0 group-hover:opacity-100 transition bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm shadow-lg"
                                                                    >
                                                                        مشاهده طرح
                                                                    </a>

                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-white/40 text-sm">فایلی موجود نیست</div>
                                                        )}

                                                        {/* meta info */}
                                                        <div className="flex items-center justify-between text-xs text-white/50">
                                                            <span>ID: {item.data?.id ?? "-"}</span>

                                                            {item.data?.status && (
                                                                <span className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-300 border border-purple-400/20">
                                                                    {item.data.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex  justify-left items-center">
                                                            <Icon className="w-4 h-4 ml-2" />
                                                            <span className="mt-2 text-white/80 text-sm leading-5">
                                                                {item.data?.message || item.data?.note || "—"}
                                                            </span>
                                                    </div>

                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-white/40 text-center py-10 text-sm">
                            هیچ فعالیتی ثبت نشده است
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}