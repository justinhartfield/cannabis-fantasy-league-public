import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { WeeklyCompetition } from "@/components/WeeklyCompetition";
import { LiveTicker, MarketOverview, StockHeatMap } from "@/components/LiveTrading";

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
    onTrade: (action: 'buy' | 'sell') => void;
}

function StockCard({
    assetType,
    assetId,
    assetName,
    closePrice,
    priceChange,
    priceChangePercent,
    volume,
    imageUrl,
    onTrade
}: StockCardProps) {
    const isPositive = priceChange >= 0;

    const typeIcon = {
        product: <Package className="w-4 h-4" />,
        strain: <Leaf className="w-4 h-4" />,
        manufacturer: <Factory className="w-4 h-4" />,
    }[assetType] || <Package className="w-4 h-4" />;

    const typeLabel = {
        product: "Stock",
        strain: "Fund",
        manufacturer: "Hedge Fund",
    }[assetType] || "Stock";

    return (
        <Card className="group relative overflow-hidden bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border-zinc-800 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
            {/* Glow effect */}
            <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                isPositive
                    ? "bg-gradient-to-br from-emerald-500/5 to-transparent"
                    : "bg-gradient-to-br from-red-500/5 to-transparent"
            )} />

            <CardContent className="p-4 relative">
                <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden ring-2 ring-zinc-700 group-hover:ring-emerald-500/50 transition-all">
                        <img
                            src={imageUrl || PLACEHOLDER_IMG}
                            alt={assetName}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                            <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-300">
                                {typeIcon}
                                <span>{typeLabel}</span>
                            </div>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate text-sm">{assetName}</h3>
                        <p className="text-zinc-500 text-xs">Vol: {volume.toLocaleString()}</p>

                        {/* Price */}
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg font-bold text-white">
                                €{closePrice.toFixed(2)}
                            </span>
                            <Badge
                                variant="outline"
                                className={cn(
                                    "text-xs px-1.5 py-0",
                                    isPositive
                                        ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                                        : "border-red-500/50 text-red-400 bg-red-500/10"
                                )}
                            >
                                {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                                {priceChangePercent.toFixed(1)}%
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Trade Buttons */}
                <div className="flex gap-2 mt-3">
                    <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
                        onClick={() => onTrade('buy')}
                    >
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Buy
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-zinc-700 hover:bg-zinc-800 text-xs h-8"
                        onClick={() => onTrade('sell')}
                    >
                        <TrendingDown className="w-3 h-3 mr-1" />
                        Sell
                    </Button>
                </div>
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
                    {isPositive ? '+' : ''}€{holding.profitLoss.toFixed(0)}
                </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <span>{holding.shares.toFixed(0)} × €{holding.avgBuyPrice.toFixed(2)}</span>
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
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAssetType, setSelectedAssetType] = useState<string>("all");
    const [tradeModal, setTradeModal] = useState<{
        open: boolean;
        action: 'buy' | 'sell';
        asset?: any;
        shares: number;
    }>({ open: false, action: 'buy', shares: 1 });

    // Fetch portfolio
    const { data: portfolio, isLoading: portfolioLoading, refetch: refetchPortfolio } =
        trpc.stockMarket.getPortfolio.useQuery(undefined, { enabled: !!user });

    // Fetch available stocks with auto-refresh every 30 seconds
    const { data: stocks = [], isLoading: stocksLoading, refetch: refetchStocks } =
        trpc.stockMarket.getStocks.useQuery({
            assetType: selectedAssetType === 'all' ? undefined : selectedAssetType as any,
            limit: 100, // Get more for ticker
            sortBy: 'volume',
        }, {
            refetchInterval: 30000, // Refresh every 30 seconds for "real-time" feel
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

    const filteredStocks = stocks.filter(s =>
        s.assetName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                                    <p className="text-zinc-400 text-xs uppercase tracking-wide">Cash</p>
                                    <p className="text-lg font-bold text-white">€{portfolio.cashBalance.toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-zinc-400 text-xs uppercase tracking-wide">Holdings</p>
                                    <p className="text-lg font-bold text-white">€{portfolio.holdingsValue.toFixed(2)}</p>
                                </div>
                                <div className="text-right px-4 py-2 rounded-lg bg-zinc-800/50">
                                    <p className="text-zinc-400 text-xs uppercase tracking-wide">Total Value</p>
                                    <p className="text-xl font-bold text-emerald-400">€{portfolio.totalValue.toFixed(2)}</p>
                                    <p className={cn(
                                        "text-xs",
                                        portfolio.totalProfitLoss >= 0 ? "text-emerald-400" : "text-red-400"
                                    )}>
                                        {portfolio.totalProfitLoss >= 0 ? "+" : ""}€{portfolio.totalProfitLoss.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Market Overview */}
            <div className="container mx-auto px-4 py-4">
                <MarketOverview stocks={stocks} />
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
                                                    €{trader.totalValue.toLocaleString()}
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

                            <Tabs value={selectedAssetType} onValueChange={setSelectedAssetType}>
                                <TabsList className="bg-zinc-900 border border-zinc-800">
                                    <TabsTrigger value="all" className="data-[state=active]:bg-emerald-600">
                                        All
                                    </TabsTrigger>
                                    <TabsTrigger value="product" className="data-[state=active]:bg-emerald-600">
                                        <Package className="w-4 h-4 mr-1" />
                                        Stocks
                                    </TabsTrigger>
                                    <TabsTrigger value="strain" className="data-[state=active]:bg-emerald-600">
                                        <Leaf className="w-4 h-4 mr-1" />
                                        Funds
                                    </TabsTrigger>
                                    <TabsTrigger value="manufacturer" className="data-[state=active]:bg-emerald-600">
                                        <Factory className="w-4 h-4 mr-1" />
                                        Hedge Funds
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Stock Grid */}
                        {stocksLoading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                            </div>
                        ) : filteredStocks.length === 0 ? (
                            <div className="text-center py-20 text-zinc-500">
                                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p className="text-lg">No stocks available</p>
                                <p className="text-sm">Check back later for market updates</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredStocks.map((stock, i) => (
                                    <StockCard
                                        key={`${stock.assetType}-${stock.assetId}`}
                                        assetType={stock.assetType}
                                        assetId={stock.assetId}
                                        assetName={stock.assetName || `Asset #${stock.assetId}`}
                                        closePrice={stock.closePrice}
                                        priceChange={stock.priceChange}
                                        priceChangePercent={stock.priceChangePercent}
                                        volume={stock.volume}
                                        imageUrl={stock.imageUrl || undefined}
                                        onTrade={(action) => openTradeModal(action, stock)}
                                    />
                                ))}
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
                            <span className="text-zinc-400">Current Price</span>
                            <span className="text-lg font-bold">€{tradeModal.asset?.closePrice?.toFixed(2)}</span>
                        </div>

                        <div>
                            <label className="text-sm text-zinc-400 mb-1 block">Number of Shares</label>
                            <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={tradeModal.shares}
                                onChange={(e) => setTradeModal(prev => ({ ...prev, shares: parseFloat(e.target.value) || 0 }))}
                                className="bg-zinc-800 border-zinc-700 text-white text-lg"
                            />
                        </div>

                        <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg">
                            <span className="text-zinc-400">Total Cost</span>
                            <span className="text-xl font-bold text-emerald-400">
                                €{((tradeModal.asset?.closePrice || 0) * tradeModal.shares).toFixed(2)}
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
        </div>
    );
}
