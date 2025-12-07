import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { toast } from 'sonner';

// Types
type DuelPosition = 'STRAIN_1' | 'STRAIN_2' | 'MANUFACTURER' | 'PRODUCT' | 'PHARMACY';
type AssetType = 'strain' | 'manufacturer' | 'product' | 'pharmacy';

const POSITIONS: { id: DuelPosition; label: string; type: AssetType }[] = [
    { id: 'STRAIN_1', label: 'Strain 1 (1.5x)', type: 'strain' },
    { id: 'STRAIN_2', label: 'Strain 2 (1.0x)', type: 'strain' },
    { id: 'MANUFACTURER', label: 'Manufacturer (1.2x)', type: 'manufacturer' },
    { id: 'PRODUCT', label: 'Product (2.0x)', type: 'product' },
    { id: 'PHARMACY', label: 'Pharmacy (1.3x)', type: 'pharmacy' },
];

const DuelDraftRoom: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const duelId = parseInt(id || '0');
    const [, setLocation] = useLocation();
    const { user } = useAuth();

    // State
    const [selectedPosition, setSelectedPosition] = useState<DuelPosition | null>(null);
    const [activeTab, setActiveTab] = useState<AssetType>('strain');
    const [timeLeft, setTimeLeft] = useState(20);

    // Queries
    const { data: duel, refetch: refetchDuel } = trpc.duels.getDuelById.useQuery(
        { duelId },
        {
            enabled: !!duelId,
            refetchInterval: 5000 // Polling backup
        }
    );

    const { data: availableAssets } = trpc.duels.getAvailableAssets.useQuery(
        { duelId, assetType: activeTab },
        { enabled: !!duelId && !!activeTab }
    );

    // Mutations
    const makePickMutation = trpc.duels.makePick.useMutation({
        onSuccess: () => {
            toast.success('Pick confirmed!');
            setSelectedPosition(null);
            refetchDuel();
        },
        onError: (err) => {
            toast.error(err.message);
        }
    });

    // WebSocket
    useWebSocket({
        userId: user?.id || 0,
        leagueId: 0, // Using 0 to just connect without joining a specific league channel initially
        autoConnect: !!user,
        onMessage: (message) => {
            // Filter for this duel
            if (message.duelId !== duelId) return;

            if (message.type === 'opponent_picked') {
                toast.success(`Opponent picked ${message.pick.assetName}`);
                refetchDuel();
            } else if (message.type === 'duel_started') {
                toast.success('Duel started!');
                refetchDuel(); // Status change will trigger effect
            } else if (message.type === 'duel_complete') {
                toast.success('Duel complete!');
            }
        }
    });

    // Effect to handle navigation when duel starts
    useEffect(() => {
        if (duel && duel.status === 'active') {
            toast.success('Draft complete! Duel starting...');
            setLocation(`/duels/${duelId}`);
        }
    }, [duel, setLocation, duelId]);

    if (!duel || !user) return <div className="p-8 text-center text-white">Loading draft room...</div>;

    const isCreator = user.id === duel.creatorId;
    const myPicks = isCreator ? duel.creatorPicks : duel.opponentPicks;
    const opponentPicks = isCreator ? duel.opponentPicks : duel.creatorPicks;
    const opponent = isCreator ? duel.opponent : duel.creator;

    const isMyTurn = true; // Simultaneous draft in V1 means it's always "your turn" if you have slots open? 
    // Wait, req says "Real-time simultaneous picks". So yes, no turn order enforcement mentioned in prompt details explicitly other than "20 second timer per pick" which implies turns OR a global timer. 
    // "Blocking mechanic" implies race to pick. So yes, always my turn if I have empty slots.

    const handlePick = (assetId: number) => {
        if (!selectedPosition) {
            toast.error('Select a position first');
            return;
        }

        const positionConfig = POSITIONS.find(p => p.id === selectedPosition);
        if (!positionConfig) return;

        if (positionConfig.type !== activeTab) {
            toast.error(`This position requires a ${positionConfig.type}`);
            return;
        }

        makePickMutation.mutate({
            duelId,
            position: selectedPosition,
            assetType: positionConfig.type,
            assetId
        });
    };

    return (
        <>
            <div className="container mx-auto px-4 py-6 max-w-6xl text-white">
                {/* Header */}
                <div className="flex justify-between items-center mb-8 bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
                            Draft Room
                        </h1>
                        <p className="text-gray-400 text-sm">Draft your 5-asset portfolio</p>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-mono font-bold text-yellow-400">{timeLeft}s</div>
                        <div className="text-xs text-gray-500">PER PICK</div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <div className="font-bold">{opponent?.name || 'Opponent'}</div>
                            <div className="text-xs text-gray-400">Enemy</div>
                        </div>
                        {opponent?.avatarUrl ? (
                            <img src={opponent.avatarUrl} className="w-10 h-10 rounded-full border border-red-500" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-700 border border-red-500 flex items-center justify-center">?</div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* My Portfolio (Left) */}
                    <div className="lg:col-span-3 space-y-4">
                        <h2 className="text-xl font-bold text-green-400 mb-4">My Portfolio</h2>
                        {POSITIONS.map((pos) => {
                            const pick = myPicks.find(p => p.position === pos.id);
                            const isSelected = selectedPosition === pos.id;

                            return (
                                <div
                                    key={pos.id}
                                    onClick={() => !pick && setSelectedPosition(pos.id)}
                                    className={`
                    relative p-3 rounded-lg border transition-all cursor-pointer
                    ${pick ? 'bg-gray-800 border-green-500/50 opacity-80' :
                                            isSelected ? 'bg-green-500/10 border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.3)]' :
                                                'bg-gray-800/50 border-gray-700 hover:border-gray-500'}
                  `}
                                >
                                    <div className="text-xs text-gray-400 mb-1 flex justify-between">
                                        <span>{pos.label}</span>
                                        {pick && <span className="text-green-400">✓</span>}
                                    </div>
                                    {pick ? (
                                        <div className="font-medium truncate text-white">{pick.assetName}</div>
                                    ) : (
                                        <div className="text-sm text-gray-600 italic">Empty Slot</div>
                                    )}

                                    {/* Selection Indicator */}
                                    {isSelected && !pick && (
                                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-green-400 rotate-45 transform" />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Draft Board (Center) */}
                    <div className="lg:col-span-6 flex flex-col h-[600px] bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">

                        {/* Tabs */}
                        <div className="flex border-b border-gray-700">
                            {(['strain', 'manufacturer', 'product', 'pharmacy'] as AssetType[]).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setActiveTab(type)}
                                    className={`
                     flex-1 py-3 text-sm font-medium transition-colors uppercase tracking-wider
                     ${activeTab === type ? 'bg-gray-800 text-white border-b-2 border-green-400' : 'text-gray-500 hover:text-gray-300'}
                   `}
                                >
                                    {type}s
                                </button>
                            ))}
                        </div>

                        {/* Asset List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {availableAssets?.map((asset: any) => (
                                <div
                                    key={asset.id}
                                    className="group flex justify-between items-center p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700/50 hover:border-blue-500/50 transition-all"
                                >
                                    <div className="flex-1">
                                        <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                                            {asset.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {asset.totalPoints} pts avg • {asset.orderCount} orders
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handlePick(asset.id)}
                                        disabled={makePickMutation.isLoading || !selectedPosition}
                                        className={`
                       px-4 py-2 rounded text-sm font-bold transition-transform active:scale-95
                       ${!selectedPosition
                                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-lg'}
                     `}
                                    >
                                        DRAFT
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Opponent Portfolio (Right) */}
                    <div className="lg:col-span-3 space-y-4">
                        <h2 className="text-xl font-bold text-red-400 mb-4 text-right">Opponent</h2>
                        {POSITIONS.map((pos) => {
                            const pick = opponentPicks.find(p => p.position === pos.id);

                            return (
                                <div
                                    key={pos.id}
                                    className={`
                    p-3 rounded-lg border transition-all text-right
                    ${pick ? 'bg-gray-800 border-red-500/50 opacity-80' :
                                            'bg-gray-800/50 border-gray-700'}
                  `}
                                >
                                    <div className="text-xs text-gray-400 mb-1">
                                        {pos.label}
                                    </div>
                                    {pick ? (
                                        <div className="font-medium truncate text-white">{pick.assetName}</div>
                                    ) : (
                                        <div className="text-sm text-gray-600 italic">Waiting...</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                </div>
            </div>
        </>
    );
};

export default DuelDraftRoom;
