import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";

export default function ChallengeDraft() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  
  const { user } = useAuth();
  const challengeId = parseInt(id!);

  const [selectedAssetType, setSelectedAssetType] = useState<"manufacturer" | "cannabis_strain" | "pharmacy" | "brand">("manufacturer");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch draft state
  const { data: draftState, isLoading: draftLoading, refetch: refetchDraft } = trpc.challengeDraft.getDraftState.useQuery(
    { challengeId },
    { refetchInterval: 3000 } // Poll every 3 seconds
  );

  // Fetch available assets
  const { data: availableAssets, isLoading: assetsLoading } = trpc.challengeDraft.getAvailableAssets.useQuery({
    challengeId,
    assetType: selectedAssetType,
    search: searchQuery,
    limit: 100,
  });

  // Make pick mutation
  const makePick = trpc.challengeDraft.makePick.useMutation({
    onSuccess: (data) => {
      toast.success("Your pick has been recorded.");
      refetchDraft();
      
      if (data.isDraftComplete) {
        toast.success("The draft is finished. Redirecting...");
        setTimeout(() => {
          setLocation(`/challenge/${challengeId}/results`);
        }, 2000);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Auto-pick mutation
  const autoPick = trpc.challengeDraft.autoPick.useMutation({
    onSuccess: () => {
      toast.success("An asset has been automatically selected for you.");
      refetchDraft();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handlePick = (assetId: number) => {
    if (!draftState?.isUserTurn) {
      toast.error("Please wait for your turn to pick.");
      return;
    }

    makePick.mutate({
      challengeId,
      assetType: selectedAssetType,
      assetId,
    });
  };

  const handleAutoPick = () => {
    autoPick.mutate({ challengeId });
  };

  if (draftLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!draftState) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-xl font-semibold mb-2">Draft Not Found</h3>
            <Button onClick={() => setLocation(`/challenge/${challengeId}`)} className="mt-4">
              Back to Challenge
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (draftState.isDraftComplete) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="w-16 h-16 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Draft Complete!</h3>
            <p className="text-muted-foreground mb-4">The draft has finished. Good luck!</p>
            <Button onClick={() => setLocation(`/challenge/${challengeId}/results`)}>
              View Results
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const myPicks = draftState.picks.filter(p => p.userId === user?.id);

  return (
    <div className="container mx-auto py-4 px-4 max-w-7xl">
      <Button
        variant="ghost"
        onClick={() => setLocation(`/challenge/${challengeId}`)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Challenge
      </Button>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left Column - Draft Status */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Draft Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Round</div>
                <div className="text-2xl font-bold">{draftState.currentRound} / {draftState.challenge.draftRounds}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Pick</div>
                <div className="text-2xl font-bold">{draftState.totalPicks + 1}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-2">Current Turn</div>
                {draftState.currentPicker && (
                  <Badge variant={draftState.isUserTurn ? "default" : "secondary"} className="text-sm">
                    {draftState.isUserTurn ? "YOUR TURN" : `Waiting for pick...`}
                  </Badge>
                )}
              </div>

              {draftState.isUserTurn && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleAutoPick}
                  disabled={autoPick.isPending}
                >
                  {autoPick.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Auto-Picking...
                    </>
                  ) : (
                    "Auto-Pick"
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Roster ({myPicks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {myPicks.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No picks yet
                </div>
              ) : (
                <div className="space-y-2">
                  {myPicks.map((pick, idx) => (
                    <div key={idx} className="p-2 rounded border bg-card text-sm">
                      <Badge variant="outline" className="mr-2">R{pick.draftRound}</Badge>
                      {pick.assetType}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Available Assets */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Available Assets</CardTitle>
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-2"
              />
            </CardHeader>
            <CardContent>
              <Tabs value={selectedAssetType} onValueChange={(v) => setSelectedAssetType(v as any)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="manufacturer">Manufacturers</TabsTrigger>
                  <TabsTrigger value="cannabis_strain">Strains</TabsTrigger>
                  <TabsTrigger value="pharmacy">Pharmacies</TabsTrigger>
                  <TabsTrigger value="brand">Brands</TabsTrigger>
                </TabsList>

                <TabsContent value={selectedAssetType} className="mt-4">
                  {assetsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : !availableAssets || availableAssets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No available assets found
                    </div>
                  ) : (
                    <div className="grid gap-2 max-h-[600px] overflow-y-auto">
                      {availableAssets.map((asset: any) => (
                        <div
                          key={asset.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                        >
                          <div>
                            <div className="font-medium">{asset.name}</div>
                            {asset.productCount && (
                              <div className="text-sm text-muted-foreground">
                                {asset.productCount} products
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handlePick(asset.id)}
                            disabled={!draftState.isUserTurn || makePick.isPending}
                          >
                            {makePick.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Pick"
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
