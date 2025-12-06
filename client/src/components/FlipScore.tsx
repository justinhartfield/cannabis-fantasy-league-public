import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface FlipDigitProps {
    digit: string;
    delay?: number;
}

function FlipDigit({ digit, delay = 0 }: FlipDigitProps) {
    const [displayDigit, setDisplayDigit] = useState(digit);
    const [isFlipping, setIsFlipping] = useState(false);
    const [previousDigit, setPreviousDigit] = useState(digit);

    useEffect(() => {
        if (digit !== displayDigit) {
            setPreviousDigit(displayDigit);
            setIsFlipping(true);

            const timer = setTimeout(() => {
                setDisplayDigit(digit);
                setTimeout(() => setIsFlipping(false), 300);
            }, delay);

            return () => clearTimeout(timer);
        }
    }, [digit, delay, displayDigit]);

    return (
        <div className="relative w-[1.2em] h-[1.6em] overflow-hidden">
            {/* Background card */}
            <div className="absolute inset-0 bg-zinc-800 rounded-sm shadow-inner" />

            {/* Top half (static) */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-zinc-800 rounded-t-sm overflow-hidden border-b border-zinc-900">
                <span className="absolute inset-0 flex items-end justify-center pb-0 text-white font-mono font-bold leading-none">
                    {displayDigit}
                </span>
            </div>

            {/* Bottom half (static) */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-zinc-700 rounded-b-sm overflow-hidden">
                <span className="absolute inset-0 flex items-start justify-center pt-0 text-white font-mono font-bold leading-none">
                    {displayDigit}
                </span>
            </div>

            {/* Flipping top half */}
            {isFlipping && (
                <div
                    className="absolute inset-x-0 top-0 h-1/2 bg-zinc-800 rounded-t-sm overflow-hidden origin-bottom animate-flip-top"
                    style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
                >
                    <span className="absolute inset-0 flex items-end justify-center pb-0 text-white font-mono font-bold leading-none">
                        {previousDigit}
                    </span>
                </div>
            )}

            {/* Flipping bottom half */}
            {isFlipping && (
                <div
                    className="absolute inset-x-0 bottom-0 h-1/2 bg-zinc-700 rounded-b-sm overflow-hidden origin-top animate-flip-bottom"
                    style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
                >
                    <span className="absolute inset-0 flex items-start justify-center pt-0 text-white font-mono font-bold leading-none">
                        {displayDigit}
                    </span>
                </div>
            )}

            {/* Center line divider */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-900/50 z-10" />

            {/* Side shadows for 3D effect */}
            <div className="absolute inset-y-0 left-0 w-px bg-black/20" />
            <div className="absolute inset-y-0 right-0 w-px bg-black/20" />
        </div>
    );
}

interface FlipScoreProps {
    value: number;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    suffix?: string;
}

export function FlipScore({ value, className, size = 'md', suffix = '' }: FlipScoreProps) {
    const digits = Math.round(value).toString().padStart(1, '0').split('');

    const sizeClasses = {
        sm: 'text-lg',
        md: 'text-2xl',
        lg: 'text-4xl',
        xl: 'text-5xl',
    };

    return (
        <div className={cn("flex items-center gap-0.5", sizeClasses[size], className)}>
            {digits.map((digit, i) => (
                <FlipDigit
                    key={`pos-${digits.length - i}`}
                    digit={digit}
                    delay={i * 50} // Stagger animation
                />
            ))}
            {suffix && (
                <span className="ml-1 text-zinc-400 font-normal text-[0.6em]">{suffix}</span>
            )}
        </div>
    );
}

// Animated score with change indicator
interface AnimatedScoreTickerProps {
    score: number;
    change?: number;
    changePercent?: number;
    size?: 'sm' | 'md' | 'lg';
    showChange?: boolean;
}

export function AnimatedScoreTicker({
    score,
    change = 0,
    changePercent = 0,
    size = 'md',
    showChange = true
}: AnimatedScoreTickerProps) {
    const [flash, setFlash] = useState<'up' | 'down' | null>(null);
    const prevScore = useRef(score);

    useEffect(() => {
        if (score !== prevScore.current) {
            setFlash(score > prevScore.current ? 'up' : 'down');
            prevScore.current = score;

            const timer = setTimeout(() => setFlash(null), 600);
            return () => clearTimeout(timer);
        }
    }, [score]);

    const isPositive = change >= 0;

    const sizeConfig = {
        sm: { score: 'text-lg' as const, change: 'text-xs' },
        md: { score: 'text-2xl' as const, change: 'text-sm' },
        lg: { score: 'text-4xl' as const, change: 'text-base' },
    };

    return (
        <div className="flex flex-col">
            <div className={cn(
                "transition-all duration-300 rounded-lg px-2 py-1",
                flash === 'up' && "bg-emerald-500/20",
                flash === 'down' && "bg-red-500/20",
            )}>
                <FlipScore
                    value={score}
                    size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
                    suffix="pts"
                />
            </div>

            {showChange && (
                <div className={cn(
                    "flex items-center gap-1 mt-1",
                    sizeConfig[size].change,
                    isPositive ? "text-emerald-400" : "text-red-400"
                )}>
                    <span>{isPositive ? '▲' : '▼'}</span>
                    <span>{isPositive ? '+' : ''}{change}</span>
                    <span className="text-zinc-500">({changePercent.toFixed(1)}%)</span>
                </div>
            )}
        </div>
    );
}

export default FlipScore;
