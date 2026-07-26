import { getTimelineMeta } from "../../../utils/getTimelineMeta";
import type { UnifiedAdminOrderRow } from "../types";
import { Download, Calendar, Clock } from "lucide-react";

const DESIGN_STATUS_FA: Record<string, string> = {
    DRAFT: "پیش‌نویس",
    SENT_TO_USER: "ارسال شده به کاربر",
    APPROVED: "تأیید شده",
    NEED_CHANGE: "نیاز به تغییر",
};

type TimelineItem = {
    type: "MESSAGE" | "DESIGN" | "STATUS";
    createdAt?: string | Date;
    data?: {
        id?: number;
        fileUrl?: string;
        isAdmin?: boolean;
        message?: string;
        note?: string;
        status?: string;
        version?: number;
        user?: { id: number; name?: string; email?: string };
    };
};

type Props = {
    order: UnifiedAdminOrderRow;
};

export default function OrderTimeline({ order }: Props) {
    const timeline: TimelineItem[] = order?.timeline || [];

    const formatDate = (dateStr: string | Date | undefined): { date: string; time: string; weekday: string } | null => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;

        const date = d.toLocaleDateString("fa-IR", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
        const time = d.toLocaleTimeString("fa-IR", {
            hour: "2-digit",
            minute: "2-digit",
        });
        const weekday = d.toLocaleDateString("fa-IR", { weekday: "long" });

        return { date, time, weekday };
    };

    const groupedItems: { dateKey: string; dateLabel: string; weekday: string; items: TimelineItem[] }[] = [];
    let currentGroup: { dateKey: string; dateLabel: string; weekday: string; items: TimelineItem[] } | null = null;

    for (const item of timeline) {
        const info = formatDate(item.createdAt);
        const dateKey = info ? info.date : "unknown";
        const dateLabel = info ? info.date : "نامشخص";
        const weekday = info ? info.weekday : "";

        if (!currentGroup || currentGroup.dateKey !== dateKey) {
            currentGroup = { dateKey, dateLabel, weekday, items: [] };
            groupedItems.push(currentGroup);
        }
        currentGroup.items.push(item);
    }

    return (
        <div className="w-full px-1 sm:px-2 py-2 sm:py-3">
            {/* HEADER — desktop only */}
            <div className="hidden sm:flex items-center justify-between mb-8 px-4">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-lg shadow-violet-400/30" />
                    <span className="text-[11px] font-semibold tracking-wide text-violet-300/80 uppercase">ادمین</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold tracking-wide text-blue-300/80 uppercase">مشتری</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-lg shadow-blue-400/30" />
                </div>
            </div>

            {/* TIMELINE */}
            <div className="relative">
                {/* Vertical center line — desktop only */}
                <div className="absolute top-8 bottom-8 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-white/10 via-white/8 to-white/10 hidden sm:block" />

                <div className="space-y-4 sm:space-y-6">
                    {groupedItems.length ? (
                        groupedItems.map((group) => (
                            <div key={group.dateKey}>
                                {/* DATE SEPARATOR */}
                                <div className="relative flex items-center justify-center mb-5 sm:mb-6">
                                    <div className="absolute inset-x-0 top-1/2 h-px bg-white/8" />
                                    <div className="relative z-10 flex items-center gap-2.5 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#0A0F1C] border border-white/10 shadow-lg shadow-black/30">
                                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent-primary/60" />
                                        <span className="text-[11px] sm:text-[12px] font-bold text-white/70">{group.dateLabel}</span>
                                        <span className="text-[11px] sm:text-[12px] text-white/30">{group.weekday}</span>
                                    </div>
                                </div>

                                {/* ITEMS */}
                                <div className="space-y-4 sm:space-y-5">
                                    {group.items.map((item: TimelineItem, idx: number) => {
                                        const meta = getTimelineMeta(item);
                                        const Icon = meta.icon;

                                        const note = (item.data?.note || '').toLowerCase();
                                        const isAdminSide =
                                            item.type === "DESIGN" ||
                                            item.data?.isAdmin === true ||
                                            (item.type === "STATUS" && !(note.includes('مشتری') || note.includes('تحویل') || note.includes('کاربر')));

                                        const info = formatDate(item.createdAt);
                                        const timeLabel = info?.time || "";

                                        const globalIndex = timeline.indexOf(item);
                                        const isLast = globalIndex === timeline.length - 1;

                                        const cardContent = item.type === "DESIGN" ? (
                                            <div className="space-y-2">
                                                {item.data?.fileUrl ? (
                                                    <div className="relative group/img overflow-hidden rounded-xl border border-violet-400/20">
                                                        <img
                                                            src={item.data.fileUrl}
                                                            alt="design"
                                                            className="w-full h-36 sm:h-44 object-cover transition-transform duration-500 group-hover/img:scale-105"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300" />
                                                        <div className="absolute bottom-0 inset-x-0 p-2 sm:p-2.5 flex items-center justify-between opacity-0 group-hover/img:opacity-100 transition-opacity duration-300">
                                                            <a href={item.data.fileUrl} target="_blank" rel="noreferrer"
                                                                className="text-[11px] sm:text-[12px] bg-white/15 backdrop-blur-sm text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-white/25 transition-colors">
                                                                مشاهده
                                                            </a>
                                                            <a href={item.data.fileUrl} download
                                                                className="p-1 sm:p-1.5 rounded-lg bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 transition-colors">
                                                                <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                            </a>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-28 sm:h-32 rounded-xl bg-white/5 border border-dashed border-white/10 flex items-center justify-center text-white/30 text-xs">
                                                        فایلی موجود نیست
                                                    </div>
                                                )}
                                                {item.data?.status && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] sm:text-[12px] text-white/30 font-medium">v{item.data.version || "?"}</span>
                                                        <span className="px-2 py-0.5 rounded-full text-[11px] sm:text-[12px] font-medium bg-violet-500/15 text-violet-300 border border-violet-400/20">
                                                            {DESIGN_STATUS_FA[item.data.status] || item.data.status}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-[12px] sm:text-[13px] text-white/75 leading-relaxed">
                                                {item.data?.message || item.data?.note || "—"}
                                            </p>
                                        );

                                        return (
                                            <div key={item.data?.id || idx} className="relative group">

                                                {/* ========== MOBILE: chat-style ========== */}
                                                <div className={`sm:hidden flex items-start gap-2.5 ${isAdminSide ? 'flex-row-reverse pr-10' : 'pl-10'}`}>
                                                    <div className={`${isAdminSide ? 'absolute right-0' : 'absolute left-0'} z-10`}>
                                                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${meta.dotBg} ${meta.dotColor}`}>
                                                            <Icon className="w-3.5 h-3.5" />
                                                        </div>
                                                    </div>
                                                    <div className={`flex-1 min-w-0 rounded-2xl border p-3 transition-all duration-200 relative ${meta.bg}`}>
                                                        <div className="flex items-center justify-end mb-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <Icon className={`w-3 h-3 ${meta.color}`} />
                                                                <span className={`text-[10px] font-semibold ${meta.color}`}>{meta.label}</span>
                                                            </div>
                                                        </div>
                                                        {timeLabel && (
                                                            <div className="absolute top-1.5 right-2 flex items-center gap-1">
                                                                <span className="text-[9px] text-white/30 font-medium">{timeLabel}</span>
                                                                <Clock className="w-2.5 h-2.5 text-white/20" />
                                                            </div>
                                                        )}
                                                        {cardContent}
                                                    </div>
                                                </div>

                                                {/* ========== DESKTOP: alternating left/right ========== */}
                                                <div className="hidden sm:grid sm:grid-cols-[1fr_56px_1fr] sm:items-start">
                                                    {/* LEFT (ADMIN) */}
                                                    <div className="flex justify-end pr-5">
                                                        {isAdminSide && (
                                                            <div className={`max-w-[280px] w-full rounded-2xl border p-4 transition-all duration-200 hover:shadow-lg hover:shadow-black/20 relative ${meta.bg}`}>
                                                                <div className="flex items-center justify-end gap-1.5 mb-2.5">
                                                                    <span className={`text-[11px] font-semibold ${meta.color}`}>{meta.label}</span>
                                                                    <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                                                                </div>
                                                                {timeLabel && (
                                                                    <div className="absolute top-1.5 right-2.5 flex items-center gap-1.5">
                                                                        <span className="text-[10px] text-white/30 font-medium">{timeLabel}</span>
                                                                        <Clock className="w-3 h-3 text-white/20" />
                                                                    </div>
                                                                )}
                                                                {cardContent}
                                                                {/* connector line */}
                                                                <div className="absolute top-5 -left-5 w-5 h-px bg-white/10 group-hover:bg-white/20 transition-colors" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* CENTER DOT */}
                                                    <div className="flex justify-center relative pt-1">
                                                        <div className={`relative z-10 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg ${meta.dotBg} ${meta.dotColor}`}>
                                                            <Icon className="w-4 h-4" />
                                                        </div>
                                                        {isLast && (
                                                            <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${meta.dotBg}`} />
                                                        )}
                                                    </div>

                                                    {/* RIGHT (USER) */}
                                                    <div className="flex justify-start pl-5">
                                                        {!isAdminSide && (
                                                            <div className={`max-w-[280px] w-full rounded-2xl border p-4 transition-all duration-200 hover:shadow-lg hover:shadow-black/20 relative ${meta.bg}`}>
                                                                <div className="flex items-center gap-1.5 mb-2.5">
                                                                    <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                                                                    <span className={`text-[11px] font-semibold ${meta.color}`}>{meta.label}</span>
                                                                </div>
                                                                {timeLabel && (
                                                                    <div className="absolute top-1.5 left-2.5 flex items-center gap-1.5">
                                                                        <Clock className="w-3 h-3 text-white/20" />
                                                                        <span className="text-[10px] text-white/30 font-medium">{timeLabel}</span>
                                                                    </div>
                                                                )}
                                                                {cardContent}
                                                                {/* connector line */}
                                                                <div className="absolute top-5 -right-5 w-5 h-px bg-white/10 group-hover:bg-white/20 transition-colors" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 sm:py-16 text-center">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <span className="text-xl sm:text-2xl opacity-40">📋</span>
                            </div>
                            <p className="text-white/30 text-xs sm:text-sm">هیچ فعالیتی ثبت نشده است</p>
                            <p className="text-white/15 text-[10px] sm:text-xs mt-1">تاریخچه سفارش اینجا نمایش داده می‌شود</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
