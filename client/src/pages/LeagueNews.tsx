import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';
import { Loader2, Newspaper, Calendar, ArrowRight, ChevronRight } from 'lucide-react';
import { LeagueNewsSEO } from '@/components/SEO';

// Helper to generate URL-friendly slug from headline
function generateSlug(headline: string): string {
    return headline
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 60);
}

// Extract first paragraph as preview
function getPreview(content: string, maxLength = 160): string {
    const firstParagraph = content.split('\n\n')[0] || content;
    // Remove markdown links for preview
    const cleanText = firstParagraph.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.slice(0, maxLength).trim() + '...';
}

export default function LeagueNews() {
    const { data: summaries, isLoading } = trpc.dailySummary.getAll.useQuery();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-weed-green" />
            </div>
        );
    }

    const articles = summaries || [];

    return (
        <>
            <LeagueNewsSEO />
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <header className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-weed-green/20 to-emerald-500/20 border border-weed-green/30">
                            <Newspaper className="h-7 w-7 text-weed-green" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white sm:text-4xl">League News</h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                Daily recaps from the Cannabis Fantasy League
                            </p>
                        </div>
                    </div>
                    <p className="text-white/70 max-w-2xl">
                        Stay updated with daily market performance, top performers, and trending 
                        strains in the German medical cannabis market.
                    </p>
                </header>

                {/* Articles List */}
                {articles.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/20 p-12 text-center">
                        <Newspaper className="h-12 w-12 mx-auto text-white/30 mb-4" />
                        <p className="text-lg font-semibold text-white/70">No news yet</p>
                        <p className="text-sm text-white/50 mt-2">
                            Daily recaps will appear here once they're generated.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {articles.map((article, index) => {
                            const slug = generateSlug(article.headline);
                            const articleUrl = `/news/${article.date}/${slug}`;
                            const isLatest = index === 0;

                            return (
                                <Link key={article.id} href={articleUrl}>
                                    <article 
                                        className={`group relative rounded-2xl border transition-all duration-300 hover:scale-[1.01] cursor-pointer ${
                                            isLatest 
                                                ? 'bg-gradient-to-br from-indigo-900/60 to-purple-900/60 border-indigo-500/30 hover:border-indigo-400/50' 
                                                : 'bg-white/5 border-white/10 hover:border-weed-green/40 hover:bg-white/8'
                                        }`}
                                    >
                                        <div className="p-5 sm:p-6">
                                            {/* Date Badge */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-white/50" />
                                                    <time 
                                                        dateTime={article.date}
                                                        className="text-sm text-white/60"
                                                    >
                                                        {new Date(article.date).toLocaleDateString(undefined, {
                                                            weekday: 'long',
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric',
                                                        })}
                                                    </time>
                                                </div>
                                                {isLatest && (
                                                    <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-weed-green/20 text-weed-green rounded-full border border-weed-green/30">
                                                        Latest
                                                    </span>
                                                )}
                                            </div>

                                            {/* Headline */}
                                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 group-hover:text-weed-green transition-colors line-clamp-2">
                                                {article.headline}
                                            </h2>

                                            {/* Preview */}
                                            <p className="text-white/60 text-sm sm:text-base line-clamp-2 mb-4">
                                                {getPreview(article.content)}
                                            </p>

                                            {/* Read More */}
                                            <div className="flex items-center text-weed-green text-sm font-medium group-hover:gap-2 transition-all">
                                                <span>Read full recap</span>
                                                <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                                            </div>
                                        </div>

                                        {/* Decorative gradient overlay for latest */}
                                        {isLatest && (
                                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-weed-green/5 via-transparent to-purple-500/5 pointer-events-none" />
                                        )}
                                    </article>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* Back to Dashboard */}
                <div className="mt-10 text-center">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
                    >
                        <ArrowRight className="h-4 w-4 rotate-180" />
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        </>
    );
}




