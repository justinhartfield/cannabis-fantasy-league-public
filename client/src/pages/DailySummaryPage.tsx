import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '../lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Loader2, TrendingUp, TrendingDown, Trophy, ShoppingBag } from 'lucide-react';
import { Link } from 'wouter';

// Helper to render text with markdown links
const renderContent = (text: string) => {
    const parts = text.split(/(\[.*?\]\(.*?\))/g);
    return parts.map((part, index) => {
        const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
        if (linkMatch) {
            return (
                <Link key={index} href={linkMatch[2]} className="text-primary hover:underline font-medium">
                    {linkMatch[1]}
                </Link>
            );
        }
        return <span key={index}>{part}</span>;
    });
};

export default function DailySummaryPage() {
    const { data: summary, isLoading } = trpc.dailySummary.getLatest.useQuery();
    
    // Fetch fresh leaderboard data for correct entity links (fixes ID mismatches from stored stats)
    const { data: leaderboardData } = trpc.leaderboard.getDailyEntityLeaderboard.useQuery(
        { date: summary?.date || '', limit: 5 },
        { enabled: !!summary?.date }
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="container mx-auto p-4 text-center">
                <h1 className="text-2xl font-bold mb-4">Daily Summary</h1>
                <p className="text-muted-foreground">No summary available for today yet.</p>
            </div>
        );
    }

    const { headline, content } = summary;
    
    // Use fresh leaderboard data for correct entity links
    const topManufacturers = leaderboardData?.manufacturers?.slice(0, 5) || [];
    const topStrains = leaderboardData?.strains?.slice(0, 5) || [];
    const topPharmacies = leaderboardData?.pharmacies?.slice(0, 5) || [];
    const topBrands = leaderboardData?.brands?.slice(0, 5) || [];

    return (
        <div className="container mx-auto p-4 max-w-4xl space-y-8">
            {/* Header Section */}
            <div className="space-y-4 text-center">
                <Badge variant="outline" className="mb-2">
                    {new Date(summary.date).toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                </Badge>
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-primary">
                    {headline}
                </h1>
            </div>

            {/* Main Content */}
            <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                <CardContent className="p-6 text-lg leading-relaxed space-y-4">
                    {content.split('\n\n').map((paragraph: string, index: number) => (
                        <p key={index}>{renderContent(paragraph)}</p>
                    ))}
                </CardContent>
            </Card>

            {/* Top Performers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Manufacturers */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Trophy className="h-5 w-5 text-yellow-500" />
                            Top Manufacturers
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[200px] pr-4">
                            <div className="space-y-4">
                                {topManufacturers && topManufacturers.length > 0 ? (
                                    topManufacturers.map((m: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-muted-foreground w-4">{i + 1}</span>
                                                <Link href={`/entity/manufacturer/${m.id}`} className="font-medium truncate max-w-[120px] hover:text-primary hover:underline">
                                                    {m.name}
                                                </Link>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-primary">{m.score} pts</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No data available</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Brands */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ShoppingBag className="h-5 w-5 text-purple-500" />
                            Top Brands
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[200px] pr-4">
                            <div className="space-y-4">
                                {topBrands && topBrands.length > 0 ? (
                                    topBrands.map((b: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-muted-foreground w-4">{i + 1}</span>
                                                <Link href={`/entity/brand/${b.id}`} className="font-medium truncate max-w-[120px] hover:text-primary hover:underline">
                                                    {b.name}
                                                </Link>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-primary">{b.score} pts</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No data available</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Strains */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            Top Strains
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[200px] pr-4">
                            <div className="space-y-4">
                                {topStrains && topStrains.length > 0 ? (
                                    topStrains.map((s: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-muted-foreground w-4">{i + 1}</span>
                                                <Link href={`/entity/strain/${s.id}`} className="font-medium truncate max-w-[120px] hover:text-primary hover:underline">
                                                    {s.name}
                                                </Link>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-primary">{s.score} pts</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No data available</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Pharmacies */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="h-5 w-5 text-blue-500" />
                            Top Pharmacies
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[200px] pr-4">
                            <div className="space-y-4">
                                {topPharmacies && topPharmacies.length > 0 ? (
                                    topPharmacies.map((p: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-muted-foreground w-4">{i + 1}</span>
                                                <Link href={`/entity/pharmacy/${p.id}`} className="font-medium truncate max-w-[120px] hover:text-primary hover:underline">
                                                    {p.name}
                                                </Link>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-primary">{p.score} pts</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No data available</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
