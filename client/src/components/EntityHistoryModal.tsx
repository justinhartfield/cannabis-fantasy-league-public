import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, Trophy, BarChart3 } from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    BarChart,
    Bar
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type EntityType = 'manufacturer' | 'pharmacy' | 'brand' | 'product' | 'strain';

interface EntityHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityType: EntityType;
    entityId: number;
    entityName: string;
    entityImage?: string | null;
}

export function EntityHistoryModal({
    isOpen,
    onClose,
    entityType,
    entityId,
    entityName,
    entityImage
}: EntityHistoryModalProps) {
    const { data, isLoading } = trpc.leaderboard.getEntityHistory.useQuery(
        {
            entityType,
            entityId,
            days: 30
        },
        {
            enabled: isOpen && !!entityId
        }
    );

    if (!isOpen) return null;

    // Handle both new (object) and old (array) response formats for robustness
    const rawHistory = data?.history;
    // If data is an array, it's the old format. If data.history is an array, it's the new format.
    const history = Array.isArray(rawHistory) ? rawHistory : (Array.isArray(data) ? data : []);

    const rawAverages = data?.dayOfWeekAverages;
    const dayOfWeekAverages = Array.isArray(rawAverages) ? rawAverages : [];

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
                    <p className="font-semibold mb-1">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color }} className="text-sm">
                            {entry.name}: {entry.value?.toLocaleString()}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const bestRank = history?.reduce((min: number, item: any) =>
        (item.rank && item.rank > 0 && item.rank < min) ? item.rank : min,
        9999
    );

    const currentScore = history && history.length > 0 ? history[history.length - 1].score : 0;
    const avgScore = history && history.length > 0
        ? Math.round(history.reduce((sum: number, item: any) => sum + item.score, 0) / history.length)
        : 0;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16 border-2 border-primary/20">
                            <AvatarImage src={entityImage || undefined} />
                            <AvatarFallback>{entityName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <DialogTitle className="text-2xl font-bold">{entityName}</DialogTitle>
                            <p className="text-muted-foreground capitalize">{entityType} Performance History</p>
                        </div>
                    </div>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : !history || history.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No history data available for this entity.
                    </div>
                ) : (
                    <div className="space-y-8 py-4">
                        {/* Description */}
                        {history.length > 0 && history[0].description && (
                            <div className="bg-card/50 p-4 rounded-xl border border-border">
                                <div className="prose prose-invert max-w-none text-sm text-muted-foreground">
                                    <div dangerouslySetInnerHTML={{ __html: history[0].description }} />
                                </div>
                            </div>
                        )}

                        {/* Key Metrics */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-card p-4 rounded-xl border border-border text-center">
                                <p className="text-sm text-muted-foreground mb-1">Current Score</p>
                                <p className="text-2xl font-bold text-primary">{currentScore.toLocaleString()}</p>
                            </div>
                            <div className="bg-card p-4 rounded-xl border border-border text-center">
                                <p className="text-sm text-muted-foreground mb-1">30-Day Avg</p>
                                <p className="text-2xl font-bold">{avgScore.toLocaleString()}</p>
                            </div>
                            <div className="bg-card p-4 rounded-xl border border-border text-center">
                                <p className="text-sm text-muted-foreground mb-1">Best Rank</p>
                                <div className="flex items-center justify-center gap-2">
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                    <p className="text-2xl font-bold">{bestRank === 9999 ? '-' : `#${bestRank}`}</p>
                                </div>
                            </div>
                        </div>

                        {/* Score History Chart */}
                        <div className="bg-card/50 p-4 rounded-xl border border-border">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                <h3 className="font-semibold">Score Trajectory</h3>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 12 }}
                                            tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Line
                                            type="monotone"
                                            dataKey="score"
                                            name="Daily Score"
                                            stroke="#a3ff12"
                                            strokeWidth={2}
                                            dot={{ r: 4, fill: "#a3ff12" }}
                                            activeDot={{ r: 6, fill: "#a3ff12" }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Average Score by Day Chart */}
                        <div className="bg-card/50 p-4 rounded-xl border border-border">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="w-5 h-5 text-blue-400" />
                                <h3 className="font-semibold">Average Score by Day</h3>
                            </div>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dayOfWeekAverages} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                        <XAxis
                                            dataKey="day"
                                            tick={{ fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
                                                            <p className="font-semibold mb-1">{label}</p>
                                                            <p className="text-sm text-primary">
                                                                Avg: {payload[0].value?.toLocaleString()} pts
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar
                                            dataKey="avgScore"
                                            fill="hsl(var(--primary))"
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={50}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Rank History Chart */}
                        <div className="bg-card/50 p-4 rounded-xl border border-border">
                            <div className="flex items-center gap-2 mb-4">
                                <Trophy className="w-5 h-5 text-yellow-500" />
                                <h3 className="font-semibold">Rank History</h3>
                            </div>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 12 }}
                                            tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        />
                                        <YAxis
                                            reversed
                                            tick={{ fontSize: 12 }}
                                            domain={[1, 'auto']}
                                            allowDecimals={false}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Line
                                            type="stepAfter"
                                            dataKey="rank"
                                            name="Rank"
                                            stroke="#eab308"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
