/**
 * Strain Detail Page - Bloomberg Terminal Style
 * 
 * Comprehensive view of a single strain with:
 * - Price chart with historical data
 * - Key performance metrics
 * - Strain info (THC/CBD, effects, terpenes)
 * - Trading functionality
 */

import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    Leaf,
    Zap,
    Trophy,
    BarChart3,
    Activity,
    Target,
    Flame,
    Percent,
    Package,
    Calendar,
    DollarSign,
} from "lucide-react";

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=400&h=400&fit=crop";

// Emoji maps for display
const EFFECT_EMOJIS: Record<string, string> = {
    'Happy': '😊', 'Relaxed': '😌', 'Creative': '💡', 'Euphoric': '🌟',
    'Focused': '🎯', 'Uplifted': '🚀', 'Sleepy': '😴', 'Hungry': '🍕',
    'Talkative': '💬', 'Energetic': '⚡', 'Giggly': '😂', 'Aroused': '💋',
};

const TERPENE_EMOJIS: Record<string, string> = {
    'Myrcene': '🌿', 'Limonene': '🍋', 'Pinene': '🌲', 'Caryophyllene': '🌶️',
    'Linalool': '🌸', 'Terpinolene': '🍊', 'Humulene': '🍺', 'Ocimene': '🌼',
};

const FLAVOR_EMOJIS: Record<string, string> = {
    'Sweet': '🍬', 'Citrus': '🍊', 'Berry': '🍇', 'Earthy': '🌍',
    'Pine': '🌲', 'Diesel': '⛽', 'Spicy': '🌶️', 'Floral': '🌸',
    'Grape': '🍇', 'Mango': '🥭', 'Vanilla': '🍦', 'Mint': '🌿',
};

