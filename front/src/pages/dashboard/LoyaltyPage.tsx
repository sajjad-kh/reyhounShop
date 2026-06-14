import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassInput } from '../../components/ui/GlassInput';
import { useAuth } from '../../hooks/useAuth';
import { loyaltyService, LoyaltyTransaction, LoyaltyBalance } from '../../services/loyaltyService';
import { cn } from '../../utils';

// Icons
const StarIcon = ({ className }: { className?: string }) => (
    <svg className={cn('w-6 h-6', className)} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
);

const TrophyIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
);

const GiftIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
);

const ArrowUpIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
);

const ArrowDownIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
);

export const LoyaltyPage: React.FC = () => {
    const { state } = useAuth();
    const [balance, setBalance] = useState<LoyaltyBalance | null>(null);
    const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
    const [redeemPoints, setRedeemPoints] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);

    useEffect(() => {
        loadLoyaltyData();
    }, []);

    const loadLoyaltyData = async () => {
        try {
            setIsLoading(true);

            const [balanceData, transactionsData] = await Promise.all([
                loyaltyService.getBalance(),
                loyaltyService.getTransactions(1, 10)
            ]);

            setBalance(balanceData);
            setTransactions(transactionsData);
        } catch (err) {
            console.error('Error loading loyalty data:', err);

            // Fallback to user data
            if (state.user) {
                setBalance({
                    totalPoints: state.user.loyaltyPoints,
                    availablePoints: state.user.loyaltyPoints,
                    pendingPoints: 0,
                    lifetimeEarned: state.user.loyaltyPoints,
                    lifetimeRedeemed: 0,
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleRedeemPoints = async () => {
        const points = parseInt(redeemPoints);

        if (isNaN(points) || points <= 0) {
            alert('Please enter a valid number of points');
            return;
        }

        if (balance && points > balance.availablePoints) {
            alert('Insufficient points');
            return;
        }

        setIsRedeeming(true);

        try {
            const result = await loyaltyService.redeemPoints({ points });

            alert(`Successfully redeemed ${points} points for $${result.discountAmount.toFixed(2)} discount!`);

            // Reload data
            await loadLoyaltyData();

            setIsRedeemModalOpen(false);
            setRedeemPoints('');
        } catch (err) {
            console.error('Error redeeming points:', err);
            alert('Failed to redeem points. Please try again.');
        } finally {
            setIsRedeeming(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'EARNED':
                return <ArrowUpIcon />;
            case 'REDEEMED':
                return <ArrowDownIcon />;
            case 'EXPIRED':
                return <ArrowDownIcon />;
            default:
                return <StarIcon className="w-4 h-4" />;
        }
    };

    const getTransactionColor = (type: string) => {
        switch (type) {
            case 'EARNED':
                return 'text-green-400';
            case 'REDEEMED':
                return 'text-blue-400';
            case 'EXPIRED':
                return 'text-red-400';
            default:
                return 'text-text-secondary';
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-text-primary">Loyalty Points</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <GlassCard key={i} className="animate-pulse">
                            <div className="h-20 bg-glass-medium rounded" />
                        </GlassCard>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-text-primary mb-2">Loyalty Points</h1>
                <p className="text-text-secondary">
                    Earn points with every purchase and redeem them for discounts
                </p>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Available Points */}
                <GlassCard hover className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-gradient-accent rounded-full">
                            <StarIcon className="text-white" />
                        </div>
                    </div>
                    <h3 className="text-sm text-text-secondary mb-2">Available Points</h3>
                    <p className="text-3xl font-bold text-text-primary">
                        {balance?.availablePoints.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-text-muted mt-2">
                        ≈ ${loyaltyService.calculateDiscount(balance?.availablePoints || 0).toFixed(2)} value
                    </p>
                </GlassCard>

                {/* Lifetime Earned */}
                <GlassCard hover className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-green-500/20 rounded-full">
                            <TrophyIcon />
                        </div>
                    </div>
                    <h3 className="text-sm text-text-secondary mb-2">Lifetime Earned</h3>
                    <p className="text-3xl font-bold text-text-primary">
                        {balance?.lifetimeEarned.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-text-muted mt-2">
                        Total points earned
                    </p>
                </GlassCard>

                {/* Lifetime Redeemed */}
                <GlassCard hover className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-blue-500/20 rounded-full">
                            <GiftIcon />
                        </div>
                    </div>
                    <h3 className="text-sm text-text-secondary mb-2">Lifetime Redeemed</h3>
                    <p className="text-3xl font-bold text-text-primary">
                        {balance?.lifetimeRedeemed.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-text-muted mt-2">
                        Total points used
                    </p>
                </GlassCard>
            </div>

            {/* Redeem Points Section */}
            <GlassCard>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-text-primary mb-1">
                            Redeem Your Points
                        </h2>
                        <p className="text-sm text-text-secondary">
                            Convert your points into discount codes
                        </p>
                    </div>
                    <GlassButton
                        variant="accent"
                        onClick={() => setIsRedeemModalOpen(true)}
                        disabled={!balance || balance.availablePoints === 0}
                        ripple
                    >
                        <GiftIcon />
                        <span className="ml-2">Redeem Points</span>
                    </GlassButton>
                </div>

                <div className="glass-card bg-glass-light p-4 rounded-xl">
                    <h3 className="text-sm font-medium text-text-primary mb-2">How it works:</h3>
                    <ul className="space-y-2 text-sm text-text-secondary">
                        <li className="flex items-start">
                            <span className="text-accent-primary mr-2">•</span>
                            <span>Earn 1 point for every $1 spent</span>
                        </li>
                        <li className="flex items-start">
                            <span className="text-accent-primary mr-2">•</span>
                            <span>100 points = $1 discount</span>
                        </li>
                        <li className="flex items-start">
                            <span className="text-accent-primary mr-2">•</span>
                            <span>Redeem points during checkout for instant savings</span>
                        </li>
                        <li className="flex items-start">
                            <span className="text-accent-primary mr-2">•</span>
                            <span>Points never expire as long as your account is active</span>
                        </li>
                    </ul>
                </div>
            </GlassCard>

            {/* Transaction History */}
            <GlassCard>
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                    Recent Activity
                </h2>

                {transactions.length === 0 ? (
                    <div className="text-center py-12">
                        <StarIcon className="mx-auto text-text-muted mb-4" />
                        <p className="text-text-secondary">No transactions yet</p>
                        <p className="text-sm text-text-muted mt-2">
                            Start shopping to earn loyalty points!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((transaction) => (
                            <div
                                key={transaction.id}
                                className="glass-card bg-glass-light p-4 rounded-xl flex items-center justify-between"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className={cn(
                                        'p-2 rounded-lg',
                                        transaction.type === 'EARNED' && 'bg-green-500/20',
                                        transaction.type === 'REDEEMED' && 'bg-blue-500/20',
                                        transaction.type === 'EXPIRED' && 'bg-red-500/20'
                                    )}>
                                        <div className={getTransactionColor(transaction.type)}>
                                            {getTransactionIcon(transaction.type)}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="font-medium text-text-primary">
                                            {transaction.description}
                                        </p>
                                        <p className="text-xs text-text-muted">
                                            {formatDate(transaction.createdAt)}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className={cn(
                                        'font-semibold',
                                        getTransactionColor(transaction.type)
                                    )}>
                                        {transaction.type === 'EARNED' ? '+' : '-'}
                                        {transaction.points.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-text-muted">points</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </GlassCard>

            {/* Redeem Modal */}
            {isRedeemModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-md">
                        <GlassCard className="p-8">
                            <h2 className="text-xl font-semibold text-text-primary mb-6">
                                Redeem Points
                            </h2>

                            <div className="space-y-6">
                                <div className="glass-card bg-glass-light p-4 rounded-xl text-center">
                                    <p className="text-sm text-text-secondary mb-2">Available Points</p>
                                    <p className="text-3xl font-bold text-text-primary">
                                        {balance?.availablePoints.toLocaleString() || 0}
                                    </p>
                                </div>

                                <GlassInput
                                    type="number"
                                    label="Points to Redeem"
                                    value={redeemPoints}
                                    onChange={(e) => setRedeemPoints(e.target.value)}
                                    placeholder="Enter points amount"
                                />

                                {redeemPoints && parseInt(redeemPoints) > 0 && (
                                    <div className="glass-card bg-accent-primary/10 border-accent-primary/20 p-4 rounded-xl">
                                        <p className="text-sm text-text-secondary mb-1">Discount Value</p>
                                        <p className="text-2xl font-bold text-accent-primary">
                                            ${loyaltyService.calculateDiscount(parseInt(redeemPoints)).toFixed(2)}
                                        </p>
                                    </div>
                                )}

                                <div className="flex space-x-4">
                                    <GlassButton
                                        variant="secondary"
                                        onClick={() => {
                                            setIsRedeemModalOpen(false);
                                            setRedeemPoints('');
                                        }}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </GlassButton>

                                    <GlassButton
                                        variant="accent"
                                        onClick={handleRedeemPoints}
                                        loading={isRedeeming}
                                        disabled={!redeemPoints || parseInt(redeemPoints) <= 0}
                                        className="flex-1"
                                        ripple
                                    >
                                        Redeem
                                    </GlassButton>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            )}
        </div>
    );
};
