import React, { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

const DuelLiveView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const duelId = parseInt(id || '0');
    const [, setLocation] = useLocation();
    const { user } = useAuth();

    const { data: duel, isLoading } = trpc.duels.getDuelById.useQuery(
        { duelId },
        {
            enabled: !!duelId,
            refetchInterval: 10000 // Poll for live scores
        }
    );

    // If duel is still drafting, redirect to draft room
    useEffect(() => {
        if (duel && duel.status === 'drafting') {
            setLocation(`/duels/${duelId}/draft`);
        }
    }, [duel, setLocation, duelId]);

    if (isLoading || !duel) return <div className="p-8 text-center text-white">Loading duel...</div>;

    const isCreator = user?.id === duel.creatorId;
    const isOpponent = user?.id === duel.opponentId;

    // Calculate totals
    const creatorTotal = duel.creatorPicks.reduce((sum: number, p: any) => sum + (parseFloat(p.pointsEarned) || 0), 0);
    const opponentTotal = duel.opponentPicks.reduce((sum: number, p: any) => sum + (parseFloat(p.pointsEarned) || 0), 0);

    const creator = duel.creator;
    const opponent = duel.opponent;

    return (
        <>
            <div className="container mx-auto px-4 py-6 max-w-4xl text-white">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Portfolio Duel</h1>
                    <div className="text-purple-400 font-mono">
                        Pot: {duel.prizePool.toLocaleString()} Points
                    </div>
                    <div className="text-xs text-gray-500 mt-1 uppercase tracking-widest">
                        {duel.status}
                    </div>
                </div>

                {/* Scoreboard */}
                <div className="flex items-center justify-between bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-red-900/20 pointer-events-none" />

                    {/* Creator */}
                    <div className="text-center relative z-10 w-1/3">
                        <div className={`text-4xl font-bold mb-1 ${creatorTotal >= opponentTotal ? 'text-blue-400' : 'text-gray-500'}`}>
                            {creatorTotal.toFixed(1)}
                        </div>
                        <div className="font-bold text-lg">{creator?.name}</div>
                    </div>

                    <div className="text-center w-1/3 text-2xl font-bold text-gray-600">VS</div>

                    {/* Opponent */}
                    <div className="text-center relative z-10 w-1/3">
                        <div className={`text-4xl font-bold mb-1 ${opponentTotal >= creatorTotal ? 'text-red-400' : 'text-gray-500'}`}>
                            {opponentTotal.toFixed(1)}
                        </div>
                        <div className="font-bold text-lg">{opponent?.name || 'Waiting...'}</div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Creator Portfolio */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-blue-400 text-center border-b border-blue-900/50 pb-2">
                            {creator?.name}'s Portfolio
                        </h3>
                        {duel.creatorPicks.map((pick: any) => (
                            <div key={pick.id} className="bg-gray-800/50 p-3 rounded-lg flex justify-between items-center">
                                <div>
                                    <div className="font-medium text-sm">{pick.assetName}</div>
                                    <div className="text-xs text-gray-500">{pick.position}</div>
                                </div>
                                <div className={`font-mono font-bold ${parseFloat(pick.pointsEarned) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {parseFloat(pick.pointsEarned) > 0 ? '+' : ''}{parseFloat(pick.pointsEarned).toFixed(1)}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Opponent Portfolio */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-red-400 text-center border-b border-red-900/50 pb-2">
                            {opponent?.name || 'Opponent'}'s Portfolio
                        </h3>
                        {duel.opponentPicks.map((pick: any) => (
                            <div key={pick.id} className="bg-gray-800/50 p-3 rounded-lg flex justify-between items-center">
                                <div>
                                    <div className="font-medium text-sm">{pick.assetName}</div>
                                    <div className="text-xs text-gray-500">{pick.position}</div>
                                </div>
                                <div className={`font-mono font-bold ${parseFloat(pick.pointsEarned) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {parseFloat(pick.pointsEarned) > 0 ? '+' : ''}{parseFloat(pick.pointsEarned).toFixed(1)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default DuelLiveView;
