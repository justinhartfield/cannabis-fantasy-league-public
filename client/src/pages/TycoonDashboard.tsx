import { useUser } from "@clerk/clerk-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    TrendingUp,
    Users,
    Package,
    Award,
    Plus,
    Minus,
    DollarSign,
    Crown,
    Sparkles,
    ChevronRight,
    Store,
    Leaf,
    ShoppingCart,
    BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/**
 * Dispensary Tycoon - Main Game Dashboard
 * Mobile-first design with rich animations
 */
export function TycoonDashboard() {
    const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
    const [activeTab, setActiveTab] = useState("dashboard");

    const { data: dispensaryData, isLoading, refetch } = trpc.tycoon.getMyDispensary.useQuery(undefined, {
        enabled: isClerkLoaded && !!clerkUser,
    });

    const createDispensary = trpc.tycoon.createDispensary.useMutation({
        onSuccess: () => {
            toast.success("🎉 Your dispensary is open for business!");
            refetch();
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    const collectEarnings = trpc.tycoon.collectIdleEarnings.useMutation({
        onSuccess: (data) => {
            if (data.collected && data.collected > 0) {
                toast.success(`💰 Collected $${(data.collected / 100).toFixed(2)}!`);
                refetch();
            }
        },
    });

    const simulateSales = trpc.tycoon.simulateSales.useMutation({
        onSuccess: (data) => {
            if (data.success && data.revenue && data.revenue > 0) {
                toast.success(`🛒 Made ${data.sales} sales for $${(data.revenue / 100).toFixed(2)}!`);
                refetch();
            } else {
                toast("No sales this round - try stocking more inventory!");
            }
        },
    });

    // Loading state
    if (!isClerkLoaded || isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <div className="w-16 h-16 mx-auto mb-4">
                        <Leaf className="w-full h-full text-green-400 animate-pulse" />
                    </div>
                    <p className="text-green-300 text-lg">Loading your empire...</p>
                </motion.div>
            </div>
        );
    }

    // Not logged in
    if (!clerkUser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-black/40 border-green-500/30 backdrop-blur-lg">
                    <CardHeader className="text-center">
                        <Store className="w-16 h-16 mx-auto text-green-400 mb-4" />
                        <CardTitle className="text-2xl text-white">Dispensary Tycoon</CardTitle>
                        <p className="text-green-300">Sign in to start building your cannabis empire!</p>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-6">
                            Sign In to Play
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // No dispensary yet - creation flow
    if (!dispensaryData?.hasDispensary) {
        return <CreateDispensaryFlow onSubmit={(name) => createDispensary.mutate({ name })} isLoading={createDispensary.isPending} />;
    }

    const { dispensary, inventory, staff, upgrades, rank } = dispensaryData;

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900">
            {/* Header with Revenue Ticker */}
            <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-lg border-b border-green-500/30">
                <div className="flex items-center justify-between px-4 py-3">
                    <div>
                        <h1 className="text-lg font-bold text-white">{dispensary?.name}</h1>
                        <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="border-green-500 text-green-400">
                                Level {dispensary?.level}
                            </Badge>
                            {rank && (
                                <Badge variant="outline" className="border-amber-500 text-amber-400">
                                    <Crown className="w-3 h-3 mr-1" />
                                    #{rank}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1 text-green-400 font-bold">
                            <DollarSign className="w-4 h-4" />
                            <span>{((dispensary?.cashBalance || 0) / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-purple-400 text-sm">
                            <Sparkles className="w-3 h-3" />
                            <span>{dispensary?.gemBalance} gems</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="pb-24">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsContent value="dashboard" className="p-4 space-y-4">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard
                                icon={<TrendingUp className="w-5 h-5" />}
                                label="Total Revenue"
                                value={`$${((dispensary?.totalRevenue || 0) / 100).toFixed(2)}`}
                                color="green"
                            />
                            <StatCard
                                icon={<Users className="w-5 h-5" />}
                                label="Customers"
                                value={dispensary?.totalCustomers?.toLocaleString() || "0"}
                                color="blue"
                            />
                            <StatCard
                                icon={<Package className="w-5 h-5" />}
                                label="Inventory"
                                value={`${inventory?.length || 0} strains`}
                                color="purple"
                            />
                            <StatCard
                                icon={<Award className="w-5 h-5" />}
                                label="Reputation"
                                value={dispensary?.reputation?.toString() || "100"}
                                color="amber"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={() => simulateSales.mutate()}
                                disabled={simulateSales.isPending}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 py-6"
                            >
                                <ShoppingCart className="w-5 h-5 mr-2" />
                                {simulateSales.isPending ? "Selling..." : "Simulate Sales"}
                            </Button>
                            <Button
                                onClick={() => collectEarnings.mutate()}
                                disabled={collectEarnings.isPending || (dispensary?.idleEarnings || 0) === 0}
                                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 py-6"
                            >
                                <DollarSign className="w-5 h-5 mr-2" />
                                Collect ${((dispensary?.idleEarnings || 0) / 100).toFixed(2)}
                            </Button>
                        </div>

                        {/* Inventory Preview */}
                        <Card className="bg-black/40 border-green-500/30 backdrop-blur-lg">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-white text-lg">Your Inventory</CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => setActiveTab("inventory")}>
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {inventory && inventory.length > 0 ? (
                                    <div className="space-y-2">
                                        {inventory.slice(0, 3).map((item) => (
                                            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                                                <div>
                                                    <p className="text-white font-medium">{item.strainName}</p>
                                                    <p className="text-green-400 text-sm">
                                                        {item.quantity} units @ ${(item.salePriceCents / 100).toFixed(2)}
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className="border-green-500/50 text-green-400">
                                                    {item.strainGenetics}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-400">
                                        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>No inventory yet!</p>
                                        <Button variant="link" className="text-green-400" onClick={() => setActiveTab("shop")}>
                                            Stock your shelves →
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="inventory" className="p-4">
                        <InventoryTab inventory={inventory || []} onRefresh={refetch} />
                    </TabsContent>

                    <TabsContent value="shop" className="p-4">
                        <ShopTab onRefresh={refetch} cashBalance={dispensary?.cashBalance || 0} />
                    </TabsContent>

                    <TabsContent value="leaderboard" className="p-4">
                        <LeaderboardTab currentDispensaryId={dispensary?.id} />
                    </TabsContent>

                    {/* Bottom Navigation */}
                    <TabsList className="fixed bottom-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-lg border-t border-green-500/30 grid grid-cols-4 rounded-none">
                        <TabsTrigger value="dashboard" className="flex flex-col items-center gap-1 data-[state=active]:text-green-400">
                            <Store className="w-5 h-5" />
                            <span className="text-xs">Home</span>
                        </TabsTrigger>
                        <TabsTrigger value="inventory" className="flex flex-col items-center gap-1 data-[state=active]:text-green-400">
                            <Package className="w-5 h-5" />
                            <span className="text-xs">Inventory</span>
                        </TabsTrigger>
                        <TabsTrigger value="shop" className="flex flex-col items-center gap-1 data-[state=active]:text-green-400">
                            <ShoppingCart className="w-5 h-5" />
                            <span className="text-xs">Shop</span>
                        </TabsTrigger>
                        <TabsTrigger value="leaderboard" className="flex flex-col items-center gap-1 data-[state=active]:text-green-400">
                            <BarChart3 className="w-5 h-5" />
                            <span className="text-xs">Rankings</span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </main>
        </div>
    );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
    const colorClasses: Record<string, string> = {
        green: "from-green-600/20 to-green-800/20 border-green-500/40 text-green-400",
        blue: "from-blue-600/20 to-blue-800/20 border-blue-500/40 text-blue-400",
        purple: "from-purple-600/20 to-purple-800/20 border-purple-500/40 text-purple-400",
        amber: "from-amber-600/20 to-amber-800/20 border-amber-500/40 text-amber-400",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl bg-gradient-to-br border backdrop-blur-lg ${colorClasses[color]}`}
        >
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs text-gray-300">{label}</span>
            </div>
            <p className="text-xl font-bold text-white">{value}</p>
        </motion.div>
    );
}

function CreateDispensaryFlow({ onSubmit, isLoading }: { onSubmit: (name: string) => void; isLoading: boolean }) {
    const [name, setName] = useState("");

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <Card className="w-full max-w-md bg-black/40 border-green-500/30 backdrop-blur-lg">
                    <CardHeader className="text-center">
                        <motion.div
                            initial={{ y: -20 }}
                            animate={{ y: 0 }}
                            transition={{ delay: 0.2, type: "spring" }}
                        >
                            <Store className="w-20 h-20 mx-auto text-green-400 mb-4" />
                        </motion.div>
                        <CardTitle className="text-3xl text-white">Open Your Dispensary</CardTitle>
                        <p className="text-green-300 mt-2">
                            Build your cannabis empire and compete for market dominance!
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">Dispensary Name</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Green Dreams Dispensary"
                                className="bg-white/10 border-green-500/40 text-white placeholder:text-gray-500"
                                maxLength={50}
                            />
                        </div>

                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-2">
                            <h4 className="text-green-400 font-semibold">Starting Bonuses:</h4>
                            <div className="flex items-center gap-2 text-gray-300 text-sm">
                                <DollarSign className="w-4 h-4 text-green-400" />
                                <span>$100.00 starting capital</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300 text-sm">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                <span>10 gems for premium items</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300 text-sm">
                                <Leaf className="w-4 h-4 text-green-400" />
                                <span>Access to 100+ real strains</span>
                            </div>
                        </div>

                        <Button
                            onClick={() => onSubmit(name)}
                            disabled={!name.trim() || isLoading}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 py-6 text-lg font-bold"
                        >
                            {isLoading ? "Opening..." : "🚀 Open for Business!"}
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}

function InventoryTab({ inventory, onRefresh }: { inventory: any[]; onRefresh: () => void }) {
    const updatePrice = trpc.tycoon.updatePrice.useMutation({
        onSuccess: () => {
            toast.success("Price updated!");
            onRefresh();
        },
    });

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Your Inventory</h2>

            {inventory.length === 0 ? (
                <Card className="bg-black/40 border-green-500/30">
                    <CardContent className="py-12 text-center">
                        <Package className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                        <p className="text-gray-400">Your shelves are empty!</p>
                        <p className="text-gray-500 text-sm">Head to the Shop to stock up on strains.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {inventory.map((item) => (
                        <Card key={item.id} className="bg-black/40 border-green-500/30">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="text-white font-bold">{item.strainName}</h3>
                                        <Badge variant="outline" className="border-green-500/50 text-green-400 mt-1">
                                            {item.strainGenetics}
                                        </Badge>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-green-400 font-bold">{item.quantity} units</p>
                                        <p className="text-gray-400 text-sm">THC: {item.strainThc || "N/A"}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                                    <div>
                                        <p className="text-gray-400 text-xs">Sale Price</p>
                                        <p className="text-white font-bold">${(item.salePriceCents / 100).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs">Sold</p>
                                        <p className="text-amber-400 font-bold">{item.totalSold}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs">Revenue</p>
                                        <p className="text-green-400 font-bold">${(item.totalRevenue / 100).toFixed(2)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function ShopTab({ onRefresh, cashBalance }: { onRefresh: () => void; cashBalance: number }) {
    const [quantities, setQuantities] = useState<Record<number, number>>({});

    const { data: strains, isLoading } = trpc.tycoon.getAvailableStrains.useQuery({ limit: 50 });

    const purchaseStock = trpc.tycoon.purchaseStock.useMutation({
        onSuccess: (data) => {
            if (data.success) {
                toast.success(`🌿 Purchased ${data.quantity} units for $${((data.cost || 0) / 100).toFixed(2)}!`);
                onRefresh();
            } else {
                toast.error(data.error || "Purchase failed");
            }
        },
    });

    const handlePurchase = (strainId: number) => {
        const quantity = quantities[strainId] || 10;
        purchaseStock.mutate({ strainId, quantity });
    };

    if (isLoading) {
        return <div className="text-center py-12 text-green-400">Loading strains...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Wholesale Market</h2>
                <Badge className="bg-green-600 text-white">
                    Balance: ${(cashBalance / 100).toFixed(2)}
                </Badge>
            </div>

            <div className="space-y-3">
                {strains?.map((strain) => (
                    <Card key={strain.id} className="bg-black/40 border-green-500/30">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="text-white font-bold">{strain.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                                            {strain.genetics || "Unknown"}
                                        </Badge>
                                        <span className="text-gray-400 text-xs">THC: {strain.thcContent || "N/A"}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-400 text-xs">Wholesale</p>
                                    <p className="text-green-400 font-bold">${((strain.wholesaleCost || 0) / 100).toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-white/10 rounded-lg">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setQuantities(q => ({ ...q, [strain.id]: Math.max(1, (q[strain.id] || 10) - 5) }))}
                                        className="text-white h-8 w-8 p-0"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </Button>
                                    <span className="text-white w-12 text-center">{quantities[strain.id] || 10}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setQuantities(q => ({ ...q, [strain.id]: (q[strain.id] || 10) + 5 }))}
                                        className="text-white h-8 w-8 p-0"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <Button
                                    onClick={() => handlePurchase(strain.id)}
                                    disabled={purchaseStock.isPending}
                                    className="flex-1 bg-green-600 hover:bg-green-500"
                                >
                                    Buy ${(((quantities[strain.id] || 10) * (strain.wholesaleCost || 0)) / 100).toFixed(2)}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function LeaderboardTab({ currentDispensaryId }: { currentDispensaryId?: number }) {
    const { data: leaderboard, isLoading } = trpc.tycoon.getLeaderboard.useQuery({
        boardType: 'revenue_all_time',
        limit: 50
    });

    if (isLoading) {
        return <div className="text-center py-12 text-green-400">Loading rankings...</div>;
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Crown className="w-6 h-6 text-amber-400" />
                Top Tycoons
            </h2>

            <div className="space-y-2">
                {leaderboard?.map((entry, index) => {
                    const isMe = entry.dispensaryId === currentDispensaryId;
                    const rankColors = ["text-amber-400", "text-gray-300", "text-amber-600"];

                    return (
                        <motion.div
                            key={entry.dispensaryId}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex items-center gap-3 p-3 rounded-lg ${isMe ? "bg-green-600/30 border border-green-500/50" : "bg-white/5"
                                }`}
                        >
                            <div className={`w-8 text-center font-bold ${rankColors[index] || "text-gray-400"}`}>
                                {index < 3 ? ["🥇", "🥈", "🥉"][index] : `#${index + 1}`}
                            </div>
                            <div className="flex-1">
                                <p className="text-white font-medium">{entry.dispensaryName}</p>
                                <p className="text-gray-400 text-xs">Level {entry.level}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-green-400 font-bold">${((entry.score || 0) / 100).toFixed(2)}</p>
                                <p className="text-gray-500 text-xs">revenue</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

export default TycoonDashboard;
