import { trpc } from '@/lib/trpc';
import { useParams, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, TrendingUp, Trophy, ShoppingBag, ChevronLeft, Calendar, Share2 } from 'lucide-react';
import { ArticleSEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Helper to render text with markdown links
const renderContent = (text: string) => {
    const parts = text.split(/(\[.*?\]\(.*?\))/g);
    return parts.map((part, index) => {
        const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
        if (linkMatch) {
            return (
                <Link key={index} href={linkMatch[2]} className="text-weed-green hover:underline font-medium">
                    {linkMatch[1]}
                </Link>
            );
        }
        return <span key={index}>{part}</span>;
    });
};

// Helper to generate URL-friendly slug from headline
function generateSlug(headline: string): string {
    return headline
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 60);
}

export default function LeagueNewsArticle() {
    const params = useParams<{ date: string; slug: string }>();
    const { data: summary, isLoading } = trpc.dailySummary.getBySlug.useQuery(
        { date: params.date || '', slug: params.slug || '' },
        { enabled: !!params.date }
    );

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: summary?.headline || 'League News',
                    url,
                });
            } catch {
                // User cancelled or error
            }
        } else {
            await navigator.clipboard.writeText(url);
            toast.success('Link copied to clipboard!');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-weed-green" />
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="container mx-auto px-4 py-12 text-center">
                <h1 className="text-2xl font-bold mb-4 text-white">Article Not Found</h1>
                <p className="text-muted-foreground mb-6">
                    This daily recap doesn't exist or may have been removed.
                </p>
                <Link
                    href="/news"
                    className="inline-flex items-center gap-2 text-weed-green hover:underline"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to League News
                </Link>
            </div>
        );
    }

    const { headline, content, stats, date } = summary;
    const typedStats = stats as {
        topManufacturers?: any[];
        topStrains?: any[];
        topPharmacies?: any[];
        topBrands?: any[];
    };

    const { topManufacturers, topStrains, topPharmacies, topBrands } = typedStats;
    const formattedDate = new Date(date).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    // Get preview for SEO description
    const seoDescription = content.split('\n\n')[0]?.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 160) || headline;

    return (
        <>
            <ArticleSEO
                headline={headline}
                description={seoDescription}
                date={date}
                url={`/news/${date}/${generateSlug(headline)}`}
            />
            <div className="container mx-auto px-4 py-6 max-w-4xl">
                {/* Breadcrumb Navigation */}
                <nav className="mb-6" aria-label="Breadcrumb">
                    <ol className="flex items-center gap-2 text-sm">
                        <li>
                            <Link href="/" className="text-white/50 hover:text-white transition-colors">
                                Home
                            </Link>
                        </li>
                        <li className="text-white/30">/</li>
                        <li>
                            <Link href="/news" className="text-white/50 hover:text-white transition-colors">
                                League News
                            </Link>
                        </li>
                        <li className="text-white/30">/</li>
                        <li className="text-white/70 truncate max-w-[200px]">
                            {headline}
                        </li>
                    </ol>
                </nav>

                {/* Article Header */}
                <header className="mb-8 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <Badge 
                            variant="outline" 
                            className="flex items-center gap-1.5 bg-white/5 border-white/20"
                        >
                            <Calendar className="h-3.5 w-3.5" />
                            <time dateTime={date}>{formattedDate}</time>
                        </Badge>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleShare}
                            className="text-white/60 hover:text-white"
                        >
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                        </Button>
                    </div>
                    
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
                        {headline}
                    </h1>
                    
                    <p className="text-lg text-white/60">
                        Daily recap from the Cannabis Fantasy League
                    </p>
                </header>

                {/* Main Content */}
                <Card className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border-white/10 mb-8">
                    <CardContent className="p-6 sm:p-8 text-lg leading-relaxed space-y-6 text-white/85">
                        {content.split('\n\n').map((paragraph: string, index: number) => (
                            <p key={index}>{renderContent(paragraph)}</p>
                        ))}
                    </CardContent>
                </Card>

                {/* Top Performers Grid */}
                <section className="mb-10">
                    <h2 className="text-xl font-bold text-white mb-4">Top Performers</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Manufacturers */}
                        <Card className="bg-white/5 border-white/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
                                    <Trophy className="h-4 w-4 text-yellow-500" />
                                    Top Manufacturers
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[180px] pr-4">
                                    <div className="space-y-3">
                                        {topManufacturers && topManufacturers.length > 0 ? (
                                            topManufacturers.map((m: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white/40 w-4 text-sm">{i + 1}</span>
                                                        <Link 
                                                            href={`/entity/manufacturer/${m.id}`} 
                                                            className="font-medium truncate max-w-[140px] text-white hover:text-weed-green transition-colors"
                                                        >
                                                            {m.name}
                                                        </Link>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-weed-green text-sm">{m.points} pts</div>
                                                        <div className="text-xs text-white/40">{m.sales}g</div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-white/40">No data available</p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Brands */}
                        <Card className="bg-white/5 border-white/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
                                    <ShoppingBag className="h-4 w-4 text-purple-500" />
                                    Top Brands
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[180px] pr-4">
                                    <div className="space-y-3">
                                        {topBrands && topBrands.length > 0 ? (
                                            topBrands.map((b: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white/40 w-4 text-sm">{i + 1}</span>
                                                        <Link 
                                                            href={`/entity/brand/${b.id}`} 
                                                            className="font-medium truncate max-w-[140px] text-white hover:text-weed-green transition-colors"
                                                        >
                                                            {b.name}
                                                        </Link>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-weed-green text-sm">{b.points} pts</div>
                                                        <div className="text-xs text-white/40">{b.sales}g</div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-white/40">No data available</p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Strains */}
                        <Card className="bg-white/5 border-white/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                    Top Strains
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[180px] pr-4">
                                    <div className="space-y-3">
                                        {topStrains && topStrains.length > 0 ? (
                                            topStrains.map((s: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white/40 w-4 text-sm">{i + 1}</span>
                                                        <Link 
                                                            href={`/entity/strain/${s.id}`} 
                                                            className="font-medium truncate max-w-[140px] text-white hover:text-weed-green transition-colors"
                                                        >
                                                            {s.name}
                                                        </Link>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-weed-green text-sm">{s.points} pts</div>
                                                        <div className="text-xs text-white/40">{s.orders}g</div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-white/40">No data available</p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Pharmacies */}
                        <Card className="bg-white/5 border-white/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
                                    <TrendingUp className="h-4 w-4 text-blue-500" />
                                    Top Pharmacies
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[180px] pr-4">
                                    <div className="space-y-3">
                                        {topPharmacies && topPharmacies.length > 0 ? (
                                            topPharmacies.map((p: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white/40 w-4 text-sm">{i + 1}</span>
                                                        <Link 
                                                            href={`/entity/pharmacy/${p.id}`} 
                                                            className="font-medium truncate max-w-[140px] text-white hover:text-weed-green transition-colors"
                                                        >
                                                            {p.name}
                                                        </Link>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-weed-green text-sm">{p.points} pts</div>
                                                        <div className="text-xs text-white/40">${(p.revenue / 100).toFixed(0)}</div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-white/40">No data available</p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Navigation Footer */}
                <footer className="border-t border-white/10 pt-6 flex items-center justify-between">
                    <Link
                        href="/news"
                        className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
                    >
                        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        All News
                    </Link>
                    <Link
                        href="/"
                        className="text-sm text-white/40 hover:text-white/70 transition-colors"
                    >
                        Back to Dashboard
                    </Link>
                </footer>
            </div>
        </>
    );
}


