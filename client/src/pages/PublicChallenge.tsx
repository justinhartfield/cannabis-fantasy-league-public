import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PublicDraftBoard } from "@/components/PublicDraftBoard";
import type { PublicPosition } from "@/components/PublicDraftBoard";
import {
  Loader2,
  ArrowLeft,
  Trophy,
  TrendingUp,
  Award,
  Sparkles,
  Droplet,
  FlaskConical,
  Zap,
  Users,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PublicEntity {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  description?: string | null;
  todayOrders?: number;
  weekOverWeekGrowth?: number;
  uniqueUsers?: number;
  trendScore?: number;
  totalPoints?: number;
  tier?: string;
  isViral?: boolean;
  popularityRank?: number;
  marketShare?: number;
}

interface LineupSlot {
  position: PublicPosition;
  entity: PublicEntity | null;
}

interface TeamData {
  id: number;
  name: string;
  userName?: string;
  lineup: LineupSlot[];
  totalScore: number;
}

const POSITION_ICONS: Record<PublicPosition, React.ReactNode> = {
  legendary_strain: <Award className="w-4 h-4" />,
  trending_strain: <TrendingUp className="w-4 h-4" />,
  effect_category: <Sparkles className="w-4 h-4" />,
  consumption_type: <FlaskConical className="w-4 h-4" />,
  terpene_profile: <Droplet className="w-4 h-4" />,
};

const POSITION_LABELS: Record<PublicPosition, string> = {
  legendary_strain: "Legendary Strain",
  trending_strain: "Trending Strain",
  effect_category: "Effect Category",
  consumption_type: "Consumption Type",
  terpene_profile: "Terpene Profile",
};

export default function PublicChallenge() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"game" | "draft" | "stats">("game");

  // Fetch league data from regular leagues table (challenges are stored there)
  const { data: league, isLoading: leagueLoading } = trpc.league.getById.useQuery(
    { leagueId: Number(leagueId) },
    { enabled: !!leagueId }
  );

  // Fetch available entities for drafting
  const { data: legendaryStrains = [] } = trpc.publicMode.getLegendaryStrains.useQuery({
    limit: 50,
  });
  const { data: trendingStrains = [] } = trpc.publicMode.getTrendingStrains.useQuery({
    limit: 50,
  });
  const { data: effectCategories = [] } = trpc.publicMode.getEffectCategories.useQuery({
    limit: 50,
  });
  const { data: consumptionTypes = [] } = trpc.publicMode.getConsumptionTypes.useQuery({
    limit: 50,
  });
  const { data: terpeneProfiles = [] } = trpc.publicMode.getTerpeneProfiles.useQuery({
    limit: 50,
  });

  // Mock team data (replace with real data from API)
  const [myTeam, setMyTeam] = useState<TeamData>({
    id: 1,
    name: "My Team",
    userName: user?.name || "Player 1",
    lineup: [
      { position: "legendary_strain", entity: null },
      { position: "trending_strain", entity: null },
      { position: "effect_category", entity: null },
      { position: "consumption_type", entity: null },
      { position: "terpene_profile", entity: null },
    ],
    totalScore: 0,
  });

  const [opponentTeam, setOpponentTeam] = useState<TeamData>({
    id: 2,
    name: "Opponent Team",
    userName: "Player 2",
    lineup: [
      { position: "legendary_strain", entity: null },
      { position: "trending_strain", entity: null },
      { position: "effect_category", entity: null },
      { position: "consumption_type", entity: null },
      { position: "terpene_profile", entity: null },
    ],
    totalScore: 0,
  });

  // Draft pick mutation
  const draftPickMutation = trpc.publicMode.setLineup.useMutation({
    onSuccess: () => {
      toast.success("Lineup updated!");
    },
    onError: (error) => {
      toast.error(`Failed to update lineup: ${error.message}`);
    },
  });

  const handleDraftPick = (position: PublicPosition, entityId: number) => {
    // Find the entity from available entities
    let entity: PublicEntity | null = null;

    if (position === "legendary_strain") {
      entity = legendaryStrains.find(e => e.id === entityId) || null;
    } else if (position === "trending_strain") {
      entity = trendingStrains.find(e => e.id === entityId) || null;
    } else if (position === "effect_category") {
      entity = effectCategories.find(e => e.id === entityId) || null;
    } else if (position === "consumption_type") {
      entity = consumptionTypes.find(e => e.id === entityId) || null;
    } else if (position === "terpene_profile") {
      entity = terpeneProfiles.find(e => e.id === entityId) || null;
    }

    if (!entity) {
      toast.error("Entity not found");
      return;
    }

    // Update lineup
    const updatedLineup = myTeam.lineup.map(slot =>
      slot.position === position ? { ...slot, entity } : slot
    );

    setMyTeam({
      ...myTeam,
      lineup: updatedLineup,
      totalScore: updatedLineup.reduce((sum, slot) => sum + (slot.entity?.totalPoints || 0), 0),
    });

    // Call API to save lineup
    draftPickMutation.mutate({
      teamId: myTeam.id,
      leagueId: Number(leagueId),
      legendaryStrainId: position === "legendary_strain" ? entityId : undefined,
      trendingStrainId: position === "trending_strain" ? entityId : undefined,
      effectCategoryId: position === "effect_category" ? entityId : undefined,
      consumptionTypeId: position === "consumption_type" ? entityId : undefined,
      terpeneProfileId: position === "terpene_profile" ? entityId : undefined,
    });
  };

  const handleRemovePick = (position: PublicPosition) => {
    const updatedLineup = myTeam.lineup.map(slot =>
      slot.position === position ? { ...slot, entity: null } : slot
    );

    setMyTeam({
      ...myTeam,
      lineup: updatedLineup,
      totalScore: updatedLineup.reduce((sum, slot) => sum + (slot.entity?.totalPoints || 0), 0),
    });
  };

  if (leagueLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-lg text-muted-foreground">League not found</p>
        <Button onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{league.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{league.gameMode}</Badge>
              <Badge variant="outline">{league.status}</Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="game">
            <Trophy className="w-4 h-4 mr-2" />
            Live Game
          </TabsTrigger>
          <TabsTrigger value="draft">
            <Users className="w-4 h-4 mr-2" />
            Draft Board
          </TabsTrigger>
          <TabsTrigger value="stats">
            <TrendingUp className="w-4 h-4 mr-2" />
            Stats
          </TabsTrigger>
        </TabsList>

        {/* Live Game Tab */}
        <TabsContent value="game" className="space-y-6">
          {/* Scoreboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Scoreboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {/* My Team */}
                <div className="text-center p-6 bg-primary/10 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">{myTeam.userName}</div>
                  <div className="text-4xl font-bold mb-2">{myTeam.totalScore}</div>
                  <div className="text-sm font-medium">{myTeam.name}</div>
                </div>

                {/* Opponent Team */}
                <div className="text-center p-6 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">{opponentTeam.userName}</div>
                  <div className="text-4xl font-bold mb-2">{opponentTeam.totalScore}</div>
                  <div className="text-sm font-medium">{opponentTeam.name}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lineup Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Lineup */}
            <Card>
              <CardHeader>
                <CardTitle>My Lineup</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {myTeam.lineup.map((slot) => (
                      <div
                        key={slot.position}
                        className="p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {POSITION_ICONS[slot.position]}
                          <span className="text-sm font-medium">
                            {POSITION_LABELS[slot.position]}
                          </span>
                        </div>
                        {slot.entity ? (
                          <div className="flex items-center gap-3">
                            {slot.entity.imageUrl && (
                              <img
                                src={slot.entity.imageUrl}
                                alt={slot.entity.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{slot.entity.name}</div>
                              <div className="text-sm text-primary">
                                {slot.entity.totalPoints} pts
                              </div>
                            </div>
                            {slot.entity.isViral && (
                              <Zap className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Empty</div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Opponent Lineup */}
            <Card>
              <CardHeader>
                <CardTitle>Opponent Lineup</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {opponentTeam.lineup.map((slot) => (
                      <div
                        key={slot.position}
                        className="p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {POSITION_ICONS[slot.position]}
                          <span className="text-sm font-medium">
                            {POSITION_LABELS[slot.position]}
                          </span>
                        </div>
                        {slot.entity ? (
                          <div className="flex items-center gap-3">
                            {slot.entity.imageUrl && (
                              <img
                                src={slot.entity.imageUrl}
                                alt={slot.entity.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{slot.entity.name}</div>
                              <div className="text-sm text-primary">
                                {slot.entity.totalPoints} pts
                              </div>
                            </div>
                            {slot.entity.isViral && (
                              <Zap className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Empty</div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Draft Board Tab */}
        <TabsContent value="draft">
          <Card>
            <CardContent className="p-0">
              <PublicDraftBoard
                leagueId={Number(leagueId)}
                teamId={myTeam.id}
                teamName={myTeam.name}
                lineup={myTeam.lineup}
                legendaryStrains={legendaryStrains as any[]}
                trendingStrains={trendingStrains as any[]}
                effectCategories={effectCategories as any[]}
                consumptionTypes={consumptionTypes as any[]}
                terpeneProfiles={terpeneProfiles as any[]}
                onDraftPick={handleDraftPick}
                onRemovePick={handleRemovePick}
                isLoading={false}
                isMyTurn={true}
                draftPending={draftPickMutation.isPending}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>League Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Statistics coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
