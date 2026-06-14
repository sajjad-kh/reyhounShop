import { MessageCircle, Palette, Flag, Clock } from "lucide-react";
import type { TimelineItem } from "../types";

export const getTimelineMeta = (item: TimelineItem) => {
    const isAdminSide = item.data?.isAdmin || item.type === "DESIGN";

    switch (item.type) {
        case "MESSAGE":
            return {
                icon: MessageCircle,
                label: item.data?.isAdmin ? "" : "",
                color: item.data?.isAdmin
                    ? "text-blue-400"
                    : "text-white",
                bg: item.data?.isAdmin
                    ? "bg-blue-500/10 border-blue-500/20"
                    : "bg-white/5 border-white/10",
            };

        case "DESIGN":
            return {
                icon: Palette,
                label: "طراحی ارسال شده",
                color: "text-purple-300",
                bg: "bg-purple-500/10 border-purple-400/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]",
            };

        case "STATUS":
            return {
                icon: Flag,
                label: "تغییر وضعیت",
                color: "text-emerald-400",
                bg: "bg-emerald-500/10 border-emerald-500/20",
            };

        default:
            return {
                icon: Clock,
                label: "رویداد",
                color: "text-white/60",
                bg: "bg-white/5 border-white/10",
            };
    }
};