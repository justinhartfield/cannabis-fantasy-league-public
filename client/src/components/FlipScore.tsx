import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface FlipDigitProps {
    digit: string;
    delay?: number;
}

function FlipDigit({ digit, delay = 0 }: FlipDigitProps) {
    const [currentDigit, setCurrentDigit] = useState(digit);
    const [isFlipping, setIsFlipping] = useState(false);

    useEffect(() => {
        if (digit !== currentDigit) {
            const timer = setTimeout(() => {
                setIsFlipping(true);

                // Update digit halfway through
                setTimeout(() => {
                    setCurrentDigit(digit);
                }, 150);

                // End animation
                setTimeout(() => {
                    setIsFlipping(false);
                }, 300);
            }, delay);

            return () => clearTimeout(timer);
        }
    }, [digit, currentDigit, delay]);

    return (
        <div className="relative w-[0.65em] h-[1.1em] bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-sm overflow-hidden shadow-inner">
            {/* Main digit display */}
            <div className={cn(
                "absolute inset-0 flex items-center justify-center text-white font-mono font-bold transition-transform duration-150",
                isFlipping && "animate-digit-roll"
            )}>
                {currentDigit}
            </div>

            {/* Center divider line */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-700/50 pointer-events-none" />

            {/* Flash on change */}
            {isFlipping && (
                <div className="absolute inset-0 bg-emerald-500/20 animate-pulse pointer-events-none" />
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
    const prevValue = useRef(value);
    const [direction, setDirection] = useState<'up' | 'down' | null>(null);

    useEffect(() => {
        if (value !== prevValue.current) {
            setDirection(value > prevValue.current ? 'up' : 'down');
            prevValue.current = value;

            const timer = setTimeout(() => setDirection(null), 600);
            return () => clearTimeout(timer);
        }
    }, [value]);

    const sizeClasses = {
        sm: 'text-lg',
        md: 'text-2xl',
        lg: 'text-4xl',
        xl: 'text-5xl',
    };

    return (
        <div
            className={cn(
                "inline-flex items-center gap-[2px] p-1 rounded-md transition-all duration-300",
                direction === 'up' && "bg-emerald-500/10",
                direction === 'down' && "bg-red-500/10",
                sizeClasses[size],
                className
            )}
        >
            {digits.map((digit, i) => (
                <FlipDigit
                    key={`pos-${digits.length - i}`}
                    digit={digit}
                    delay={i * 40}
                />
            ))}
            {suffix && (
                <span className="ml-1 text-zinc-400 font-medium text-[0.4em]">{suffix}</span>
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
    const isPositive = change >= 0;

    const sizeConfig = {
        sm: { score: 'sm' as const, change: 'text-xs' },
        md: { score: 'md' as const, change: 'text-sm' },
        lg: { score: 'lg' as const, change: 'text-base' },
    };

    return (
        <div className="flex flex-col">
            <FlipScore
                value={score}
                size={sizeConfig[size].score}
                suffix="pts"
            />

            {showChange && (
                <div className={cn(
                    "flex items-center gap-1 mt-1",
                    sizeConfig[size].change,
                    isPositive ? "text-emerald-400" : "text-red-400"
                )}>
                    <span>{isPositive ? '▲' : '▼'}</span>
                    <span className="font-medium">{isPositive ? '+' : ''}{change}</span>
                    <span className="text-zinc-500">({changePercent.toFixed(1)}%)</span>
                </div>
            )}
        </div>
    );
}

export default FlipScore;
