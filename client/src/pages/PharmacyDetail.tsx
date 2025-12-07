/**
 * Pharmacy Detail Page
 * 
 * View for a single pharmacy with score chart and trading
 */

import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    Loader2,
    Store,
    Trophy,
    Activity,
    Package,
    MapPin,
} from "lucide-react";

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400&h=400&fit=crop";

export default function PharmacyDetail() {
    const params = useParams<{ id: string }>();
    const [, setLocation] = useLocation();
    const { user } = useAuth();
    const pharmacyId = parseInt(params.id || "0");

    const [tradeModal, setTradeModal] = useState<{
        open: boolean;
        action: 'buy' | 'sell';
        shares: number;
    }>({ open: false, action: 'buy', shares: 1 });

    // Fetch pharmacy detail
    const { data: pharmacy, isLoading, error } = trpc.stockMarket.getPharmacyDetail.useQuery(
        { pharmacyId },
        { enabled: pharmacyId > 0 }
    );

    // Trading mutations
    const buyMutation = trpc.stockMarket.buy.useMutation({
        onSuccess: (data) => {
            toast.success(data.message);
            setTradeModal({ open: false, action: 'buy', shares: 1 });
        },
        onError: (error) => toast.error(error.message),
    });

    const sellMutation = trpc.stockMarket.sell.useMutation({
        onSuccess: (data) => {
            toast.success(data.message);
            setTradeModal({ open: false, action: 'sell', shares: 1 });
        },
        onError: (error) => toast.error(error.message),
    });

    const handleTrade = () => {
        if (!user) {
            toast.error("Please login to trade");
            return;
        }
        const mutation = tradeModal.action === 'buy' ? buyMutation : sellMutation;
        mutation.mutate({
            assetType: 'pharmacy',
            assetId: pharmacyId,
            shares: tradeModal.shares,
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (error || !pharmacy) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
                <p className="text-zinc-400">Pharmacy not found</p>
                <Button onClick={() => setLocation('/market')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Market
                </Button>
            </div>
        );
    }

    const isPositive = pharmacy.scoreChange >= 0;

    // Calculate chart dimensions
    const chartData = pharmacy.scoreHistory;
    const scores = chartData.map(d => d.score);
    const maxScore = Math.max(...scores, pharmacy.currentScore);
    const minScore = Math.min(...scores, pharmacy.currentScore);
    const scoreRange = maxScore - minScore || 1;

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header Bar */}
            <div className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation('/market')}
                        className="text-zinc-400 hover:text-white"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Market
                    </Button>

                    <div className="flex items-center gap-3">
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                            onClick={() => setTradeModal({ open: true, action: 'buy', shares: 1 })}
                        >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Buy
                        </Button>
                        <Button
                            variant="outline"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                            onClick={() => setTradeModal({ open: true, action: 'sell', shares: 1 })}
                        >
                            <TrendingDown className="w-4 h-4 mr-2" />
                            Sell
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Hero Section */}
                <div className="grid grid-cols-12 gap-8 mb-8">
                    {/* Left: Logo */}
                    <div className="col-span-12 lg:col-span-4">
                        <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 ring-2 ring-zinc-700">
                            <img
                                src={pharmacy.logoUrl || PLACEHOLDER_IMG}
                                alt={pharmacy.name}
                                className="w-full h-full object-contain p-8"
                            />
                        </div>
                    </div>

                    {/* Right: Name + Score + Stats */}
                    <div className="col-span-12 lg:col-span-8">
                        <div className="h-full flex flex-col">
                            {/* Name & Score */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Store className="w-6 h-6 text-emerald-400" />
                                    <span className="text-sm text-zinc-400 uppercase tracking-wide">Pharmacy</span>
                                </div>
                                <h1 className="text-4xl font-bold text-white mb-2">{pharmacy.name}</h1>

                                {/* City */}
                                {pharmacy.city && (
                                    <div className="flex items-center gap-1 text-zinc-400 mb-3">
                                        <MapPin className="w-4 h-4" />
                                        <span>{pharmacy.city}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-4">
                                    <span className="text-5xl font-black text-white">
                                        {Math.round(pharmacy.currentScore)}
                                    </span>
                                    <span className="text-lg text-zinc-400">pts</span>
                                    <div className={cn(
                                        "flex items-center gap-1 px-3 py-1.5 rounded-full text-lg font-bold",
                                        isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                                    )}>
                                        {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                        {isPositive ? '+' : ''}{pharmacy.scoreChange} ({pharmacy.scoreChangePercent}%)
                                    </div>
                                </div>
                            </div>

                            {/* Quick Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="rounded-xl p-4 ring-1 bg-emerald-500/10 text-emerald-400 ring-emerald-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Package className="w-5 h-5" />
                                        <span className="text-xs uppercase tracking-wide opacity-80">Today's Orders</span>
                                    </div>
                                    <div className="text-2xl font-bold text-white">{pharmacy.todayOrders.toLocaleString()}</div>
                                </div>
                                <div className="rounded-xl p-4 ring-1 bg-yellow-500/10 text-yellow-400 ring-yellow-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Trophy className="w-5 h-5" />
                                        <span className="text-xs uppercase tracking-wide opacity-80">Market Rank</span>
                                    </div>
                                    <div className="text-2xl font-bold text-white">#{pharmacy.currentRank}</div>
                                    {pharmacy.previousRank > 0 && (
                                        <div className="text-xs mt-1 opacity-70">
                                            {pharmacy.currentRank < pharmacy.previousRank ? `↑ from #${pharmacy.previousRank}` :
                                                pharmacy.currentRank > pharmacy.previousRank ? `↓ from #${pharmacy.previousRank}` : 'No change'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Score Chart */}
                <Card className="bg-zinc-900/50 border-zinc-800 mb-8">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-emerald-400" />
                            30-Day Score History
                        </h3>

                        {chartData.length > 0 ? (
                            <div className="h-64 relative">
                                <svg viewBox="0 0 800 200" className="w-full h-full" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="pharmGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.3" />
                                            <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0" />
                                        </linearGradient>
                                    </defs>

                                    <path
                                        d={`
                                            M 0 ${200 - ((chartData[0]?.score || minScore) - minScore) / scoreRange * 180}
                                            ${chartData.map((d, i) => {
                                            const x = (i / (chartData.length - 1)) * 800;
                                            const y = 200 - ((d.score - minScore) / scoreRange * 180) - 10;
                                            return `L ${x} ${y}`;
                                        }).join(' ')}
                                            L 800 200 L 0 200 Z
                                        `}
                                        fill="url(#pharmGradient)"
                                    />

                                    <path
                                        d={`
                                            M 0 ${200 - ((chartData[0]?.score || minScore) - minScore) / scoreRange * 180 - 10}
                                            ${chartData.map((d, i) => {
                                            const x = (i / (chartData.length - 1)) * 800;
                                            const y = 200 - ((d.score - minScore) / scoreRange * 180) - 10;
                                            return `L ${x} ${y}`;
                                        }).join(' ')}
                                        `}
                                        fill="none"
                                        stroke={isPositive ? "#10b981" : "#ef4444"}
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                    />
                                </svg>

                                <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-zinc-500">
                                    <span>{Math.round(maxScore)}</span>
                                    <span>{Math.round((maxScore + minScore) / 2)}</span>
                                    <span>{Math.round(minScore)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-zinc-500">
                                No historical data available
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Trade Modal */}
            <Dialog open={tradeModal.open} onOpenChange={(open) => setTradeModal(prev => ({ ...prev, open }))}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {tradeModal.action === 'buy' ? (
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                            ) : (
                                <TrendingDown className="w-5 h-5 text-red-500" />
                            )}
                            {tradeModal.action === 'buy' ? 'Buy' : 'Sell'} {pharmacy.name}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Current Score</span>
                            <span className="text-xl font-bold">{Math.round(pharmacy.currentScore)} pts</span>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-zinc-400">Number of Shares</label>
                            <Input
                                type="number"
                                min="1"
                                value={tradeModal.shares}
                                onChange={(e) => setTradeModal(prev => ({
                                    ...prev,
                                    shares: Math.max(1, parseInt(e.target.value) || 1)
                                }))}
                                className="bg-zinc-800 border-zinc-700"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                            <span className="text-zinc-400">Total Score Cost</span>
                            <span className="text-2xl font-bold text-white">
                                {Math.round(pharmacy.currentScore * tradeModal.shares)} pts
                            </span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setTradeModal({ open: false, action: 'buy', shares: 1 })}>
                            Cancel
                        </Button>
                        <Button
                            className={tradeModal.action === 'buy' ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"}
                            onClick={handleTrade}
                            disabled={buyMutation.isPending || sellMutation.isPending}
                        >
                            {(buyMutation.isPending || sellMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {tradeModal.action === 'buy' ? 'Buy' : 'Sell'} Shares
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