export default function StrainDetail() {
    const params = useParams<{ id: string }>();
    const [, setLocation] = useLocation();
    const { user } = useAuth();
    const strainId = parseInt(params.id || "0");

    const [tradeModal, setTradeModal] = useState<{
        open: boolean;
        action: 'buy' | 'sell';
        shares: number;
    }>({ open: false, action: 'buy', shares: 1 });

    // Fetch strain detail
    const { data: strain, isLoading, error } = trpc.stockMarket.getStrainDetail.useQuery(
        { strainId },
        { enabled: strainId > 0 }
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
            assetType: 'strain',
            assetId: strainId,
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

    if (error || !strain) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
                <p className="text-zinc-400">Strain not found</p>
                <Button onClick={() => setLocation('/market')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Market
                </Button>
            </div>
        );
    }

    const isPositive = strain.priceChange >= 0;

    // Calculate chart dimensions
    const chartData = strain.priceHistory;
    const prices = chartData.map(d => d.price);
    const maxPrice = Math.max(...prices, strain.currentPrice);
    const minPrice = Math.min(...prices, strain.currentPrice);
    const priceRange = maxPrice - minPrice || 1;

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
                    {/* Left: Image + Basic Info */}
                    <div className="col-span-12 lg:col-span-4">
                        <div className="relative">
                            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 ring-2 ring-zinc-700">
                                <img
                                    src={strain.imageUrl || PLACEHOLDER_IMG}
                                    alt={strain.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            {/* Type badge */}
                            <Badge className={cn(
                                "absolute top-4 left-4 text-sm px-3 py-1",
                                strain.type === 'Indica' && "bg-purple-500/80",
                                strain.type === 'Sativa' && "bg-orange-500/80",
                                strain.type === 'Hybrid' && "bg-emerald-500/80",
                            )}>
                                <Leaf className="w-3 h-3 mr-1" />
                                {strain.type}
                            </Badge>
                        </div>
                    </div>

                    {/* Right: Name + Price + Quick Stats */}
                    <div className="col-span-12 lg:col-span-8">
                        <div className="h-full flex flex-col">
                            {/* Name & Price */}
                            <div className="mb-6">
                                <h1 className="text-4xl font-bold text-white mb-2">{strain.name}</h1>
                                <div className="flex items-center gap-4">
                                    <span className="text-5xl font-black text-white">
                                        €{strain.currentPrice.toFixed(2)}
                                    </span>
                                    <div className={cn(
                                        "flex items-center gap-1 px-3 py-1.5 rounded-full text-lg font-bold",
                                        isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                                    )}>
                                        {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                        {isPositive ? '+' : ''}{strain.priceChange.toFixed(2)} ({strain.priceChangePercent.toFixed(1)}%)
                                    </div>
                                </div>

                                {/* THC/CBD */}
                                {(strain.thcMin || strain.thcMax) && (
                                    <div className="flex items-center gap-4 mt-3 text-sm text-zinc-400">
                                        <span>
                                            THC: <span className="text-white font-medium">
                                                {strain.thcMin || 0}% - {strain.thcMax || 0}%
                                            </span>
                                        </span>
                                        {(strain.cbdMin || strain.cbdMax) && (
                                            <span>
                                                CBD: <span className="text-white font-medium">
                                                    {strain.cbdMin || 0}% - {strain.cbdMax || 0}%
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Quick Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard
                                    icon={<Package className="w-5 h-5" />}
                                    label="Today's Orders"
                                    value={strain.todayOrders.toLocaleString()}
                                    color="emerald"
                                />
                                <StatCard
                                    icon={<BarChart3 className="w-5 h-5" />}
                                    label="Volume (30d)"
                                    value={`${(strain.totalVolume30Days / 1000).toFixed(1)}kg`}
                                    color="blue"
                                />
                                <StatCard
                                    icon={<Trophy className="w-5 h-5" />}
                                    label="Market Rank"
                                    value={`#${strain.currentRank}`}
                                    subValue={strain.previousRank > 0 ? (
                                        strain.currentRank < strain.previousRank
                                            ? `↑ from #${strain.previousRank}`
                                            : strain.currentRank > strain.previousRank
                                                ? `↓ from #${strain.previousRank}`
                                                : 'No change'
                                    ) : undefined}
                                    color="yellow"
                                />
                                <StatCard
                                    icon={<Flame className="w-5 h-5" />}
                                    label="Hot Streak"
                                    value={`${strain.streakDays} days`}
                                    color="orange"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Price Chart */}
                <Card className="bg-zinc-900/50 border-zinc-800 mb-8">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-emerald-400" />
                            30-Day Price History
                        </h3>

                        {chartData.length > 0 ? (
                            <div className="h-64 relative">
                                <svg viewBox="0 0 800 200" className="w-full h-full" preserveAspectRatio="none">
                                    {/* Grid lines */}
                                    <defs>
                                        <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.3" />
                                            <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0" />
                                        </linearGradient>
                                    </defs>

                                    {/* Area fill */}
                                    <path
                                        d={`
                                            M 0 ${200 - ((chartData[0]?.price || minPrice) - minPrice) / priceRange * 180}
                                            ${chartData.map((d, i) => {
                                            const x = (i / (chartData.length - 1)) * 800;
                                            const y = 200 - ((d.price - minPrice) / priceRange * 180) - 10;
                                            return `L ${x} ${y}`;
                                        }).join(' ')}
                                            L 800 200
                                            L 0 200
                                            Z
                                        `}
                                        fill="url(#priceGradient)"
                                    />

                                    {/* Line */}
                                    <path
                                        d={`
                                            M 0 ${200 - ((chartData[0]?.price || minPrice) - minPrice) / priceRange * 180 - 10}
                                            ${chartData.map((d, i) => {
                                            const x = (i / (chartData.length - 1)) * 800;
                                            const y = 200 - ((d.price - minPrice) / priceRange * 180) - 10;
                                            return `L ${x} ${y}`;
                                        }).join(' ')}
                                        `}
                                        fill="none"
                                        stroke={isPositive ? "#10b981" : "#ef4444"}
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />

                                    {/* Data points */}
                                    {chartData.map((d, i) => {
                                        const x = (i / (chartData.length - 1)) * 800;
                                        const y = 200 - ((d.price - minPrice) / priceRange * 180) - 10;
                                        return (
                                            <circle
                                                key={i}
                                                cx={x}
                                                cy={y}
                                                r="4"
                                                fill={isPositive ? "#10b981" : "#ef4444"}
                                                className="opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                                            />
                                        );
                                    })}
                                </svg>

                                {/* Y-axis labels */}
                                <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-zinc-500 pr-2">
                                    <span>€{maxPrice.toFixed(2)}</span>
                                    <span>€{((maxPrice + minPrice) / 2).toFixed(2)}</span>
                                    <span>€{minPrice.toFixed(2)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-zinc-500">
                                No historical data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <MetricCard
                        icon={<Target className="w-5 h-5" />}
                        label="Market Share"
                        value={`${strain.marketShare.toFixed(2)}%`}
                        description="Share of total orders"
                    />
                    <MetricCard
                        icon={<Zap className="w-5 h-5" />}
                        label="Trend Multiplier"
                        value={`${strain.trendMultiplier.toFixed(2)}x`}
                        description="Momentum indicator"
                    />
                    <MetricCard
                        icon={<Activity className="w-5 h-5" />}
                        label="Consistency"
                        value={`${strain.consistencyScore}%`}
                        description="Performance stability"
                    />
                    <MetricCard
                        icon={<Calendar className="w-5 h-5" />}
                        label="Avg Daily Orders"
                        value={strain.avg7DayOrders.toString()}
                        description="7-day average"
                    />
                </div>

                {/* Terpenes, Effects, Flavors */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Terpenes */}
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-6">
                            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
                                🧪 Terpenes
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {strain.terpenes.length > 0 ? strain.terpenes.map((terpene, i) => (
                                    <Badge key={i} variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
                                        {TERPENE_EMOJIS[terpene] || '🌿'} {terpene}
                                    </Badge>
                                )) : (
                                    <span className="text-zinc-500 text-sm">No terpene data</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Effects */}
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-6">
                            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
                                ✨ Effects
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {strain.effects.length > 0 ? strain.effects.map((effect, i) => (
                                    <Badge key={i} variant="outline" className="text-purple-400 border-purple-500/30 bg-purple-500/10 px-3 py-1">
                                        {EFFECT_EMOJIS[effect] || '✨'} {effect}
                                    </Badge>
                                )) : (
                                    <span className="text-zinc-500 text-sm">No effect data</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Flavors */}
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-6">
                            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
                                👅 Flavors
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {strain.flavors.length > 0 ? strain.flavors.map((flavor, i) => (
                                    <Badge key={i} variant="outline" className="text-orange-400 border-orange-500/30 bg-orange-500/10 px-3 py-1">
                                        {FLAVOR_EMOJIS[flavor] || '🍃'} {flavor}
                                    </Badge>
                                )) : (
                                    <span className="text-zinc-500 text-sm">No flavor data</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Description */}
                {strain.description && (
                    <Card className="bg-zinc-900/50 border-zinc-800 mb-8">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-white mb-3">About {strain.name}</h3>
                            <p className="text-zinc-400 leading-relaxed">{strain.description}</p>
                        </CardContent>
                    </Card>
                )}
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
                            {tradeModal.action === 'buy' ? 'Buy' : 'Sell'} {strain.name}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Current Price</span>
                            <span className="text-xl font-bold">€{strain.currentPrice.toFixed(2)}</span>
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
                            <span className="text-zinc-400">Total</span>
                            <span className="text-2xl font-bold text-white">
                                €{(strain.currentPrice * tradeModal.shares).toFixed(2)}
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

// Stat Card Component
function StatCard({ icon, label, value, subValue, color }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    subValue?: string;
    color: 'emerald' | 'blue' | 'yellow' | 'orange' | 'purple';
}) {
    const colorClasses = {
        emerald: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
        blue: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
        yellow: 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20',
        orange: 'bg-orange-500/10 text-orange-400 ring-orange-500/20',
        purple: 'bg-purple-500/10 text-purple-400 ring-purple-500/20',
    };

    return (
        <div className={cn(
            "rounded-xl p-4 ring-1",
            colorClasses[color]
        )}>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs uppercase tracking-wide opacity-80">{label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
            {subValue && <div className="text-xs mt-1 opacity-70">{subValue}</div>}
        </div>
    );
}

// Metric Card Component
function MetricCard({ icon, label, value, description }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    description: string;
}) {
    return (
        <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                    {icon}
                    <span className="text-sm">{label}</span>
                </div>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-zinc-500 mt-1">{description}</div>
            </CardContent>
        </Card>
    );
}
