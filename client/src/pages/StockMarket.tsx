import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Loader2,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Briefcase,
    BarChart3,
    Search,
    ArrowUpRight,
    ArrowDownRight,
    Leaf,
    Factory,
    Package,
    Trophy,
    Zap,
    Sparkles,
    Star,
    Bell,
    Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { WeeklyCompetition } from "@/components/WeeklyCompetition";
import { LiveTicker, MarketOverview, StockHeatMap, HistoricalMarketOverview } from "@/components/LiveTrading";
import { FlipScore } from "@/components/FlipScore";

// Placeholder image for stocks without thumbnails
const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=100&h=100&fit=crop";

interface StockCardProps {
    assetType: string;
    assetId: number;
    assetName: string;
    closePrice: number;
    priceChange: number;
    priceChangePercent: number;
    volume: number;
    imageUrl?: string;
    isOnWatchlist?: boolean;
    onTrade: (action: 'buy' | 'sell') => void;
    onToggleWatchlist?: () => void;
    onCreateAlert?: () => void;
}

function StockCard({
    assetId,
    assetName,
    closePrice,
    priceChange,
    priceChangePercent,
    volume,
    imageUrl,
    isOnWatchlist,
    onTrade,
    onToggleWatchlist,
    onCreateAlert,
}: StockCardProps) {
    const isPositive = priceChange >= 0;

    return (
        <Card className="bg-zinc-900/80 border-zinc-800 hover:border-emerald-500/50 transition-all">
            <CardContent className="p-4">
                {/* Top row: Image + Actions + Price */}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                            <img
                                src={imageUrl || PLACEHOLDER_IMG}
                                alt={assetName}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {/* Quick action buttons */}
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={onToggleWatchlist}
                                className={cn(
                                    "p-1 rounded transition-colors",
                                    isOnWatchlist
                                        ? "text-yellow-400 bg-yellow-500/20"
                                        : "text-zinc-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                                )}
                                title={isOnWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                            >
                                <Star className={cn("w-4 h-4", isOnWatchlist && "fill-current")} />
                            </button>
                            <button
                                onClick={onCreateAlert}
                                className="p-1 rounded text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                title="Set price alert"
                            >
                                <Bell className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-bold text-white">{Math.round(closePrice)}</div>
                        <div className={cn(
                            "text-sm font-medium",
                            isPositive ? "text-emerald-400" : "text-red-400"
                        )}>
                            {isPositive ? '▲' : '▼'} {Math.abs(priceChangePercent).toFixed(1)}%
                        </div>
                    </div>
                </div>

                {/* Name - full width */}
                <h3 className="text-base font-semibold text-white mb-3 leading-tight">
                    {assetName}
                </h3>

                {/* Buy Button */}
                <Button
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-9"
                    onClick={() => onTrade('buy')}
                >
                    <TrendingUp className="w-4 h-4 mr-1.5" />
                    Buy
                </Button>
            </CardContent>
        </Card>
    );
}


interface HoldingCardProps {
    holding: {
        assetType: string;
        assetId: number;
        assetName: string;
        shares: number;
        avgBuyPrice: number;
        currentPrice: number;
        currentValue: number;
        profitLoss: number;
        profitLossPercent: number;
    };
    onSell: () => void;
}

function HoldingCard({ holding, onSell }: HoldingCardProps) {
    const isPositive = holding.profitLoss >= 0;

    // Truncate name
    const shortName = holding.assetName.length > 12
        ? holding.assetName.substring(0, 10) + '..'
        : holding.assetName;

    return (
        <div className="p-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-white text-xs truncate max-w-[100px]">{shortName}</span>
                <span className={cn(
                    "text-xs font-bold",
                    isPositive ? "text-emerald-400" : "text-red-400"
                )}>
                    {isPositive ? '+' : ''}{holding.profitLoss.toFixed(0)} pts
                </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <span>{holding.shares.toFixed(0)} shares @ {Math.round(holding.avgBuyPrice)} pts</span>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 px-2 text-[10px] text-zinc-400 hover:text-red-400"
                    onClick={onSell}
                >
                    SELL
                </Button>
            </div>
        </div>
    );
}

export default function StockMarket() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    const [searchQuery, setSearchQuery] = useState("");
    const [assetTypeFilter, setAssetTypeFilter] = useState<'strain' | 'manufacturer' | 'pharmacy'>('strain');
    const [sortBy, setSortBy] = useState<'score' | 'change' | 'name'>('score');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [tradeModal, setTradeModal] = useState<{
        open: boolean;
        action: 'buy' | 'sell';
        asset?: any;
        shares: number;
    }>({ open: false, action: 'buy', shares: 1 });

    // Fetch portfolio
    const { data: portfolio, isLoading: portfolioLoading, refetch: refetchPortfolio } =
        trpc.stockMarket.getPortfolio.useQuery(undefined, { enabled: !!user });

    // Fetch stocks based on selected asset type
    const { data: stocks = [], isLoading: stocksLoading, refetch: refetchStocks } =
        trpc.stockMarket.getStocks.useQuery({
            assetType: assetTypeFilter,
            limit: 100,
            sortBy: 'volume',
        }, {
            refetchInterval: 30000,
        });

    // Fetch leaderboard
    const { data: leaderboard = [] } =
        trpc.stockMarket.getLeaderboard.useQuery({ period: 'alltime', limit: 10 });

    // Buy mutation
    const buyMutation = trpc.stockMarket.buy.useMutation({
        onSuccess: (data) => {
            toast.success(data.message);
            refetchPortfolio();
            setTradeModal({ open: false, action: 'buy', shares: 1 });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // Sell mutation
    const sellMutation = trpc.stockMarket.sell.useMutation({
        onSuccess: (data) => {
            toast.success(data.message);
            refetchPortfolio();
            setTradeModal({ open: false, action: 'sell', shares: 1 });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleTrade = () => {
        if (!tradeModal.asset) return;

        const params = {
            assetType: tradeModal.asset.assetType,
            assetId: tradeModal.asset.assetId,
            shares: tradeModal.shares,
        };

        if (tradeModal.action === 'buy') {
            buyMutation.mutate(params);
        } else {
            sellMutation.mutate(params);
        }
    };

    const openTradeModal = (action: 'buy' | 'sell', asset: any) => {
        setTradeModal({ open: true, action, asset, shares: 1 });
    };

    // ============ WATCHLIST ============
    const { data: watchlist = [], refetch: refetchWatchlist } =
        trpc.stockMarket.getWatchlist.useQuery(undefined, { enabled: !!user });

    const watchlistIds = new Set(watchlist.map(w => `${w.assetType}-${w.assetId}`));

    const addToWatchlistMutation = trpc.stockMarket.addToWatchlist.useMutation({
        onSuccess: (data) => {
            toast.success(data.message);
            refetchWatchlist();
        },
        onError: (err) => toast.error(err.message),
    });

    const removeFromWatchlistMutation = trpc.stockMarket.removeFromWatchlist.useMutation({
        onSuccess: (data) => {
            toast.success(data.message);
            refetchWatchlist();
        },
        onError: (err) => toast.error(err.message),
    });

    const toggleWatchlist = (assetType: string, assetId: number) => {
        const key = `${assetType}-${assetId}`;
        if (watchlistIds.has(key)) {
            removeFromWatchlistMutation.mutate({ assetType: assetType as any, assetId });
        } else {
            addToWatchlistMutation.mutate({ assetType: assetType as any, assetId });
        }
    };

    // ============ ALERTS ============
    const [alertModal, setAlertModal] = useState<{
        open: boolean;
        asset?: { assetType: string; assetId: number; assetName: string; currentScore: number };
        targetScore: number;
        direction: 'above' | 'below';
    }>({ open: false, targetScore: 0, direction: 'above' });

    const { data: alerts = [], refetch: refetchAlerts } =
        trpc.stockMarket.getAlerts.useQuery(undefined, { enabled: !!user });

    const createAlertMutation = trpc.stockMarket.createAlert.useMutation({
        onSuccess: (data) => {
            toast.success(data.message);
            refetchAlerts();
            setAlertModal({ open: false, targetScore: 0, direction: 'above' });
        },
        onError: (err) => toast.error(err.message),
    });

    const deleteAlertMutation = trpc.stockMarket.deleteAlert.useMutation({
        onSuccess: () => {
            toast.success('Alert deleted');
            refetchAlerts();
        },
        onError: (err) => toast.error(err.message),
    });

    const openAlertModal = (stock: any) => {
        setAlertModal({
            open: true,
            asset: {
                assetType: stock.assetType,
                assetId: stock.assetId,
                assetName: stock.assetName,
                currentScore: stock.closePrice,
            },
            targetScore: Math.round(stock.closePrice * 1.1), // Default 10% above
            direction: 'above',
        });
    };

    // Toggle sort
    const toggleSort = (column: 'score' | 'change' | 'name') => {
        if (sortBy === column) {
            setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(column);
            setSortDir(column === 'name' ? 'asc' : 'desc');
        }
    };

    // Sort and filter stocks
    const filteredStocks = [...stocks]
        .filter(s => s.assetName?.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            let compare = 0;
            switch (sortBy) {
                case 'score':
                    compare = a.closePrice - b.closePrice;
                    break;
                case 'change':
                    compare = a.priceChangePercent - b.priceChangePercent;
                    break;
                case 'name':
                    compare = a.assetName.localeCompare(b.assetName);
                    break;
            }
            return sortDir === 'desc' ? -compare : compare;
        });

    if (!user) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Card className="bg-zinc-900 border-zinc-800 p-8 text-center">
                    <Sparkles className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Cannabis Stock Market</h2>
                    <p className="text-zinc-400 mb-4">Sign in to start trading</p>
                    <Button className="bg-emerald-600 hover:bg-emerald-500">
                        Sign In
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Live Ticker Tape */}
            <LiveTicker stocks={stocks} speed={40} />

            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-900/20 via-zinc-900 to-zinc-900 border-b border-zinc-800">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Cannabis Stock Market</h1>
                                <p className="text-zinc-400 text-sm">Trade strains like stocks</p>
                            </div>
                        </div>

                        {/* Portfolio Summary */}
                        {portfolio && (
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-zinc-400 text-xs uppercase tracking-wide">Available Pts</p>
                                    <p className="text-lg font-bold text-white">{Math.round(portfolio.cashBalance)} pts</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-zinc-400 text-xs uppercase tracking-wide">Holdings Value</p>
                                    <p className="text-lg font-bold text-white">{Math.round(portfolio.holdingsValue)} pts</p>
                                </div>
                                <div className="text-right px-4 py-2 rounded-lg bg-zinc-800/50">
                                    <p className="text-zinc-400 text-xs uppercase tracking-wide">Total Score</p>
                                    <p className="text-xl font-bold text-emerald-400">{Math.round(portfolio.totalValue)} pts</p>
                                    <p className={cn(
                                        "text-xs",
                                        portfolio.totalProfitLoss >= 0 ? "text-emerald-400" : "text-red-400"
                                    )}>
                                        {portfolio.totalProfitLoss >= 0 ? "+" : ""}{Math.round(portfolio.totalProfitLoss)} pts
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Market Overview */}
            <div className="container mx-auto px-4 py-4 space-y-4">
                <MarketOverview stocks={stocks} />
                <HistoricalMarketOverview />
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-12 gap-6">
                    {/* Left: Portfolio & Holdings */}
                    <div className="col-span-12 lg:col-span-3">
                        <Card className="bg-zinc-900/50 border-zinc-800 mb-6">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2 text-white">
                                    <Briefcase className="w-5 h-5 text-emerald-500" />
                                    Your Holdings
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {portfolioLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                                    </div>
                                ) : portfolio?.holdings.length === 0 ? (
                                    <div className="text-center py-8 text-zinc-500">
                                        <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No holdings yet</p>
                                        <p className="text-xs">Start trading to build your portfolio</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {portfolio?.holdings.map((h, i) => (
                                            <HoldingCard
                                                key={i}
                                                holding={h}
                                                onSell={() => openTradeModal('sell', {
                                                    assetType: h.assetType,
                                                    assetId: h.assetId,
                                                    assetName: h.assetName,
                                                    closePrice: h.currentPrice,
                                                })}
                                            />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Leaderboard */}
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2 text-white">
                                    <Trophy className="w-5 h-5 text-yellow-500" />
                                    Top Traders
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {leaderboard.slice(0, 5).map((trader, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/50"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                                    i === 0 ? "bg-yellow-500 text-yellow-900" :
                                                        i === 1 ? "bg-zinc-400 text-zinc-900" :
                                                            i === 2 ? "bg-orange-600 text-orange-100" :
                                                                "bg-zinc-700 text-zinc-300"
                                                )}>
                                                    {trader.rank}
                                                </span>
                                                <span className="text-sm text-white">User #{trader.userId}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium text-emerald-400">
                                                    {Math.round(trader.totalValue)} pts
                                                </p>
                                                <p className={cn(
                                                    "text-xs",
                                                    trader.profitLoss >= 0 ? "text-emerald-400" : "text-red-400"
                                                )}>
                                                    {trader.profitLossPercent.toFixed(1)}%
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Weekly Competition */}
                        <WeeklyCompetition />
                    </div>

                    {/* Right: Stock Browser */}
                    <div className="col-span-12 lg:col-span-9">
                        {/* Asset Type Tabs */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setAssetTypeFilter('strain')}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                    assetTypeFilter === 'strain'
                                        ? "bg-emerald-600 text-white"
                                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                                )}
                            >
                                <Leaf className="w-4 h-4" />
                                Strains
                            </button>
                            <button
                                onClick={() => setAssetTypeFilter('manufacturer')}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                    assetTypeFilter === 'manufacturer'
                                        ? "bg-emerald-600 text-white"
                                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                                )}
                            >
                                <Factory className="w-4 h-4" />
                                Manufacturers
                            </button>
                            <button
                                onClick={() => setAssetTypeFilter('pharmacy')}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                    assetTypeFilter === 'pharmacy'
                                        ? "bg-emerald-600 text-white"
                                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                                )}
                            >
                                <Store className="w-4 h-4" />
                                Pharmacies
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <Input
                                    placeholder="Search stocks..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                                />
                            </div>
                        </div>

                        {/* Stock List */}
                        {stocksLoading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                            </div>
                        ) : filteredStocks.length === 0 ? (
                            <div className="text-center py-20 text-zinc-500">
                                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p className="text-lg">No stocks available</p>
                            </div>
                        ) : (
                            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
                                {/* Header - Clickable for sorting */}
                                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-zinc-800/50 text-xs text-zinc-400 uppercase tracking-wide">
                                    <div
                                        className="col-span-4 cursor-pointer hover:text-white flex items-center gap-1"
                                        onClick={() => toggleSort('name')}
                                    >
                                        {assetTypeFilter === 'strain' ? 'Strain' : assetTypeFilter === 'manufacturer' ? 'Manufacturer' : 'Pharmacy'}
                                        {sortBy === 'name' && (
                                            <span className="text-emerald-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </div>
                                    <div
                                        className="col-span-2 text-right cursor-pointer hover:text-white flex items-center justify-end gap-1"
                                        onClick={() => toggleSort('score')}
                                    >
                                        Score
                                        {sortBy === 'score' && (
                                            <span className="text-emerald-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </div>
                                    <div
                                        className="col-span-2 text-right cursor-pointer hover:text-white flex items-center justify-end gap-1"
                                        onClick={() => toggleSort('change')}
                                    >
                                        Change
                                        {sortBy === 'change' && (
                                            <span className="text-emerald-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </div>
                                    <div className="col-span-4 text-right">Actions</div>
                                </div>

                                {/* Rows */}
                                <div className="divide-y divide-zinc-800">
                                    {filteredStocks.map((stock) => {
                                        const isPositive = stock.priceChange >= 0;
                                        const isWatched = watchlistIds.has(`${stock.assetType}-${stock.assetId}`);
                                        return (
                                            <div
                                                key={`${stock.assetType}-${stock.assetId}`}
                                                className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-zinc-800/30 transition-colors"
                                            >
                                                {/* Asset Name + Image - Clickable */}
                                                <div
                                                    className="col-span-4 flex items-center gap-3 cursor-pointer group"
                                                    onClick={() => {
                                                        const route = stock.assetType === 'strain'
                                                            ? `/market/strain/${stock.assetId}`
                                                            : stock.assetType === 'manufacturer'
                                                                ? `/market/manufacturer/${stock.assetId}`
                                                                : `/market/pharmacy/${stock.assetId}`;
                                                        setLocation(route);
                                                    }}
                                                >
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 ring-1 ring-zinc-700 group-hover:ring-emerald-500/50 transition-all">
                                                        <img
                                                            src={stock.imageUrl || PLACEHOLDER_IMG}
                                                            alt={stock.assetName}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <span className="font-medium text-white truncate group-hover:text-emerald-400 transition-colors">
                                                        {stock.assetName}
                                                    </span>
                                                </div>

                                                {/* Score - Animated Flip Clock */}
                                                <div className="col-span-2 text-right">
                                                    <FlipScore value={stock.closePrice} size="sm" />
                                                </div>

                                                {/* Change */}
                                                <div className="col-span-2 text-right">
                                                    <span className={cn(
                                                        "text-sm font-medium",
                                                        isPositive ? "text-emerald-400" : "text-red-400"
                                                    )}>
                                                        {isPositive ? '▲' : '▼'} {Math.abs(stock.priceChangePercent).toFixed(1)}%
                                                    </span>
                                                </div>

                                                {/* Actions: Watchlist + Alert + Buy */}
                                                <div className="col-span-4 flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => toggleWatchlist(stock.assetType, stock.assetId)}
                                                        className={cn(
                                                            "p-1.5 rounded transition-colors",
                                                            isWatched
                                                                ? "text-yellow-400 bg-yellow-500/20"
                                                                : "text-zinc-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                                                        )}
                                                        title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
                                                    >
                                                        <Star className={cn("w-4 h-4", isWatched && "fill-current")} />
                                                    </button>
                                                    <button
                                                        onClick={() => openAlertModal(stock)}
                                                        className="p-1.5 rounded text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                                        title="Set price alert"
                                                    >
                                                        <Bell className="w-4 h-4" />
                                                    </button>
                                                    <Button
                                                        size="sm"
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white h-8 px-4"
                                                        onClick={() => openTradeModal('buy', stock)}
                                                    >
                                                        <TrendingUp className="w-3 h-3 mr-1" />
                                                        Buy
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
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
                            {tradeModal.action === 'buy' ? 'Buy' : 'Sell'} {tradeModal.asset?.assetName}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex justify-between items-center p-3 bg-zinc-800 rounded-lg">
                            <span className="text-zinc-400">Current Score</span>
                            <span className="text-lg font-bold">{Math.round(tradeModal.asset?.closePrice || 0)} pts</span>
                        </div>

                        <div>
                            <label className="text-sm text-zinc-400 mb-1 block">Number of Shares</label>
                            <Input
                                type="number"
                                min="1"
                                step="1"
                                value={tradeModal.shares}
                                onChange={(e) => setTradeModal(prev => ({ ...prev, shares: parseInt(e.target.value) || 1 }))}
                                className="bg-zinc-800 border-zinc-700 text-white text-lg"
                            />
                        </div>

                        <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg">
                            <span className="text-zinc-400">Total Score Cost</span>
                            <span className="text-xl font-bold text-emerald-400">
                                {Math.round((tradeModal.asset?.closePrice || 0) * tradeModal.shares)} pts
                            </span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setTradeModal(prev => ({ ...prev, open: false }))}
                            className="border-zinc-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleTrade}
                            disabled={buyMutation.isPending || sellMutation.isPending}
                            className={cn(
                                tradeModal.action === 'buy'
                                    ? "bg-emerald-600 hover:bg-emerald-500"
                                    : "bg-red-600 hover:bg-red-500"
                            )}
                        >
                            {(buyMutation.isPending || sellMutation.isPending) && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            {tradeModal.action === 'buy' ? 'Buy' : 'Sell'} Shares
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Alert Modal */}
            <Dialog open={alertModal.open} onOpenChange={(open) => setAlertModal(prev => ({ ...prev, open }))}>
                <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-emerald-400" />
                            Create Price Alert
                        </DialogTitle>
                    </DialogHeader>

                    {alertModal.asset && (
                        <div className="space-y-4 py-4">
                            <div className="flex justify-between items-center p-3 bg-zinc-800 rounded-lg">
                                <span className="text-zinc-400">Strain</span>
                                <span className="text-lg font-semibold text-white">{alertModal.asset.assetName}</span>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-zinc-800 rounded-lg">
                                <span className="text-zinc-400">Current Score</span>
                                <span className="text-lg font-bold text-emerald-400">{Math.round(alertModal.asset.currentScore)} pts</span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-zinc-400">Alert me when score goes</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setAlertModal(prev => ({ ...prev, direction: 'above' }))}
                                        className={cn(
                                            "flex-1 p-2 rounded-lg border transition-all",
                                            alertModal.direction === 'above'
                                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                                                : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                                        )}
                                    >
                                        ▲ Above
                                    </button>
                                    <button
                                        onClick={() => setAlertModal(prev => ({ ...prev, direction: 'below' }))}
                                        className={cn(
                                            "flex-1 p-2 rounded-lg border transition-all",
                                            alertModal.direction === 'below'
                                                ? "border-red-500 bg-red-500/20 text-red-400"
                                                : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                                        )}
                                    >
                                        ▼ Below
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-zinc-400 mb-1 block">Target Score</label>
                                <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={alertModal.targetScore}
                                    onChange={(e) => setAlertModal(prev => ({ ...prev, targetScore: parseInt(e.target.value) || 0 }))}
                                    className="bg-zinc-800 border-zinc-700 text-white text-lg"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setAlertModal({ open: false, targetScore: 0, direction: 'above' })}
                            className="border-zinc-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (alertModal.asset) {
                                    createAlertMutation.mutate({
                                        assetType: alertModal.asset.assetType as any,
                                        assetId: alertModal.asset.assetId,
                                        assetName: alertModal.asset.assetName,
                                        targetScore: alertModal.targetScore,
                                        direction: alertModal.direction,
                                    });
                                }
                            }}
                            disabled={createAlertMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-500"
                        >
                            {createAlertMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Alert
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
