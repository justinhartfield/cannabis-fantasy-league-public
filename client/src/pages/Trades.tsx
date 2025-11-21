import { useState } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { LeagueNav } from "@/components/LeagueNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, ArrowRightLeft, Check, X, Eye, ArrowRight, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function Trades() {
  const { id } = useParams();
  const leagueId = parseInt(id!);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("active");
  
  // Modal State
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradeStep, setTradeStep] = useState(1);
  const [targetTeamId, setTargetTeamId] = useState<string>("");
  const [selectedMyAssets, setSelectedMyAssets] = useState<any[]>([]);
  const [selectedTargetAssets, setSelectedTargetAssets] = useState<any[]>([]);

  // Fetch Data
  const { data: league } = trpc.league.getById.useQuery({ leagueId });
  const { data: myTeam } = trpc.league.getMyTeam.useQuery({ leagueId });
  const { data: trades = [], refetch: refetchTrades } = trpc.trade.getTrades.useQuery({ leagueId });
  const { data: myRoster = [] } = trpc.roster.getMyRoster.useQuery({ leagueId });
  
  // Fetch target roster only when step > 1 and team selected
  const { data: targetRoster = [] } = trpc.roster.getTeamRoster.useQuery(
    { leagueId, teamId: parseInt(targetTeamId) },
    { enabled: !!targetTeamId && tradeStep > 1 }
  );

  // Mutations
  const proposeTrade = trpc.trade.proposeTrade.useMutation({
    onSuccess: () => {
      toast.success("Trade proposed successfully!");
      setIsTradeModalOpen(false);
      resetTradeBuilder();
      refetchTrades();
    },
    onError: (err) => toast.error(err.message)
  });

  const acceptTrade = trpc.trade.acceptTrade.useMutation({
    onSuccess: () => {
      toast.success("Trade accepted!");
      refetchTrades();
    },
    onError: (err) => toast.error(err.message)
  });

  const rejectTrade = trpc.trade.rejectTrade.useMutation({
    onSuccess: () => {
      toast.success("Trade rejected.");
      refetchTrades();
    },
    onError: (err) => toast.error(err.message)
  });

  const resetTradeBuilder = () => {
    setTradeStep(1);
    setTargetTeamId("");
    setSelectedMyAssets([]);
    setSelectedTargetAssets([]);
  };

  const handleNextStep = () => {
    if (tradeStep === 1 && !targetTeamId) {
      toast.error("Please select a team to trade with.");
      return;
    }
    setTradeStep(prev => prev + 1);
  };

  const handleBackStep = () => {
    setTradeStep(prev => prev - 1);
  };

  const toggleAssetSelection = (asset: any, isMyAsset: boolean) => {
    const setter = isMyAsset ? setSelectedMyAssets : setSelectedTargetAssets;
    const current = isMyAsset ? selectedMyAssets : selectedTargetAssets;
    
    // Store minimal asset info: { type, id, name }
    // Backend needs { type, id }
    const assetKey = `${asset.assetType}:${asset.assetId}`;
    const exists = current.find(a => `${a.type}:${a.id}` === assetKey);

    if (exists) {
      setter(current.filter(a => `${a.type}:${a.id}` !== assetKey));
    } else {
      setter([...current, { type: asset.assetType, id: asset.assetId, name: asset.name }]);
    }
  };

  const handleSubmitTrade = () => {
    if (selectedMyAssets.length === 0 && selectedTargetAssets.length === 0) {
      toast.error("Trade must include at least one asset.");
      return;
    }
    
    proposeTrade.mutate({
      leagueId,
      targetTeamId: parseInt(targetTeamId),
      myAssets: selectedMyAssets.map(a => ({ type: a.type, id: a.id })),
      targetAssets: selectedTargetAssets.map(a => ({ type: a.type, id: a.id })),
    });
  };

  if (!league || !myTeam) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  
  const isCommissioner = league.commissionerUserId === user?.id;
  const potentialPartners = league.teams?.filter((t: any) => t.id !== myTeam.id) || [];
  const targetTeamName = potentialPartners.find(t => t.id.toString() === targetTeamId)?.teamName;

  return (
    <div className="min-h-screen bg-background">
      <LeagueNav
        leagueId={leagueId}
        leagueName={league.name}
        teamCount={league.teams?.length || 0}
        maxTeams={league.maxTeams}
        leagueType={league.leagueType}
        isCommissioner={isCommissioner}
        hasTeam={true}
        currentPage="trades"
      />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Trade Center</h2>
              <p className="text-muted-foreground">
                Propose and manage player trades
              </p>
            </div>
            <Dialog open={isTradeModalOpen} onOpenChange={(open) => {
              if (!open) resetTradeBuilder();
              setIsTradeModalOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Propose Trade
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Propose Trade {tradeStep > 1 && targetTeamName ? `with ${targetTeamName}` : ""}</DialogTitle>
                  <DialogDescription>
                    Step {tradeStep} of 4: {
                      tradeStep === 1 ? "Select Partner" :
                      tradeStep === 2 ? "Choose Your Assets to Offer" :
                      tradeStep === 3 ? "Choose Their Assets to Request" : "Review & Confirm"
                    }
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                  {/* Step 1: Select Partner */}
                  {tradeStep === 1 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select Trading Partner</label>
                        <Select value={targetTeamId} onValueChange={setTargetTeamId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a team..." />
                          </SelectTrigger>
                          <SelectContent>
                            {potentialPartners.map((team: any) => (
                              <SelectItem key={team.id} value={team.id.toString()}>
                                {team.teamName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Select My Assets */}
                  {tradeStep === 2 && (
                    <ScrollArea className="h-[300px] rounded-md border p-4">
                      {myRoster.length === 0 ? (
                        <p className="text-center text-muted-foreground">Your roster is empty.</p>
                      ) : (
                        <div className="space-y-2">
                          {myRoster.map((player: any) => {
                             const isSelected = selectedMyAssets.some(a => a.type === player.assetType && a.id === player.assetId);
                             return (
                               <div key={`${player.assetType}-${player.assetId}`} 
                                    className={`flex items-center space-x-2 p-2 rounded hover:bg-accent cursor-pointer ${isSelected ? 'bg-accent' : ''}`}
                                    onClick={() => toggleAssetSelection(player, true)}
                               >
                                 <Checkbox checked={isSelected} onCheckedChange={() => toggleAssetSelection(player, true)} />
                                 <div className="flex-1">
                                   <p className="font-medium">{player.name}</p>
                                   <p className="text-xs text-muted-foreground capitalize">{player.assetType}</p>
                                 </div>
                               </div>
                             );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  )}

                  {/* Step 3: Select Their Assets */}
                  {tradeStep === 3 && (
                    <ScrollArea className="h-[300px] rounded-md border p-4">
                       {targetRoster.length === 0 ? (
                        <p className="text-center text-muted-foreground">Their roster is empty.</p>
                      ) : (
                        <div className="space-y-2">
                          {targetRoster.map((player: any) => {
                             const isSelected = selectedTargetAssets.some(a => a.type === player.assetType && a.id === player.assetId);
                             return (
                               <div key={`${player.assetType}-${player.assetId}`} 
                                    className={`flex items-center space-x-2 p-2 rounded hover:bg-accent cursor-pointer ${isSelected ? 'bg-accent' : ''}`}
                                    onClick={() => toggleAssetSelection(player, false)}
                               >
                                 <Checkbox checked={isSelected} onCheckedChange={() => toggleAssetSelection(player, false)} />
                                 <div className="flex-1">
                                   <p className="font-medium">{player.name}</p>
                                   <p className="text-xs text-muted-foreground capitalize">{player.assetType}</p>
                                 </div>
                               </div>
                             );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  )}

                  {/* Step 4: Review */}
                  {tradeStep === 4 && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <h4 className="font-bold mb-2 text-sm text-muted-foreground uppercase">You Give</h4>
                        {selectedMyAssets.length > 0 ? (
                          <ul className="space-y-1 text-sm">
                            {selectedMyAssets.map((a, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <ArrowRight className="w-3 h-3 text-red-500" /> {a.name}
                              </li>
                            ))}
                          </ul>
                        ) : <p className="text-sm text-muted-foreground italic">Nothing</p>}
                      </div>
                      <div className="border rounded-lg p-4">
                        <h4 className="font-bold mb-2 text-sm text-muted-foreground uppercase">You Get</h4>
                        {selectedTargetAssets.length > 0 ? (
                          <ul className="space-y-1 text-sm">
                            {selectedTargetAssets.map((a, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <ArrowRightLeft className="w-3 h-3 text-green-500" /> {a.name}
                              </li>
                            ))}
                          </ul>
                        ) : <p className="text-sm text-muted-foreground italic">Nothing</p>}
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="flex justify-between sm:justify-between">
                  <Button variant="outline" onClick={tradeStep === 1 ? () => setIsTradeModalOpen(false) : handleBackStep}>
                    {tradeStep === 1 ? "Cancel" : "Back"}
                  </Button>
                  {tradeStep < 4 ? (
                    <Button onClick={handleNextStep}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
                  ) : (
                    <Button onClick={handleSubmitTrade} disabled={proposeTrade.isPending}>
                      {proposeTrade.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                      Confirm Proposal
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="active">Active Trades</TabsTrigger>
              <TabsTrigger value="history">Trade History</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
               {trades.filter((t: any) => t.status === 'proposed').length > 0 ? (
                 <div className="grid gap-4">
                   {trades.filter((t: any) => t.status === 'proposed').map((trade: any) => (
                     <TradeCard 
                        key={trade.id} 
                        trade={trade} 
                        currentTeamId={myTeam.id} 
                        onAccept={(id) => acceptTrade.mutate({ tradeId: id })}
                        onReject={(id) => rejectTrade.mutate({ tradeId: id })}
                        isActionPending={acceptTrade.isPending || rejectTrade.isPending}
                     />
                   ))}
                 </div>
               ) : (
                 <Card>
                   <CardContent className="pt-6 text-center text-muted-foreground">
                     No active trades found.
                   </CardContent>
                 </Card>
               )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
               {trades.filter((t: any) => t.status !== 'proposed').length > 0 ? (
                 <div className="grid gap-4">
                   {trades.filter((t: any) => t.status !== 'proposed').map((trade: any) => (
                     <TradeCard 
                        key={trade.id} 
                        trade={trade} 
                        currentTeamId={myTeam.id} 
                        readonly
                     />
                   ))}
                 </div>
               ) : (
                 <Card>
                   <CardContent className="pt-6 text-center text-muted-foreground">
                     No trade history.
                   </CardContent>
                 </Card>
               )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

function TradeCard({ trade, currentTeamId, onAccept, onReject, isActionPending, readonly }: any) {
  const isIncoming = trade.team2Id === currentTeamId;
  const isOutgoing = trade.team1Id === currentTeamId;
  
  // Parse JSON assets safely if needed, though TRPC usually handles it if defined in router output schema?
  // The schema says json(), so it comes as object/array.
  const assetsGiven = Array.isArray(trade.team1Assets) ? trade.team1Assets : [];
  const assetsReceived = Array.isArray(trade.team2Assets) ? trade.team2Assets : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
               {isIncoming ? "Trade Offer Received" : isOutgoing ? "Trade Offer Sent" : "Trade Offer"}
            </CardTitle>
            <CardDescription>
              {new Date(trade.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge variant={trade.status === 'proposed' ? 'secondary' : trade.status === 'accepted' ? 'default' : 'destructive'}>
            {trade.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-8">
           <div>
             <p className="text-xs font-bold text-muted-foreground uppercase mb-2">
               {isOutgoing ? "You Offer" : "They Offer"}
             </p>
             {assetsGiven.length > 0 ? (
               <ul className="space-y-1 text-sm">
                 {assetsGiven.map((a: any, i: number) => (
                   <li key={i} className="flex items-center gap-2">
                     <span className="font-medium">Asset #{a.id}</span> <span className="text-xs text-muted-foreground">({a.type})</span>
                   </li>
                 ))}
               </ul>
             ) : <span className="text-sm text-muted-foreground italic">Nothing</span>}
           </div>
           <div>
             <p className="text-xs font-bold text-muted-foreground uppercase mb-2">
               {isOutgoing ? "You Receive" : "They Receive"}
             </p>
             {assetsReceived.length > 0 ? (
               <ul className="space-y-1 text-sm">
                 {assetsReceived.map((a: any, i: number) => (
                   <li key={i} className="flex items-center gap-2">
                     <span className="font-medium">Asset #{a.id}</span> <span className="text-xs text-muted-foreground">({a.type})</span>
                   </li>
                 ))}
               </ul>
             ) : <span className="text-sm text-muted-foreground italic">Nothing</span>}
           </div>
        </div>
      </CardContent>
      {!readonly && isIncoming && (
        <CardFooter className="flex justify-end gap-3 border-t pt-4">
          <Button variant="outline" onClick={() => onReject?.(trade.id)} disabled={isActionPending}>
             Reject
          </Button>
          <Button onClick={() => onAccept?.(trade.id)} disabled={isActionPending}>
             Accept Trade
          </Button>
        </CardFooter>
      )}
      {!readonly && isOutgoing && (
        <CardFooter className="flex justify-end border-t pt-4">
           <Button variant="ghost" disabled>Waiting for response...</Button>
        </CardFooter>
      )}
    </Card>
  );
}
