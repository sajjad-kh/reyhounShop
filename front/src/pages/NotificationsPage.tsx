import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassPagination } from '../components/ui/GlassPagination';
import { Bell, Check, CheckCheck, Package, CreditCard, Tag, Palette, Gift, KeyRound, X, ShoppingBag, Star } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notificationService, { Notification } from '../services/notificationService';

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  ORDER_CONFIRMATION: <ShoppingBag className="w-5 h-5" />,
  ORDER_STATUS_UPDATE: <Package className="w-5 h-5" />,
  PAYMENT_SUCCESS: <CreditCard className="w-5 h-5" />,
  PAYMENT_FAILED: <X className="w-5 h-5" />,
  PROMOTION: <Tag className="w-5 h-5" />,
  DESIGN_UPLOADED: <Palette className="w-5 h-5" />,
  DESIGN_APPROVED: <Check className="w-5 h-5" />,
  DISCOUNT: <Tag className="w-5 h-5" />,
  WELCOME: <Gift className="w-5 h-5" />,
  PASSWORD_RESET: <KeyRound className="w-5 h-5" />,
  LOYALTY_EARNED: <Star className="w-5 h-5" />,
  LOYALTY_REDEEMED: <Gift className="w-5 h-5" />,
  LOYALTY_EXPIRING: <Star className="w-5 h-5" />,
  LOYALTY_REWARD: <Gift className="w-5 h-5" />,
  LOYALTY_BIRTHDAY: <Gift className="w-5 h-5" />,
  LOYALTY_REFERRAL: <Gift className="w-5 h-5" />,
};

const NOTIF_COLORS: Record<string, string> = {
  ORDER_CONFIRMATION: 'text-blue-400 bg-blue-500/20',
  ORDER_STATUS_UPDATE: 'text-emerald-400 bg-emerald-500/20',
  PAYMENT_SUCCESS: 'text-green-400 bg-green-500/20',
  PAYMENT_FAILED: 'text-red-400 bg-red-500/20',
  PROMOTION: 'text-amber-400 bg-amber-500/20',
  DESIGN_UPLOADED: 'text-purple-400 bg-purple-500/20',
  DESIGN_APPROVED: 'text-green-400 bg-green-500/20',
  DISCOUNT: 'text-pink-400 bg-pink-500/20',
  WELCOME: 'text-accent-primary bg-accent-primary/20',
  PASSWORD_RESET: 'text-gray-400 bg-gray-500/20',
  LOYALTY_EARNED: 'text-yellow-400 bg-yellow-500/20',
  LOYALTY_REDEEMED: 'text-yellow-400 bg-yellow-500/20',
  LOYALTY_EXPIRING: 'text-orange-400 bg-orange-500/20',
  LOYALTY_REWARD: 'text-yellow-400 bg-yellow-500/20',
  LOYALTY_BIRTHDAY: 'text-pink-400 bg-pink-500/20',
  LOYALTY_REFERRAL: 'text-green-400 bg-green-500/20',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'همین الان';
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} روز پیش`;
  return new Date(dateStr).toLocaleDateString('fa-IR');
}

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-page', page],
    queryFn: () => notificationService.getNotifications(page, limit),
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.setQueryData(['notifications-unread'], 0);
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'], refetchType: 'none' });
    },
  });

  const notifications: Notification[] = data?.notifications || [];
  const totalPages = data?.totalPages || 1;

  const handleNotifClick = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);

    let meta = n.metadata;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch { meta = null; }
    }

    let orderId: number | string | null = null;
    if (meta && typeof meta === 'object' && 'orderId' in meta) {
      orderId = (meta as Record<string, unknown>).orderId as number | string;
    } else {
      const match = n.message?.match(/#(\d+)/);
      if (match) orderId = match[1];
    }

    const orderTypes = ['ORDER_CONFIRMATION', 'ORDER_STATUS_UPDATE', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED'];
    const designTypes = ['DESIGN_UPLOADED', 'DESIGN_APPROVED'];
    const loyaltyTypes = ['LOYALTY_EARNED', 'LOYALTY_REDEEMED', 'LOYALTY_EXPIRING', 'LOYALTY_REWARD', 'LOYALTY_BIRTHDAY', 'LOYALTY_REFERRAL', 'DISCOUNT'];

    if (orderTypes.includes(n.type)) {
      navigate(orderId ? `/orders/${orderId}` : '/dashboard/orders');
    } else if (designTypes.includes(n.type)) {
      navigate(orderId ? `/orders/${orderId}#design` : '/dashboard/orders');
    } else if (loyaltyTypes.includes(n.type) || n.type === 'PROMOTION') {
      navigate('/dashboard/loyalty');
    } else {
      navigate('/dashboard/orders');
    }
  };

  return (
    <div className="px-4 py-8" dir="rtl">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">اعلان‌ها</h1>
            <p className="text-sm text-white/40 mt-1">همه اعلان‌های شما</p>
          </div>
          {notifications.some(n => !n.readAt) && (
            <button
              onClick={() => markAllRead.mutate()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium
                         text-accent-primary bg-accent-primary/10 hover:bg-accent-primary/20
                         transition-all duration-200 active:scale-95"
            >
              <CheckCheck className="w-4 h-4" />
              علامت‌کردن همه به عنوان خوانده شده
            </button>
          )}
        </div>

        {/* List */}
        <div className="rounded-2xl border border-white/10 bg-[#1a1f3a] overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
              <p className="text-sm text-white/40">در حال بارگذاری...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center">
                <Bell className="w-10 h-10 text-white/15" />
              </div>
              <p className="text-lg text-white/30 font-medium">اعلانی وجود ندارد</p>
              <p className="text-sm text-white/15">اعلان‌های جدید اینجا نمایش داده می‌شوند</p>
            </div>
          ) : (
            <div>
              {notifications.map((n, idx) => {
                const icon = NOTIF_ICONS[n.type] || <Bell className="w-5 h-5" />;
                const colorClass = NOTIF_COLORS[n.type] || 'text-white/50 bg-white/5';
                const isUnread = !n.readAt;

                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={`w-full text-right px-5 py-4 flex items-start gap-4 transition-all duration-200
                               hover:bg-white/5 active:bg-white/10 group
                               ${isUnread ? 'bg-white/[0.04]' : ''}
                               ${idx !== notifications.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
                  >
                    <div className={`w-11 h-11 rounded-2xl ${colorClass.split(' ')[1]} flex items-center justify-center shrink-0
                                    group-hover:scale-105 transition-transform duration-200`}>
                      <span className={colorClass.split(' ')[0]}>{icon}</span>
                    </div>

                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold truncate ${isUnread ? 'text-white' : 'text-white/70'}`}>
                          {n.title}
                        </p>
                        {isUnread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-accent-primary shrink-0 shadow-sm shadow-accent-primary/50" />
                        )}
                      </div>
                      <p className={`text-xs mt-1 truncate ${isUnread ? 'text-white/50' : 'text-white/35'}`}>
                        {n.message}
                      </p>
                      <p className="text-[11px] text-white/25 mt-1.5">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <GlassPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="px-5 py-4 border-t border-white/10"
          />
        </div>
      </div>
    </div>
  );
};

