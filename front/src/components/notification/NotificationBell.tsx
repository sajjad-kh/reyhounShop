import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Package, CreditCard, Tag, Palette, Gift, KeyRound, X, ShoppingBag, Star } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notificationService, { Notification } from '../../services/notificationService';

const NOTIF_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  ORDER_CONFIRMATION: { icon: <ShoppingBag className="w-4 h-4" />, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  ORDER_STATUS_UPDATE: { icon: <Package className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  PAYMENT_SUCCESS: { icon: <CreditCard className="w-4 h-4" />, color: 'text-green-400', bg: 'bg-green-500/20' },
  PAYMENT_FAILED: { icon: <X className="w-4 h-4" />, color: 'text-red-400', bg: 'bg-red-500/20' },
  PROMOTION: { icon: <Tag className="w-4 h-4" />, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  DESIGN_UPLOADED: { icon: <Palette className="w-4 h-4" />, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  DESIGN_APPROVED: { icon: <Check className="w-4 h-4" />, color: 'text-green-400', bg: 'bg-green-500/20' },
  DISCOUNT: { icon: <Tag className="w-4 h-4" />, color: 'text-pink-400', bg: 'bg-pink-500/20' },
  WELCOME: { icon: <Gift className="w-4 h-4" />, color: 'text-accent-primary', bg: 'bg-accent-primary/20' },
  PASSWORD_RESET: { icon: <KeyRound className="w-4 h-4" />, color: 'text-gray-400', bg: 'bg-gray-500/20' },
  LOYALTY_EARNED: { icon: <Star className="w-4 h-4" />, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  LOYALTY_REDEEMED: { icon: <Gift className="w-4 h-4" />, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  LOYALTY_EXPIRING: { icon: <Star className="w-4 h-4" />, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  LOYALTY_REWARD: { icon: <Gift className="w-4 h-4" />, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  LOYALTY_BIRTHDAY: { icon: <Gift className="w-4 h-4" />, color: 'text-pink-400', bg: 'bg-pink-500/20' },
  LOYALTY_REFERRAL: { icon: <Gift className="w-4 h-4" />, color: 'text-green-400', bg: 'bg-green-500/20' },
  REVIEW_SUBMITTED: { icon: <Star className="w-4 h-4" />, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'اکنون';
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} روز پیش`;
  return new Date(dateStr).toLocaleDateString('fa-IR');
}

const NotificationBell: React.FC<{ isAdmin?: boolean }> = ({ isAdmin = false }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 30000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(1, 20),
    enabled: open,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const notifications: Notification[] = data?.notifications || [];

  const handleNotifClick = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);
    setOpen(false);

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

    if (isAdmin) {
      const reviewTitle = n.title && n.title.includes('نظر');
      if (reviewTitle) {
        navigate('/admin/reviews');
      } else {
        const orderTypes = ['ORDER_CONFIRMATION', 'ORDER_STATUS_UPDATE', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'DESIGN_UPLOADED', 'DESIGN_APPROVED'];
        if (orderTypes.includes(n.type) && orderId) {
          navigate('/admin/orders?orderId=' + orderId);
        } else {
          navigate('/admin/orders');
        }
      }
    } else {
      const orderTypes = ['ORDER_CONFIRMATION', 'ORDER_STATUS_UPDATE', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED'];
      const designTypes = ['DESIGN_UPLOADED', 'DESIGN_APPROVED'];
      const loyaltyTypes = ['LOYALTY_EARNED', 'LOYALTY_REDEEMED', 'LOYALTY_EXPIRING', 'LOYALTY_REWARD', 'LOYALTY_BIRTHDAY', 'LOYALTY_REFERRAL', 'DISCOUNT'];

      if (orderTypes.includes(n.type)) {
        navigate(orderId ? `/orders/${orderId}` : '/dashboard/orders');
      } else if (designTypes.includes(n.type)) {
        navigate(orderId ? `/orders/${orderId}#design` : '/dashboard/orders');
      } else if (loyaltyTypes.includes(n.type)) {
        navigate('/dashboard/loyalty');
      } else if (n.type === 'PROMOTION') {
        navigate('/dashboard/loyalty');
      } else {
        navigate('/dashboard/orders');
      }
    }
  };

  const renderDropdown = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent-primary/20 flex items-center justify-center">
            <Bell className="w-4 h-4 text-accent-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">اعلان‌ها</h3>
            {unreadCount > 0 && (
              <p className="text-[10px] text-white/50">{unreadCount} خوانده نشده</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium
                       text-accent-primary bg-accent-primary/10 hover:bg-accent-primary/20
                       transition-all duration-200 active:scale-95"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            همه خوانده شد
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
            <p className="text-xs text-white/40">در حال بارگذاری...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
              <Bell className="w-7 h-7 text-white/25" />
            </div>
            <p className="text-sm text-white/40 font-medium">اعلانی وجود ندارد</p>
            <p className="text-[11px] text-white/25">اعلان‌های جدید اینجا نمایش داده می‌شوند</p>
          </div>
        ) : (
          <div className="py-1">
            {notifications.map((n, idx) => {
              const config = NOTIF_CONFIG[n.type] || { icon: <Bell className="w-4 h-4" />, color: 'text-white/50', bg: 'bg-white/5' };
              const isUnread = !n.readAt;

              const btnClass = (isAdmin ? 'text-left' : 'text-right') + ' w-full px-4 py-3.5 flex items-start gap-3 transition-all duration-200 hover:bg-white/10 active:bg-white/15 group' + (isUnread ? ' bg-white/[0.06]' : '') + (idx !== notifications.length - 1 ? ' border-b border-white/[0.06]' : '');
              return (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={btnClass}
                >
                  <div className={'w-9 h-9 rounded-xl ' + config.bg + ' flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200'}>
                    <span className={config.color}>{config.icon}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={'text-[13px] font-semibold truncate ' + (isUnread ? 'text-white' : 'text-white/70')}>
                        {n.title}
                      </p>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-accent-primary shrink-0 shadow-sm shadow-accent-primary/50" />
                      )}
                    </div>
                    <p className={'text-xs mt-0.5 truncate ' + (isUnread ? 'text-white/60' : 'text-white/40')}>
                      {n.message}
                    </p>
                    <p className="text-[10px] text-white/30 mt-1.5 font-medium">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-3 border-t border-white/10 bg-white/[0.04]">
          <button
            onClick={() => {
              setOpen(false);
              navigate('/notifications');
            }}
            className="w-full py-2 rounded-lg text-xs font-medium text-white/50 hover:text-white/70 hover:bg-white/10 transition-all duration-200"
          >
            مشاهده همه اعلان‌ها
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl transition-all duration-300 hover:bg-white/10 active:scale-95"
        title="اعلان‌ها"
      >
        <Bell className={`w-5 h-5 transition-colors ${open ? 'text-accent-primary' : 'text-text-primary'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full shadow-lg shadow-red-500/30 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile: centered modal via portal to escape flex parent */}
          {createPortal(
            <div className="sm:hidden fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
              <div
                className="w-full max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden flex flex-col bg-[#1a1f3a] border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] animate-fade-in-up h-[90vh]"
                style={{ animationDuration: '0.25s' }}
                onClick={(e) => e.stopPropagation()}
              >
                {renderDropdown()}
              </div>
            </div>,
            document.body
          )}
          {/* Desktop: absolute dropdown */}
          <div
            className={'hidden sm:block absolute ' + (isAdmin ? 'right-0' : 'left-0') + ' mt-3 w-[380px] rounded-2xl overflow-hidden z-50 flex flex-col bg-[#1a1f3a] border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] animate-fade-in-up'}
            style={{ animationDuration: '0.25s' }}
          >
            {renderDropdown()}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
