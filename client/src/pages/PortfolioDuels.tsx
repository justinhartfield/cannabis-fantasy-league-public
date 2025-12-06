/**
 * Portfolio Duels Page
 * 
 * Main page for 1v1 multiplayer draft battles
 */

import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Swords,
    Trophy,
    Clock,
    Users,
    Zap,
    Target,
    TrendingUp,
    Crown,
    Loader2,
    Play,
    UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

const ANTE_TIERS = [50, 100, 500];

export default function PortfolioDuels() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    const [selectedAnte, setSelectedAnte] = useState(100);
    const [isMatchmaking, setIsMatchmaking] = useState(false);

    // Queries
    const { data: activeDuels, isLoading: duelsLoading } = trpc.duels.getActiveDuels.useQuery();
    const { data: pendingInvites } = trpc.duels.getPendingInvites.useQuery();
    const { data: myStats } = trpc.duels.getMyStats.useQuery();
    const { data: duelHistory } = trpc.duels.getDuelHistory.useQuery({ limit: 10 });
    const { data: leaderboard } = trpc.duels.getLeaderboard.useQuery({ limit: 10 });

    // Mutations
    const joinQueueMutation = trpc.duels.joinQueue.useMutation({
        onSuccess: (data) => {
            if (data.matched && data.duel) {
                toast.success('🎮 Match found! Starting draft...');
                setLocation(`/duels/${data.duel.id}/draft`);
            } else {
                toast.info('🔍 Searching for opponent...');
            }
            setIsMatchmaking(true);
        },
        onError: (error) => {
            toast.error(error.message);
            setIsMatchmaking(false);
        }
    });

    const leaveQueueMutation = trpc.duels.leaveQueue.useMutation({
        onSuccess: () => {
            toast.info('Left matchmaking queue');
            setIsMatchmaking(false);
        }
    });

    const acceptInviteMutation = trpc.duels.acceptInvite.useMutation({
        onSuccess: (duel) => {
            toast.success('Challenge accepted! Starting draft...');
            setLocation(`/duels/${duel.id}/draft`);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleQuickMatch = () => {
        if (isMatchmaking) {
            leaveQueueMutation.mutate();
        } else {
            joinQueueMutation.mutate({ anteAmount: selectedAnte, duelType: 'sprint' });
        }
    };

    const winRate = myStats && myStats.totalDuels > 0
        ? Math.round((myStats.wins / myStats.totalDuels) * 100)
        : 0;

    return (
        <div className="container mx-auto py-6 px-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Swords className="w-8 h-8 text-emerald-500" />
                        Portfolio Duels
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Draft 5 assets, battle for 24 hours, winner takes all
                    </p>
                </div>

                {/* User Stats Summary */}
                <div className="flex gap-3">
                    <Badge variant="secondary" className="px-3 py-1">
                        <Trophy className="w-4 h-4 mr-1" />
                        {myStats?.wins || 0}W - {myStats?.losses || 0}L
                    </Badge>
                    <Badge variant="secondary" className="px-3 py-1">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        {winRate}% Win Rate
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1">
                        <Zap className="w-4 h-4 mr-1 text-yellow-500" />
                        {user?.referralCredits || 0} Points
                    </Badge>
                </div>
            </div>

            {/* Quick Match Section */}
            <Card className="bg-gradient-to-br from-emerald-900/20 to-cyan-900/20 border-emerald-500/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        Quick Match
                    </CardTitle>
                    <CardDescription>
                        Get matched with an opponent instantly
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        {/* Ante Selection */}
                        <div className="flex gap-2">
                            {ANTE_TIERS.map((ante) => (
                                <Button
                                    key={ante}
                                    variant={selectedAnte === ante ? 'default' : 'outline'}
                                    onClick={() => setSelectedAnte(ante)}
                                    disabled={isMatchmaking}
                                    className="min-w-[80px]"
                                >
                                    {ante} pts
                                </Button>
                            ))}
                        </div>

                        {/* Match Button */}
                        <Button
                            size="lg"
                            onClick={handleQuickMatch}
                            disabled={joinQueueMutation.isPending || leaveQueueMutation.isPending}
                            className={isMatchmaking
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }
                        >
                            {joinQueueMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : isMatchmaking ? (
                                <Clock className="w-4 h-4 mr-2 animate-pulse" />
                            ) : (
                                <Play className="w-4 h-4 mr-2" />
                            )}
                            {isMatchmaking ? 'Cancel Search' : 'Find Match'}
                        </Button>

                        {/* Prize Info */}
                        <div className="text-sm text-muted-foreground">
                            Prize Pool: <span className="text-emerald-500 font-bold">{selectedAnte * 2} pts</span>
                        </div>
                    </div>

                    {/* Lineup Preview */}
                    <div className="mt-4 flex gap-2 flex-wrap text-xs text-muted-foreground">
                        <Badge variant="outline">🌿 2 Strains</Badge>
                        <Badge variant="outline">🏭 1 Manufacturer</Badge>
                        <Badge variant="outline">📦 1 Product</Badge>
                        <Badge variant="outline">🏥 1 Pharmacy</Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Pending Invites */}
            {pendingInvites && pendingInvites.length > 0 && (
                <Card className="border-yellow-500/50 bg-yellow-500/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-500">
                            <UserPlus className="w-5 h-5" />
                            Pending Challenges ({pendingInvites.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {pendingInvites.map((invite) => (
                            <div key={invite.id} className="flex justify-between items-center p-3 bg-card rounded-lg">
                                <div>
                                    <span className="font-medium">Challenge from User #{invite.senderId}</span>
                                    <Badge className="ml-2">{invite.anteAmount} pts</Badge>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => acceptInviteMutation.mutate({ inviteId: invite.id })}
                                        disabled={acceptInviteMutation.isPending}
                                    >
                                        Accept
                                    </Button>
                                    <Button size="sm" variant="outline">
                                        Decline
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Main Content Tabs */}
            <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid grid-cols-3 w-full max-w-md">
                    <TabsTrigger value="active">Active Duels</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                    <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                </TabsList>

                {/* Active Duels */}
                <TabsContent value="active" className="space-y-4">
                    {duelsLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : activeDuels && activeDuels.length > 0 ? (
                        activeDuels.map((duel) => (
                            <Card key={duel.id} className="hover:border-emerald-500/50 transition-colors cursor-pointer"
                                onClick={() => setLocation(`/duels/${duel.id}`)}>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <Swords className="w-8 h-8 text-emerald-500" />
                                            <div>
                                                <p className="font-medium">Duel #{duel.id}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Status: <Badge variant={duel.status === 'drafting' ? 'secondary' : 'default'}>
                                                        {duel.status}
                                                    </Badge>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-emerald-500">{duel.prizePool} pts</p>
                                            {duel.endTime && (
                                                <p className="text-xs text-muted-foreground">
                                                    Ends: {new Date(duel.endTime).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No active duels</p>
                            <p className="text-sm">Click Quick Match to start one!</p>
                        </div>
                    )}
                </TabsContent>

                {/* History */}
                <TabsContent value="history" className="space-y-4">
                    {duelHistory && duelHistory.length > 0 ? (
                        duelHistory.map((duel) => {
                            const isWinner = duel.winnerId === user?.id;
                            const isDraw = duel.status === 'complete' && !duel.winnerId;

                            return (
                                <Card key={duel.id} className={isWinner ? 'border-emerald-500/30' : isDraw ? 'border-yellow-500/30' : 'border-red-500/30'}>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                {isWinner ? (
                                                    <Trophy className="w-8 h-8 text-emerald-500" />
                                                ) : isDraw ? (
                                                    <Users className="w-8 h-8 text-yellow-500" />
                                                ) : (
                                                    <Swords className="w-8 h-8 text-red-500" />
                                                )}
                                                <div>
                                                    <p className="font-medium">Duel #{duel.id}</p>
                                                    <Badge variant={isWinner ? 'default' : isDraw ? 'secondary' : 'destructive'}>
                                                        {isWinner ? 'Victory' : isDraw ? 'Draw' : 'Defeat'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-lg font-bold ${isWinner ? 'text-emerald-500' : isDraw ? 'text-yellow-500' : 'text-red-500'}`}>
                                                    {isWinner ? `+${duel.prizePool}` : isDraw ? '0' : `-${duel.anteAmount}`} pts
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No duel history yet</p>
                        </div>
                    )}
                </TabsContent>

                {/* Leaderboard */}
                <TabsContent value="leaderboard">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Crown className="w-5 h-5 text-yellow-500" />
                                Top Duelists
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {leaderboard?.map((player, index) => (
                                    <div key={player.userId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className={`font-bold text-lg w-8 ${index < 3 ? 'text-yellow-500' : ''}`}>
                                                #{index + 1}
                                            </span>
                                            <span className="font-medium">{player.name || `User #${player.userId}`}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Badge variant="outline">{player.wins}W - {player.losses}L</Badge>
                                            <span className={`font-bold ${player.netPoints >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {player.netPoints >= 0 ? '+' : ''}{player.netPoints} pts
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
