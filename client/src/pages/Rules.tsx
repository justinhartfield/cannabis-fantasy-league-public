import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Trophy,
    Zap,
    Target,
    TrendingUp,
    Users,
    Medal,
    Leaf,
    Handshake,
    Package,
    Calendar,
    Clock,
    Award
} from "lucide-react";

export default function Rules() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8 pb-20">
            {/* Header */}
            <div className="text-center space-y-4 mb-12">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-weed-green to-weed-coral bg-clip-text text-transparent">
                    How to Play
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Master the market. Build your empire. Become a legend in the Cannabis Fantasy League.
                </p>
            </div>

            {/* Positions Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                    <Target className="w-8 h-8 text-weed-green" />
                    <h2 className="text-2xl font-bold">The 5 Pillars (Positions)</h2>
                </div>
                <p className="text-muted-foreground mb-6">
                    Every successful squad is built on five key positions. Understanding each is crucial to your strategy.
                </p>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="bg-card/50 border-weed-green/20">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-green-400" />
                                <CardTitle className="text-lg">Manufacturer</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                The heavy hitters. Scored on total sales volume, market share growth, and production consistency.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-weed-green/20">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Handshake className="w-5 h-5 text-yellow-400" />
                                <CardTitle className="text-lg">Pharmacy</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                The distribution network. Scored on order volume, revenue, and customer retention rates.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-weed-green/20">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Medal className="w-5 h-5 text-purple-400" />
                                <CardTitle className="text-lg">Brand</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                The reputation. Scored on user ratings, reviews, and sentiment analysis from the community.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-weed-green/20">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-red-400" />
                                <CardTitle className="text-lg">Product</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Specific SKUs. Scored on daily sales velocity and stock turnover. High risk, high reward.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-weed-green/20">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Leaf className="w-5 h-5 text-emerald-500" />
                                <CardTitle className="text-lg">Strain (Flower)</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                The genetics. Scored on popularity, search trends, and pharmacy availability.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Game Modes */}
            <section className="space-y-6 pt-8">
                <div className="flex items-center gap-3 mb-6">
                    <Trophy className="w-8 h-8 text-weed-coral" />
                    <h2 className="text-2xl font-bold">Game Modes</h2>
                </div>

                <Tabs defaultValue="daily" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="daily" className="text-lg py-3">Daily Challenge</TabsTrigger>
                        <TabsTrigger value="season" className="text-lg py-3">Season League</TabsTrigger>
                    </TabsList>

                    <TabsContent value="daily" className="space-y-6">
                        <Card className="border-weed-coral/20 bg-gradient-to-br from-weed-coral/5 to-transparent">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Zap className="w-6 h-6 text-weed-coral" />
                                    <CardTitle>Daily Challenge (Prediction Streak)</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <Clock className="w-4 h-4" /> Fast-Paced Action
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Make your picks every day before 8:00 AM. Results are calculated daily based on real-time market data.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4" /> Build Your Streak
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Correct predictions build your streak multiplier. The longer your streak, the more points you earn.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 p-4 rounded-lg bg-black/20 border border-white/10">
                                    <h4 className="font-semibold mb-2 text-weed-coral">How to Win</h4>
                                    <p className="text-sm">
                                        Maintain the longest active streak of correct predictions. Top the daily and weekly leaderboards to earn badges and rewards.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="season" className="space-y-6">
                        <Card className="border-weed-green/20 bg-gradient-to-br from-weed-green/5 to-transparent">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-6 h-6 text-weed-green" />
                                    <CardTitle>Season Long League</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <Users className="w-4 h-4" /> Draft Your Squad
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Join a league with friends. Draft a full roster of manufacturers, pharmacies, brands, and strains.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <Target className="w-4 h-4" /> Weekly Matchups
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Go head-to-head against other managers each week. Set your lineup, manage waivers, and make trades.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 p-4 rounded-lg bg-black/20 border border-white/10">
                                    <h4 className="font-semibold mb-2 text-weed-green">How to Win</h4>
                                    <p className="text-sm">
                                        Accumulate the most wins to make the playoffs. Win the playoff bracket to be crowned the Season Champion.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </section>

            {/* Scoring System */}
            <section className="space-y-6 pt-8">
                <div className="flex items-center gap-3 mb-6">
                    <Award className="w-8 h-8 text-yellow-500" />
                    <h2 className="text-2xl font-bold">Scoring System</h2>
                </div>

                <div className="grid gap-6">
                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold">Base Points</h3>
                        <p className="text-muted-foreground">
                            Points are awarded based on real-world performance metrics normalized to a 0-100 scale.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                            <li><span className="text-white font-medium">Sales Performance:</span> Points based on daily sales volume and revenue milestones.</li>
                            <li><span className="text-white font-medium">Customer Ratings:</span> Points awarded for high customer ratings and positive reviews.</li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold">Bonuses & Multipliers</h3>
                        <p className="text-muted-foreground">
                            Strategic bonuses can swing a matchup in your favor.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4 mt-2">
                            <div className="p-3 rounded-lg bg-card border border-border">
                                <span className="text-green-400 font-bold">Trend Bonus</span>
                                <p className="text-xs text-muted-foreground mt-1">
                                    +15% points for entities with &gt;20% week-over-week growth.
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-card border border-border">
                                <span className="text-blue-400 font-bold">Consistency Bonus</span>
                                <p className="text-xs text-muted-foreground mt-1">
                                    +10% points for maintaining rank for 4+ weeks.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
