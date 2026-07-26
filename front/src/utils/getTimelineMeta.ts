import { MessageCircle, Palette, Flag, Clock, FileText, CheckCircle, XCircle, Send } from "lucide-react";

export type TimelineMeta = {
    icon: typeof MessageCircle;
    label: string;
    color: string;
    bg: string;
    dotColor: string;
    dotBg: string;
};

export const getTimelineMeta = (item: any): TimelineMeta => {
    const isAdminSide = item.data?.isAdmin || item.type === "DESIGN";

    switch (item.type) {
        case "MESSAGE":
            if (isAdminSide) {
                return {
                    icon: Send,
                    label: "پیام ادمین",
                    color: "text-blue-300",
                    bg: "bg-gradient-to-br from-blue-500/[0.08] to-blue-600/[0.03] border-blue-500/20",
                    dotColor: "text-blue-400",
                    dotBg: "bg-blue-500/20 border-blue-400/40",
                };
            }
            return {
                icon: MessageCircle,
                label: "پیام مشتری",
                color: "text-slate-200",
                bg: "bg-gradient-to-br from-white/[0.06] to-white/[0.02] border-white/10",
                dotColor: "text-slate-300",
                dotBg: "bg-white/10 border-white/20",
            };

        case "DESIGN":
            return {
                icon: Palette,
                label: "طرح پیشنهادی",
                color: "text-violet-300",
                bg: "bg-gradient-to-br from-violet-500/[0.1] to-purple-500/[0.04] border-violet-400/25 shadow-[0_0_30px_rgba(139,92,246,0.1)]",
                dotColor: "text-violet-400",
                dotBg: "bg-violet-500/25 border-violet-400/50",
            };

        case "STATUS": {
            const note = (item.data?.note || item.data?.message || "").toLowerCase();
            if (note.includes("رد") || note.includes("cancel") || note.includes("لغو")) {
                return {
                    icon: XCircle,
                    label: "رد / لغو",
                    color: "text-red-300",
                    bg: "bg-gradient-to-br from-red-500/[0.08] to-red-600/[0.03] border-red-500/20",
                    dotColor: "text-red-400",
                    dotBg: "bg-red-500/20 border-red-400/40",
                };
            }
            if (note.includes("تأیید") || note.includes("approve") || note.includes("پرداخت")) {
                return {
                    icon: CheckCircle,
                    label: "تأیید",
                    color: "text-emerald-300",
                    bg: "bg-gradient-to-br from-emerald-500/[0.08] to-emerald-600/[0.03] border-emerald-500/20",
                    dotColor: "text-emerald-400",
                    dotBg: "bg-emerald-500/20 border-emerald-400/40",
                };
            }
            return {
                icon: Flag,
                label: "تغییر وضعیت",
                color: "text-amber-300",
                bg: "bg-gradient-to-br from-amber-500/[0.08] to-amber-600/[0.03] border-amber-500/20",
                dotColor: "text-amber-400",
                dotBg: "bg-amber-500/20 border-amber-400/40",
            };
        }

        default:
            return {
                icon: Clock,
                label: "رویداد",
                color: "text-white/50",
                bg: "bg-white/[0.03] border-white/8",
                dotColor: "text-white/40",
                dotBg: "bg-white/8 border-white/15",
            };
    }
};
