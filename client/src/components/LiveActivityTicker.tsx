import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Flame, TrendingUp, Trophy, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

type ActivityItem = {
    id: string;
    type: string;
    message: string;
    timestamp: string;
    icon?: string | null;
};

export function LiveActivityTicker() {
    const [items, setItems] = useState<ActivityItem[]>([]);

    // Poll every 30 seconds
    const { data } = trpc.scoring.getLiveActivityFeed.useQuery(undefined, {
        refetchInterval: 30000,
    });

    useEffect(() => {
        if (data) {
            setItems(data);
        }
    }, [data]);

    if (!items.length) return null;

    return (
        <div className="w-full overflow-hidden bg-black/40 border-y border-white/5 py-2">
            <div className="flex items-center gap-2 px-4 mb-2">
                <div className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">
                    Live Activity
                </span>
            </div>

            <div className="relative flex w-full overflow-x-hidden">
                <div className="animate-marquee whitespace-nowrap flex items-center gap-8 py-1">
                    {/* Duplicate items to create seamless loop */}
                    {[...items, ...items].map((item, i) => (
                        <div
                            key={`${item.id}-${i}`}
                            className="inline-flex items-center gap-3 rounded-full bg-white/5 px-4 py-1.5 border border-white/5"
                        >
                            {item.type === 'prediction' ? (
                                <Avatar className="h-6 w-6 border border-white/10">
                                    <AvatarImage src={item.icon || undefined} />
                                    <AvatarFallback className="text-[10px] bg-weed-green text-black">
                                        <Zap className="h-3 w-3" />
                                    </AvatarFallback>
                                </Avatar>
                            ) : (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-weed-green/20 text-weed-green">
                                    {item.type.includes('manufacturer') ? (
                                        <TrendingUp className="h-3.5 w-3.5" />
                                    ) : (
                                        <Trophy className="h-3.5 w-3.5" />
                                    )}
                                </div>
                            )}
                            <span className="text-xs font-medium text-white/90">
                                {item.message}
                            </span>
                            <span className="text-[10px] text-white/40">
                                {formatTimeAgo(item.timestamp)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return 'today';
}
