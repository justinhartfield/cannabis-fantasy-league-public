import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";

interface Stock {
    assetType: string;
    assetId: number;
    assetName: string;
    imageUrl?: string | null;
    closePrice: number;
    priceChange: number;
    priceChangePercent: number;
    volume: number;
}

interface LiveTickerProps {
    stocks: Stock[];
    speed?: number;
}

export function LiveTicker({ stocks, speed = 50 }: LiveTickerProps) {
    if (!stocks || stocks.length === 0) return null;

    // Only show top 20 stocks in ticker
    const topStocks = stocks.slice(0, 20);
    const tickerStocks = [...topStocks, ...topStocks];

    return (
        <div className="relative overflow-hidden bg-black border-b border-zinc-800 h-10">
            {/* Live indicator */}
            <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-3 bg-black">
                <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-red-400">LIVE</span>
                </div>
            </div>

            {/* Scrolling ticker */}
            <div
                className="flex items-center h-full animate-ticker whitespace-nowrap"
                style={{ paddingLeft: '70px' }}
            >
                {tickerStocks.map((stock, i) => {
                    const isUp = stock.priceChange >= 0;
                    // Get short name (first 8 chars)
                    const shortName = stock.assetName.length > 10
                        ? stock.assetName.substring(0, 8) + '..'
                        : stock.assetName;

                    return (
                        <span key={`${stock.assetId}-${i}`} className="inline-flex items-center gap-1.5 px-4">
                            <span className="text-xs text-zinc-400">{shortName}</span>
                            <span className={cn(
                                "text-xs font-semibold",
                                isUp ? "text-emerald-400" : "text-red-400"
                            )}>
                                €{stock.closePrice.toFixed(2)}
                            </span>
                            <span className={cn(
                                "text-[10px]",
                                isUp ? "text-emerald-500" : "text-red-500"
                            )}>
                                {isUp ? '▲' : '▼'}{Math.abs(stock.priceChangePercent).toFixed(1)}%
                            </span>
                        </span>
                    );
                })}
            </div>

            {/* Gradient fade on right */}
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black to-transparent z-10" />

            <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker ${topStocks.length * 3}s linear infinite;
        }
      `}</style>
        </div>
    );
}


// Heat map visualization
interface HeatMapProps {
    stocks: Stock[];
    onSelect: (stock: Stock) => void;
}

export function StockHeatMap({ stocks, onSelect }: HeatMapProps) {
    if (!stocks || stocks.length === 0) return null;

    // Sort by volume and take top performers
    const sortedStocks = [...stocks].sort((a, b) => b.volume - a.volume);
    const maxVolume = Math.max(...sortedStocks.map(s => s.volume));

    return (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1 p-4">
            {sortedStocks.map((stock) => {
                const isPositive = stock.priceChange >= 0;
                const intensity = Math.min(1, (stock.volume / maxVolume) * 2);
                const size = 0.6 + (stock.volume / maxVolume) * 0.4;

                return (
                    <button
                        key={`${stock.assetType}-${stock.assetId}`}
                        onClick={() => onSelect(stock)}
                        className={cn(
                            "relative aspect-square rounded-lg overflow-hidden transition-all duration-300",
                            "hover:scale-110 hover:z-10 hover:shadow-lg cursor-pointer",
                            isPositive
                                ? "hover:shadow-emerald-500/30"
                                : "hover:shadow-red-500/30"
                        )}
                        style={{
                            background: isPositive
                                ? `rgba(16, 185, 129, ${0.2 + intensity * 0.6})`
                                : `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`,
                            transform: `scale(${size})`,
                        }}
                    >
                        {/* Image or initials */}
                        {stock.imageUrl ? (
                            <img
                                src={stock.imageUrl}
                                alt=""
                                className="w-full h-full object-cover opacity-60"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <span className="text-xs font-bold text-white/80">
                                    {stock.assetName.substring(0, 2).toUpperCase()}
                                </span>
                            </div>
                        )}

                        {/* Overlay with price change */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className={cn(
                                "text-[10px] font-bold",
                                isPositive ? "text-emerald-300" : "text-red-300"
                            )}>
                                {isPositive ? '+' : ''}{stock.priceChangePercent.toFixed(0)}%
                            </span>
                        </div>

                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-20">
                            {stock.assetName}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

// Live price animation component
interface LivePriceProps {
    price: number;
    previousPrice?: number;
}

export function LivePrice({ price, previousPrice }: LivePriceProps) {
    const [flash, setFlash] = useState<'up' | 'down' | null>(null);
    const prevRef = useRef(price);

    useEffect(() => {
        if (price !== prevRef.current) {
            setFlash(price > prevRef.current ? 'up' : 'down');
            prevRef.current = price;

            const timer = setTimeout(() => setFlash(null), 500);
            return () => clearTimeout(timer);
        }
    }, [price]);

    return (
        <span className={cn(
            "transition-colors duration-300",
            flash === 'up' && "text-emerald-400 bg-emerald-500/20",
            flash === 'down' && "text-red-400 bg-red-500/20",
            !flash && "text-white"
        )}>
            €{price.toFixed(2)}
        </span>
    );
}

// Market overview stats
interface MarketOverviewProps {
    stocks: Stock[];
}

export function MarketOverview({ stocks }: MarketOverviewProps) {
    if (!stocks || stocks.length === 0) return null;

    const gainers = stocks.filter(s => s.priceChange > 0).length;
    const losers = stocks.filter(s => s.priceChange < 0).length;
    const unchanged = stocks.filter(s => s.priceChange === 0).length;

    const totalVolume = stocks.reduce((sum, s) => sum + s.volume, 0);
    const avgChange = stocks.reduce((sum, s) => sum + s.priceChangePercent, 0) / stocks.length;

    const topGainer = [...stocks].sort((a, b) => b.priceChangePercent - a.priceChangePercent)[0];
    const topLoser = [...stocks].sort((a, b) => a.priceChangePercent - b.priceChangePercent)[0];

    return (
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Market Overview</h3>
                <div className="flex items-center gap-1 text-xs">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <span className="text-zinc-400">{totalVolume.toLocaleString()} orders</span>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Gainers vs Losers */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="text-lg font-bold text-emerald-400">{gainers}</span>
                        </div>
                        <span className="text-zinc-500">/</span>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span className="text-lg font-bold text-red-400">{losers}</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 uppercase">Gainers / Losers</p>
                </div>

                {/* Market Sentiment */}
                <div className="space-y-1">
                    <div className={cn(
                        "text-lg font-bold flex items-center gap-1",
                        avgChange >= 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                        {avgChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(1)}%
                    </div>
                    <p className="text-[10px] text-zinc-500 uppercase">Avg Change</p>
                </div>

                {/* Top Gainer */}
                {topGainer && (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            {topGainer.imageUrl && (
                                <img src={topGainer.imageUrl} alt="" className="w-5 h-5 rounded-full" />
                            )}
                            <span className="text-sm font-medium text-white truncate max-w-[80px]">
                                {topGainer.assetName}
                            </span>
                            <span className="text-emerald-400 text-sm font-bold">
                                +{topGainer.priceChangePercent.toFixed(1)}%
                            </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 uppercase">🚀 Top Gainer</p>
                    </div>
                )}

                {/* Top Loser */}
                {topLoser && (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            {topLoser.imageUrl && (
                                <img src={topLoser.imageUrl} alt="" className="w-5 h-5 rounded-full" />
                            )}
                            <span className="text-sm font-medium text-white truncate max-w-[80px]">
                                {topLoser.assetName}
                            </span>
                            <span className="text-red-400 text-sm font-bold">
                                {topLoser.priceChangePercent.toFixed(1)}%
                            </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 uppercase">📉 Top Loser</p>
                    </div>
                )}
            </div>
        </div>
    );
}
