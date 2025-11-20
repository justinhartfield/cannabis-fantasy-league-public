import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shuffle, Play, ArrowLeft, UserCircle, Trophy, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

/**
 * PreDraft Component
 * 
 * Pre-draft setup screen for commissioners to:
 * - View all teams in the league
 * - See/set draft order
 * - Randomize draft order
 * - Start the draft
 */
export default function PreDraft() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const leagueId = parseInt(id || "0");
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Fetch league data
  const { data: league, isLoading: leagueLoading } = trpc.league.getById.useQuery({ leagueId });

  // Fetch draft order
  const { data: draftOrder, isLoading: orderLoading, refetch: refetchOrder } = trpc.league.getDraftOrder.useQuery({ leagueId });

  // Mutations
  const randomizeMutation = trpc.league.randomizeDraftOrder.useMutation({
    onSuccess: () => {
      toast.success("Draft order randomized!");
      refetchOrder();
      setIsRandomizing(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to randomize draft order");
      setIsRandomizing(false);
    },
  });

  const startDraftMutation = trpc.draft.startDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft started! Redirecting...");
      setTimeout(() => {
        setLocation(`/league/${leagueId}/draft`);
      }, 1000);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start draft");
      setIsStarting(false);
    },
  });

  const handleRandomize = () => {
    setIsRandomizing(true);
    randomizeMutation.mutate({ leagueId });
  };

  const handleStartDraft = () => {
    if (!draftOrder || draftOrder.length === 0) {
      toast.error("Please set a draft order first");
      return;
    }

    const hasNullPositions = draftOrder.some((team) => team.draftPosition === null);
    if (hasNullPositions) {
      toast.error("Some teams don't have draft positions. Please randomize or set order.");
      return;
    }

    setIsStarting(true);
    startDraftMutation.mutate({ leagueId });
  };

  if (leagueLoading || orderLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">League not found</p>
      </div>
    );
  }

  const isCommissioner = league.isCommissioner;
  const hasOrder = draftOrder && draftOrder.every((team) => team.draftPosition !== null);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to League
        </Button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-14 h-14 text-yellow-500" />
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 headline-primary">
                Draft Setup
              </h1>
              <p className="text-muted-foreground">
                {league.name}
              </p>
            </div>
          </div>
          {isCommissioner && (
            <Badge variant="default" className="text-sm">
              Commissioner
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Draft Order */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 headline-secondary">
                    <Trophy className="w-5 h-5" />
                    Draft Order
                  </CardTitle>
                  <CardDescription>
                    {hasOrder
                      ? "Draft order is set and ready"
                      : "Set the draft order to begin"}
                  </CardDescription>
                </div>
                {isCommissioner && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRandomize}
                    disabled={isRandomizing}
                  >
                    {isRandomizing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Randomizing...
                      </>
                    ) : (
                      <>
                        <Shuffle className="w-4 h-4 mr-2" />
                        Randomize
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!draftOrder || draftOrder.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No teams in league yet
                </p>
              ) : (
                <div className="space-y-2">
                  {draftOrder.map((team, idx) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                          {team.draftPosition || idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{team.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {team.userName || "Unknown User"}
                          </p>
                        </div>
                      </div>
                      {team.draftPosition === null && (
                        <Badge variant="outline" className="text-xs">
                          Not Set
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Snake Draft Visualization */}
          {hasOrder && draftOrder && draftOrder.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  🐍 Snake Draft Pattern
                </CardTitle>
                <CardDescription className="text-xs">
                  Round 1 goes 1→{draftOrder.length}, Round 2 goes {draftOrder.length}→1, and so on
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[1, 2, 3].map((round) => {
                    const isReverse = round % 2 === 0;
                    const order = isReverse ? [...draftOrder].reverse() : draftOrder;
                    return (
                      <div key={round} className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">
                          R{round}
                        </Badge>
                        <div className="flex items-center gap-1 overflow-x-auto">
                          {order.map((team, idx) => (
                            <div
                              key={team.id}
                              className="flex items-center gap-1 text-xs text-muted-foreground"
                            >
                              <span>{team.name}</span>
                              {idx < order.length - 1 && (
                                <span className="text-muted-foreground/50">→</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* League Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">League Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <UserCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Teams:</span>
                <span className="font-medium text-foreground">
                  {draftOrder?.length || 0}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Picks per team:</span>
                <span className="font-medium text-foreground">9</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Total picks:</span>
                <span className="font-medium text-foreground">
                  {(draftOrder?.length || 0) * 9}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Start Draft */}
          {isCommissioner && (
            <Card className={hasOrder ? "border-green-500 bg-green-50 dark:bg-green-950/20" : ""}>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  {hasOrder ? "✅ Ready to Draft" : "⚠️ Not Ready"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {hasOrder
                    ? "All teams have draft positions"
                    : "Set draft order to continue"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleStartDraft}
                  disabled={!hasOrder || isStarting}
                  className="w-full"
                  size="lg"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Draft
                    </>
                  )}
                </Button>
                {!hasOrder && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Click "Randomize" to set draft order
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {!isCommissioner && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  ⏳ Waiting for Commissioner
                </CardTitle>
                <CardDescription className="text-xs">
                  The commissioner will start the draft when ready
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
