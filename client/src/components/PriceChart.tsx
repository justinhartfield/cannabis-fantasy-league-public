import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PricePoint {
    date: string;
    open: number;
    close: number;
    high: number;
    low: number;
    volume: number;
    change: number;
    changePercent: number;
}

interface PriceChartProps {
    data: PricePoint[];
    height?: number;
    showLabels?: boolean;
}

export function PriceChart({ data, height = 120, showLabels = true }: PriceChartProps) {
    if (!data || data.length === 0) {
        return (
            <div
                className="flex items-center justify-center text-zinc-500 text-sm"
                style={{ height }}
            >
                No price history available
            </div>
        );
    }

    const prices = data.map(d => d.close);
    const min = Math.min(...prices) * 0.95;
    const max = Math.max(...prices) * 1.05;
    const range = max - min || 1;

    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const isPositive = lastPrice >= firstPrice;
    const totalChange = lastPrice - firstPrice;
    const totalChangePercent = (totalChange / firstPrice) * 100;

    // Create SVG path
    const pathWidth = 100;
    const pathHeight = height - 40; // Leave room for labels
    const points = prices.map((price, i) => {
        const x = (i / (prices.length - 1)) * pathWidth;
        const y = pathHeight - ((price - min) / range) * pathHeight;
        return `${x},${y}`;
    });

    const linePath = `M ${points.join(' L ')}`;
    const areaPath = `${linePath} L ${pathWidth},${pathHeight} L 0,${pathHeight} Z`;

    return (
        <div className="relative" style={{ height }}>
            {/* Chart */}
            <svg
                viewBox={`0 0 ${pathWidth} ${pathHeight}`}
                className="w-full"
                style={{ height: pathHeight }}
                preserveAspectRatio="none"
            >
                {/* Gradient fill */}
                <defs>
                    <linearGradient id={`gradient-${isPositive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
                        <stop
                            offset="0%"
                            stopColor={isPositive ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"}
                            stopOpacity="0.3"
                        />
                        <stop
                            offset="100%"
                            stopColor={isPositive ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"}
                            stopOpacity="0"
                        />
                    </linearGradient>
                </defs>

                {/* Area fill */}
                <path
                    d={areaPath}
                    fill={`url(#gradient-${isPositive ? 'up' : 'down'})`}
                />

                {/* Line */}
                <path
                    d={linePath}
                    fill="none"
                    stroke={isPositive ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"}
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>

            {/* Labels */}
            {showLabels && (
                <div className="flex justify-between items-center mt-2 text-xs">
                    <div className="text-zinc-500">
                        {data[0]?.date}
                    </div>
                    <div className={cn(
                        "flex items-center gap-1 font-medium",
                        isPositive ? "text-emerald-400" : "text-red-400"
                    )}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {totalChangePercent >= 0 ? '+' : ''}{totalChangePercent.toFixed(1)}%
                    </div>
                    <div className="text-zinc-500">
                        {data[data.length - 1]?.date}
                    </div>
                </div>
            )}
        </div>
    );
}

// Mini spark line for stock cards
interface SparkLineProps {
    data: number[];
    positive?: boolean;
    width?: number;
    height?: number;
}

export function SparkLine({ data, positive = true, width = 60, height = 24 }: SparkLineProps) {
    if (!data || data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    });

    const path = `M ${points.join(' L ')}`;

    return (
        <svg width={width} height={height} className="inline-block">
            <path
                d={path}
                fill="none"
                stroke={positive ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"}
                strokeWidth="1.5"
            />
        </svg>
    );
}
