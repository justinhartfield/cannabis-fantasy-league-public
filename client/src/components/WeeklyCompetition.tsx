import React from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Trophy,
    Clock,
    Gift,
    Crown,
    Medal,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function WeeklyCompetition() {
    const { data: competition, isLoading } = trpc.stockMarket.getWeeklyStandings.useQuery({ limit: 5 });

    if (isLoading) {
        return (
            <Card className="bg-gradient-to-br from-violet-900/30 to-zinc-900 border-violet-500/30">
                <CardContent className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                </CardContent>
            </Card>
        );
    }

    if (!competition) return null;

    return (
        <Card className="bg-gradient-to-br from-violet-900/30 to-zinc-900 border-violet-500/30 overflow-hidden">
            {/* Header with countdown */}
            <CardHeader className="pb-3 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl" />
                <div className="flex items-center justify-between relative">
                    <CardTitle className="text-lg flex items-center gap-2 text-white">
                        <Trophy className="w-5 h-5 text-violet-400" />
                        Weekly Competition
                    </CardTitle>
                    <Badge variant="outline" className="border-violet-500/50 text-violet-300 bg-violet-500/10">
                        <Clock className="w-3 h-3 mr-1" />
                        {competition.daysRemaining}d left
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Prizes */}
                <div className="flex justify-around p-3 bg-black/30 rounded-lg">
                    {competition.prizes.map((prize, i) => (
                        <div key={i} className="text-center">
                            <div className="text-2xl mb-1">{prize.emoji}</div>
                            <div className="text-xs text-violet-300 font-medium">
                                {prize.points.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-zinc-500">BudsRewards</div>
                        </div>
                    ))}
                </div>

                {/* Standings */}
                <div className="space-y-2">
                    {competition.standings.map((player, i) => (
                        <div
                            key={i}
                            className={cn(
                                "flex items-center justify-between p-2 rounded-lg transition-all",
                                i === 0 ? "bg-gradient-to-r from-yellow-500/20 to-transparent border border-yellow-500/30" :
                                    i === 1 ? "bg-gradient-to-r from-zinc-400/20 to-transparent border border-zinc-400/30" :
                                        i === 2 ? "bg-gradient-to-r from-orange-500/20 to-transparent border border-orange-500/30" :
                                            "bg-zinc-800/30"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                    i === 0 ? "bg-yellow-500 text-yellow-900" :
                                        i === 1 ? "bg-zinc-400 text-zinc-900" :
                                            i === 2 ? "bg-orange-500 text-orange-900" :
                                                "bg-zinc-700 text-zinc-300"
                                )}>
                                    {player.rank}
                                </span>
                                <span className="text-sm text-white">User #{player.userId}</span>
                            </div>

                            <div className="text-right">
                                <div className={cn(
                                    "text-sm font-medium flex items-center gap-1",
                                    player.profitLoss >= 0 ? "text-emerald-400" : "text-red-400"
                                )}>
                                    {player.profitLoss >= 0 ? (
                                        <ArrowUpRight className="w-3 h-3" />
                                    ) : (
                                        <ArrowDownRight className="w-3 h-3" />
                                    )}
                                    {player.profitLoss >= 0 ? '+' : ''}{Math.round(player.profitLoss)} pts
                                </div>
                                <div className="text-[10px] text-zinc-500">
                                    {player.trades} trades • {player.winRate.toFixed(0)}% win
                                </div>
                            </div>
                        </div>
                    ))}

                    {competition.standings.length === 0 && (
                        <div className="text-center py-4 text-zinc-500 text-sm">
                            No traders yet this week
                        </div>
                    )}
                </div>

                {/* CTA */}
                <div className="text-center text-xs text-zinc-500 pt-2 border-t border-zinc-800">
                    <Gift className="w-4 h-4 inline mr-1" />
                    Top 3 win BudsRewards points every Sunday!
                </div>
            </CardContent>
        </Card>
    );
}
