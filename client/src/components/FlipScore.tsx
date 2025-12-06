import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface FlipDigitProps {
    digit: string;
    delay?: number;
}

function FlipDigit({ digit, delay = 0 }: FlipDigitProps) {
    const [currentDigit, setCurrentDigit] = useState(digit);
    const [prevDigit, setPrevDigit] = useState(digit);
    const [isFlipping, setIsFlipping] = useState(false);

    useEffect(() => {
        if (digit !== currentDigit) {
            const timer = setTimeout(() => {
                setPrevDigit(currentDigit);
                setIsFlipping(true);

                // Halfway through animation, swap the digit
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
        <div
            className="relative w-[0.65em] h-[1.1em] perspective-500"
            style={{ perspective: '500px' }}
        >
            {/* Background panel (static) */}
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-sm shadow-inner">
                {/* Bottom half - shows new digit */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 flex items-center justify-center overflow-hidden rounded-b-sm">
                    <span className="text-white font-mono font-bold translate-y-[-50%]">
                        {currentDigit}
                    </span>
                </div>
                {/* Top half - shows current digit */}
                <div className="absolute inset-x-0 top-0 h-1/2 flex items-center justify-center overflow-hidden rounded-t-sm bg-zinc-800">
                    <span className="text-white font-mono font-bold translate-y-[50%]">
                        {currentDigit}
                    </span>
                </div>
            </div>

            {/* Flipping top half */}
            {isFlipping && (
                <div
                    className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-zinc-700 to-zinc-800 rounded-t-sm origin-bottom overflow-hidden"
                    style={{
                        animation: 'flipTop 0.3s ease-in forwards',
                        transformStyle: 'preserve-3d',
                        backfaceVisibility: 'hidden',
                    }}
                >
                    <span className="absolute inset-0 flex items-center justify-center text-white font-mono font-bold translate-y-[50%]">
                        {prevDigit}
                    </span>
                </div>
            )}

            {/* Flipping bottom half (comes from top) */}
            {isFlipping && (
                <div
                    className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-b-sm origin-top overflow-hidden"
                    style={{
                        animation: 'flipBottom 0.3s ease-out 0.15s forwards',
                        transformStyle: 'preserve-3d',
                        backfaceVisibility: 'hidden',
                        transform: 'rotateX(90deg)',
                    }}
                >
                    <span className="absolute inset-0 flex items-center justify-center text-white font-mono font-bold translate-y-[-50%]">
                        {currentDigit}
                    </span>
                </div>
            )}

            {/* Center line */}
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-zinc-950 z-10" />

            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-sm" />
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
                "flex items-center gap-[2px] p-1 rounded-md transition-all duration-300",
                direction === 'up' && "bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
                direction === 'down' && "bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.2)]",
                sizeClasses[size],
                className
            )}
        >
            {digits.map((digit, i) => (
                <FlipDigit
                    key={`pos-${digits.length - i}`}
                    digit={digit}
                    delay={i * 50}
                />
            ))}
            {suffix && (
                <span className="ml-1.5 text-zinc-400 font-medium text-[0.4em]">{suffix}</span>
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
                    <span className={cn(
                        "transition-transform duration-200",
                        isPositive ? "animate-bounce-subtle" : ""
                    )}>
                        {isPositive ? '▲' : '▼'}
                    </span>
                    <span className="font-medium">{isPositive ? '+' : ''}{change}</span>
                    <span className="text-zinc-500">({changePercent.toFixed(1)}%)</span>
                </div>
            )}
        </div>
    );
}

export default FlipScore;
