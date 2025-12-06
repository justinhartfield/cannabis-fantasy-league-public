import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface FlipDigitProps {
    digit: string;
    delay?: number;
}

function FlipDigit({ digit, delay = 0 }: FlipDigitProps) {
    const [displayDigit, setDisplayDigit] = useState(digit);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (digit !== displayDigit) {
            setIsAnimating(true);

            const timer = setTimeout(() => {
                setDisplayDigit(digit);
                setTimeout(() => setIsAnimating(false), 200);
            }, delay);

            return () => clearTimeout(timer);
        }
    }, [digit, delay, displayDigit]);

    return (
        <div className="relative w-[0.7em] h-[1.2em] bg-zinc-800 rounded-sm overflow-hidden">
            {/* Single digit display */}
            <div
                className={cn(
                    "absolute inset-0 flex items-center justify-center text-white font-mono font-bold transition-all duration-200",
                    isAnimating && "animate-digit-roll"
                )}
            >
                {displayDigit}
            </div>

            {/* Subtle horizontal line for texture */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-700/50" />

            {/* Flash overlay on change */}
            {isAnimating && (
                <div className="absolute inset-0 bg-emerald-500/30 animate-pulse" />
            )}
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
    const digits = Math.round(value).toString().split('');

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
                    delay={i * 30}
                />
            ))}
            {suffix && (
                <span className="ml-1 text-zinc-400 font-normal text-[0.5em]">{suffix}</span>
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
