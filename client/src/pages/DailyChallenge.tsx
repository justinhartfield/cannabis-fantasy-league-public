import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveIndicator } from "@/components/LiveIndicator";
import ScoringCard, { adaptLegacyData } from "@/components/ScoringCard";
import { CoinFlip } from "@/components/CoinFlip";
import { BattleArena } from "@/components/BattleArena";
import { LeagueChat } from "@/components/LeagueChat";
import { ChallengeInviteLanding } from "@/components/ChallengeInviteLanding";
import type { ScoringPlayData } from "@/components/ScoringPlayOverlay";
import { ScoringPlayAnnouncement } from "@/components/ScoringPlayAnnouncement";
import { EntityHistoryModal } from "@/components/EntityHistoryModal";
import { GamePhaseIndicator, type GamePhaseData, type OvertimeData } from "@/components/GamePhaseIndicator";
import { HalftimeSubstitutionModal } from "@/components/HalftimeSubstitutionModal";

import {
  Loader2,
  ArrowLeft,
  Trophy,
  UserPlus,
  Copy,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useWebSocket } from "@/hooks/useWebSocket";
import { TeamAvatar } from "@/components/TeamAvatar";

interface TeamScore {
  teamId: number;
  teamName: string;
  points: number;
  rank?: number;
  userAvatarUrl?: string | null;
  userName?: string | null;
  fighterIllustration?: string | null;
  battlefieldBackground?: string | null;
}

interface ChallengeSummary {
  id: number;
  name: string;
  status: string;
  currentWeek: number;
  seasonYear: number;
  updatedAt?: string;
  createdAt?: string;
}

// Types for enhanced breakdown caching (for client-side delta detection)
type AssetType = 'manufacturer' | 'cannabis_strain' | 'product' | 'pharmacy' | 'brand';

interface CachedAssetBreakdown {
  assetType: AssetType;
  assetId: number;
  assetName: string;
  position: string;
  points: number;
  imageUrl?: string | null;
}

interface CachedTeamBreakdown {
  teamId: number;
  teamName: string;
  totalPoints: number;
  assets: CachedAssetBreakdown[];
}

interface BreakdownCache {
  teams: Record<number, CachedTeamBreakdown>;
  timestamp: number;
}

/**
 * Detect scoring plays by comparing cached breakdowns with new breakdowns
 * Mirrors server-side logic in scoreBroadcaster.ts
 */
function detectClientScoringPlays(
  cachedBreakdowns: BreakdownCache | null,
  newBreakdowns: Record<number, CachedTeamBreakdown>
): ScoringPlayData[] {
  const plays: ScoringPlayData[] = [];

  // Need cached data to compare against (skip first load)
  if (!cachedBreakdowns || Object.keys(cachedBreakdowns.teams).length === 0) {
    return plays;
  }

  const teamIds = Object.keys(newBreakdowns).map(Number);
  if (teamIds.length < 2) return plays;

  // Check each team's assets for changes since cached snapshot
  for (const teamId of teamIds) {
    const newTeam = newBreakdowns[teamId];
    const cachedTeam = cachedBreakdowns.teams[teamId];
    if (!newTeam || !cachedTeam) continue;

    const opponentId = teamIds.find(id => id !== teamId);
    if (!opponentId) continue;
    const opponent = newBreakdowns[opponentId];
    if (!opponent) continue;

    // Build lookup for cached assets
    const cachedAssetMap = new Map<string, CachedAssetBreakdown>();
    for (const asset of cachedTeam.assets) {
      cachedAssetMap.set(`${asset.assetType}:${asset.assetId}`, asset);
    }

    // Compare each asset in new breakdown
    for (const asset of newTeam.assets) {
      const key = `${asset.assetType}:${asset.assetId}`;
      const cachedAsset = cachedAssetMap.get(key);
      const previousPoints = cachedAsset?.points || 0;
      let delta = asset.points - previousPoints;

      // Cap delta at asset's total points
      if (delta > asset.points) {
        delta = asset.points;
      }

      // Only generate plays for real changes (deltas > 0.5 points)
      if (delta > 0.5) {
        plays.push({
          attackingTeamId: teamId,
          attackingTeamName: newTeam.teamName,
          defendingTeamId: opponentId,
          defendingTeamName: opponent.teamName,
          playerName: asset.assetName,
          playerType: asset.assetType,
          pointsScored: Math.round(delta * 10) / 10,
          attackerNewTotal: newTeam.totalPoints,
          defenderTotal: opponent.totalPoints,
          imageUrl: asset.imageUrl,
          position: asset.position,
        });
      }
    }
  }

  // Sort plays by points scored (most exciting plays last)
  plays.sort((a, b) => a.pointsScored - b.pointsScored);
  return plays;
}

/**
 * Convert breakdown API response to cacheable format
 */
function breakdownToCacheFormat(
  teamId: number,
  teamName: string,
  totalPoints: number,
  breakdowns: any[] | undefined
): CachedTeamBreakdown {
  const assets: CachedAssetBreakdown[] = [];

  if (breakdowns) {
    for (const item of breakdowns) {
      if (!item.assetId || !item.assetType) continue;
      assets.push({
        assetType: item.assetType as AssetType,
        assetId: item.assetId,
        assetName: item.assetName || `Unknown ${item.assetType}`,
        position: item.position || 'unknown',
        points: item.breakdown?.total ?? item.totalPoints ?? 0,
        imageUrl: item.imageUrl || null,
      });
    }
  }

  return { teamId, teamName, totalPoints, assets };
}

export default function DailyChallenge() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const challengeId = parseInt(id || "0", 10);

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [winner, setWinner] = useState<{ teamId: number; teamName: string; points: number } | null>(null);
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [coinFlipWinner, setCoinFlipWinner] = useState<{ teamId: number; teamName: string } | null>(null);

  // Scoring play state for battle animations
  const [currentScoringPlay, setCurrentScoringPlay] = useState<ScoringPlayData | null>(null);
  const scoringPlayQueueRef = useRef<ScoringPlayData[]>([]);
  const isPlayingRef = useRef(false);
  const lastPlayedRef = useRef<ScoringPlayData | null>(null);

  // Recent plays feed (last 3 scoring plays with timestamps)
  const [recentPlays, setRecentPlays] = useState<(ScoringPlayData & { timestamp: Date })[]>([]);

  // Selected entity for profile modal
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'manufacturer' | 'pharmacy' | 'brand' | 'product' | 'strain';
    id: number;
    name: string;
    image?: string | null;
  } | null>(null);

  // Live display scores - updated incrementally with each scoring play for realistic effect
  // Map of teamId -> current display score
  const [liveScores, setLiveScores] = useState<Map<number, number>>(new Map());
  const lastScoreSyncRef = useRef<number>(0);

  // Disable browser's automatic scroll restoration on mount
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  // Cleanup spread timer on unmount
  useEffect(() => {
    return () => {
      if (clientPlaySpreadTimerRef.current) {
        clearInterval(clientPlaySpreadTimerRef.current);
        clientPlaySpreadTimerRef.current = null;
      }
    };
  }, []);

  // Track if we've scrolled to top after content loads
  const hasScrolledRef = useRef(false);

  // Cache scores in localStorage for instant display on page load
  const SCORE_CACHE_KEY = `challenge-${challengeId}-scores`;
  const BREAKDOWN_CACHE_KEY = `challenge-${challengeId}-breakdowns`;

  const [cachedScores, setCachedScores] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(SCORE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          // Check if cache is less than 1 hour old
          if (Date.now() - parsed.timestamp < 3600000) {
            console.log('[ScoreCache] Loaded cached scores from localStorage');
            return parsed.scores;
          }
        }
      } catch (e) {
        console.error('[ScoreCache] Failed to parse cached scores', e);
      }
    }
    return [];
  });

  // Cache breakdowns for client-side delta detection
  const [cachedBreakdowns, setCachedBreakdowns] = useState<BreakdownCache | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(BREAKDOWN_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as BreakdownCache;
          // Check if cache is less than 1 hour old
          if (Date.now() - parsed.timestamp < 3600000) {
            console.log('[BreakdownCache] Loaded cached breakdowns from localStorage');
            return parsed;
          }
        }
      } catch (e) {
        console.error('[BreakdownCache] Failed to parse cached breakdowns', e);
      }
    }
    return null;
  });

  // Client-side play spread timer ref
  const clientPlaySpreadTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    data: league,
    isLoading: leagueLoading,
    isError: leagueError,
    refetch: refetchLeague,
  } = trpc.league.getById.useQuery(
    { leagueId: challengeId },
    { enabled: !!challengeId && isAuthenticated }
  );

  const statDate = useMemo(() => {
    if (!league?.createdAt) return null;
    return new Date(league.createdAt).toISOString().split('T')[0];
  }, [league]);
  
  // Use league's seasonYear and currentWeek directly to match how lineups are saved
  // This ensures we query the same year/week that the draft saved the lineup under
  const currentYear = league?.seasonYear || new Date().getFullYear();
  const currentWeek = league?.currentWeek || 1;
  
  console.log(`[DailyChallenge] Using league year=${currentYear}, week=${currentWeek} for lineup query`);
  const challengeDateLabel = useMemo(() => {
    if (!statDate) return new Date().toLocaleDateString();
    return new Date(statDate).toLocaleDateString();
  }, [statDate]);
  const isTodayChallenge = useMemo(() => {
    if (!statDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return statDate === today;
  }, [statDate]);

  const {
    data: dayScores,
    isLoading: scoresLoading,
    isError: scoresError,
    error: scoresErrorDetails,
    refetch: refetchScores,
  } = trpc.scoring.getChallengeDayScores.useQuery(
    {
      challengeId,
      statDate: statDate || '',
    },
    {
      enabled: !!league && !!statDate,
      retry: 3,
      retryDelay: 1000,
      refetchInterval: 30000, // Poll every 30s as fallback if WS fails
    }
  );

  const {
    data: breakdown,
    isLoading: breakdownLoading,
    refetch: refetchBreakdown,
  } = trpc.scoring.getChallengeDayBreakdown.useQuery(
    {
      challengeId,
      teamId: selectedTeamId || 0,
      statDate: statDate || '',
    },
    {
      enabled: !!selectedTeamId && !!statDate,
    }
  );

  // Get opponent team ID for breakdown fetching
  const opponentTeamId = useMemo(() => {
    if (!league?.teams || league.teams.length < 2 || !selectedTeamId) return null;
    const opponent = league.teams.find((t: any) => t.id !== selectedTeamId);
    return opponent?.id || null;
  }, [league?.teams, selectedTeamId]);

  // Fetch opponent team's breakdown for delta detection
  const {
    data: opponentBreakdown,
    refetch: refetchOpponentBreakdown,
  } = trpc.scoring.getChallengeDayBreakdown.useQuery(
    {
      challengeId,
      teamId: opponentTeamId || 0,
      statDate: statDate || '',
    },
    {
      enabled: !!opponentTeamId && !!statDate,
    }
  );

  const { data: userLeagues } = trpc.league.list.useQuery(undefined, {
    enabled: !!isAuthenticated,
  });

  // Game phase data for halftime/overtime timer
  const {
    data: gamePhaseData,
    refetch: refetchGamePhase,
  } = trpc.league.getChallengeGamePhase.useQuery(
    { challengeId },
    {
      enabled: !!challengeId && league?.leagueType === 'challenge',
      refetchInterval: 10000, // Refresh every 10 seconds for timer accuracy
    }
  );

  // State for halftime substitution modal
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);

  const {
    data: teamLineup,
    isLoading: teamLineupLoading,
    refetch: refetchLineup,
  } = trpc.lineup.getWeeklyLineup.useQuery(
    {
      teamId: selectedTeamId || 0,
      year: currentYear,
      week: currentWeek,
    },
    {
      enabled: !!selectedTeamId,
    }
  );

  // Get the tRPC utils for cache invalidation
  const trpcUtils = trpc.useUtils();

  // Captain selection mutation
  const setCaptainMutation = trpc.lineup.setCaptain.useMutation({
    onSuccess: async () => {
      toast.success("Captain set! Recalculating scores...");

      // Invalidate all relevant caches to ensure fresh data
      await trpcUtils.lineup.getWeeklyLineup.invalidate();
      await trpcUtils.scoring.getChallengeDayBreakdown.invalidate();
      await trpcUtils.scoring.getChallengeDayScores.invalidate();

      // Refetch lineup immediately
      refetchLineup();

      // Refetch breakdown and scores after delay to allow recalculation to complete
      setTimeout(async () => {
        // Invalidate again and refetch
        await trpcUtils.scoring.getChallengeDayBreakdown.invalidate();
        await trpcUtils.scoring.getChallengeDayScores.invalidate();
        refetchBreakdown();
        refetchScores();
      }, 2000);

      // Final refresh after 4 seconds
      setTimeout(async () => {
        await trpcUtils.scoring.getChallengeDayBreakdown.invalidate();
        refetchBreakdown();
        refetchScores();
        toast.success("Scores updated with Captain bonus!");
      }, 4000);
    },
    onError: (error) => {
      toast.error(`Failed to set captain: ${error.message}`);
    },
  });

  // Check if user's team already has a captain set
  const userTeamHasCaptain = useMemo(() => {
    if (!teamLineup) return false;
    return !!(teamLineup.captainId && teamLineup.captainType);
  }, [teamLineup]);

  // Find user's team from the league
  const userTeamFromLeague = useMemo(() => {
    if (!league?.teams || !user?.id) return null;
    return league.teams.find((team: any) => team.userId === user.id) || null;
  }, [league, user]);

  // Check if the selected team belongs to the current user
  const isUserTeamSelected = useMemo(() => {
    if (!selectedTeamId || !userTeamFromLeague) return false;
    return selectedTeamId === userTeamFromLeague.id;
  }, [selectedTeamId, userTeamFromLeague]);

  // Handle captain selection
  const handleSetCaptain = useCallback((assetId: number, assetType: string) => {
    if (!selectedTeamId || !isUserTeamSelected || userTeamHasCaptain) return;

    setCaptainMutation.mutate({
      teamId: selectedTeamId,
      year: currentYear,
      week: currentWeek,
      captainId: assetId,
      captainType: assetType as "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand",
    });
  }, [selectedTeamId, isUserTeamSelected, userTeamHasCaptain, currentYear, currentWeek, setCaptainMutation]);

  // Handle player name click to show profile modal
  const handlePlayerNameClick = useCallback((assetId: number, assetType: string, assetName: string, imageUrl?: string | null) => {
    // Map cannabis_strain to strain for the EntityHistoryModal
    const entityType = assetType === 'cannabis_strain' ? 'strain' : assetType as 'manufacturer' | 'pharmacy' | 'brand' | 'product' | 'strain';
    setSelectedEntity({
      type: entityType,
      id: assetId,
      name: assetName,
      image: imageUrl,
    });
  }, []);

  // Scroll to top when content finishes loading (not during loading state)
  const isStillLoading = !challengeId || authLoading || leagueLoading || scoresLoading;

  useEffect(() => {
    // Only scroll once when loading completes
    if (!isStillLoading && !hasScrolledRef.current) {
      hasScrolledRef.current = true;

      // Immediate scroll
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      // Backup scroll after a tiny delay (for any async rendering)
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      });
    }
  }, [isStillLoading]);

  const isAdmin = user?.role === "admin";

  // Score sync mutation - used for both auto-sync and manual sync
  const syncScoresMutation = trpc.scoring.calculateChallengeDay.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        console.log(`[ScoreSync] Synced! ${result.playsQueued || 0} updates queued`);
        // Force liveScores to update from server on next dayScores fetch
        hasReceivedWsUpdateRef.current = false;
        refetchScores();
        // Refetch BOTH team breakdowns for delta detection
        if (selectedTeamId) refetchBreakdown();
        if (opponentTeamId) refetchOpponentBreakdown();
        // Show toast for user feedback
        toast.success("Scores refreshed!");
      } else {
        console.warn('[ScoreSync] Sync returned unsuccessful:', result.message);
        pendingClientDeltaCheckRef.current = false;
      }
    },
    onError: (error) => {
      console.error('[ScoreSync] Sync failed:', error.message);
      toast.error('Score sync failed');
      pendingClientDeltaCheckRef.current = false;
    },
  });

  // Track when we're doing a manual or visibility-triggered sync for client-side delta detection
  const pendingClientDeltaCheckRef = useRef(false);

  const handleManualSync = useCallback(() => {
    if (!statDate || syncScoresMutation.isPending) return;

    // Mark that we want to do client-side delta detection after sync completes
    pendingClientDeltaCheckRef.current = true;

    syncScoresMutation.mutate({ challengeId, statDate });
  }, [challengeId, statDate, syncScoresMutation]);

  // Auto-sync refs (effect is defined after useWebSocket to access isConnected)
  const hasAutoSyncedRef = useRef(false);
  const lastSyncTimeRef = useRef(0);

  // Get user's team ID for WebSocket
  const userTeamId = useMemo(() => {
    if (!league?.teams || !user?.id) return undefined;
    const team = league.teams.find((t: any) => t.userId === user.id);
    return team?.id;
  }, [league, user]);

  // Remaining substitutions for halftime modal
  const { data: subsData, refetch: refetchSubs } = trpc.league.getRemainingSubstitutions.useQuery(
    { challengeId, teamId: userTeamId || 0 },
    { enabled: !!userTeamId && !!gamePhaseData?.isHalftimePassed && !gamePhaseData?.isInOvertime }
  );

  // Function to play next scoring play from queue (single play with extended timing)
  const playNextScoringPlay = useCallback(() => {
    // Move to next play in queue
    if (scoringPlayQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      lastPlayedRef.current = null;
      setCurrentScoringPlay(null);
      return;
    }

    // Get next play from queue
    isPlayingRef.current = true;
    const nextPlay = scoringPlayQueueRef.current.shift()!;
    lastPlayedRef.current = nextPlay;
    setCurrentScoringPlay(nextPlay);
  }, []);

  // Handle scoring play completion (called when announcement finishes)
  const handleScoringPlayComplete = useCallback(() => {
    // Small delay before next play (or repeat) for visual clarity
    setTimeout(() => {
      playNextScoringPlay();
    }, 500);
  }, [playNextScoringPlay]);

  /**
   * Queue scoring plays with spread timer (mirrors server-side logic)
   * Spreads plays over 10 minutes for a realistic broadcast feel
   */
  const queueClientPlaysForDisplay = useCallback((plays: ScoringPlayData[], spreadOverMinutes: number = 10) => {
    if (plays.length === 0) return;

    // Clear any existing spread timer
    if (clientPlaySpreadTimerRef.current) {
      clearInterval(clientPlaySpreadTimerRef.current);
      clientPlaySpreadTimerRef.current = null;
    }

    // Calculate interval between plays
    const totalTimeMs = spreadOverMinutes * 60 * 1000;
    const intervalMs = Math.max(
      15000, // Minimum 15 seconds between plays
      Math.floor(totalTimeMs / plays.length)
    );

    console.log(
      `[ClientPlayQueue] Queueing ${plays.length} plays over ${spreadOverMinutes} min ` +
      `(${Math.round(intervalMs / 1000)}s apart)`
    );

    // Create a copy of plays to work with
    const pendingPlays = [...plays];

    // Queue first play immediately
    const firstPlay = pendingPlays.shift();
    if (firstPlay) {
      scoringPlayQueueRef.current.push(firstPlay);
      setRecentPlays(prev => [{ ...firstPlay, timestamp: new Date() }, ...prev].slice(0, 10));

      // Update live scores from this play
      setLiveScores(prev => {
        const updated = new Map(prev);
        updated.set(firstPlay.attackingTeamId, firstPlay.attackerNewTotal);
        updated.set(firstPlay.defendingTeamId, firstPlay.defenderTotal);
        return updated;
      });

      // Start playing if not already
      if (!isPlayingRef.current) {
        playNextScoringPlay();
      }
      setLastUpdateTime(new Date());
    }

    // Schedule remaining plays
    if (pendingPlays.length > 0) {
      let playIndex = 0;
      clientPlaySpreadTimerRef.current = setInterval(() => {
        if (playIndex >= pendingPlays.length) {
          if (clientPlaySpreadTimerRef.current) {
            clearInterval(clientPlaySpreadTimerRef.current);
            clientPlaySpreadTimerRef.current = null;
          }
          return;
        }

        const play = pendingPlays[playIndex];
        playIndex++;

        scoringPlayQueueRef.current.push(play);
        setRecentPlays(prev => [{ ...play, timestamp: new Date() }, ...prev].slice(0, 10));

        // Update live scores
        setLiveScores(prev => {
          const updated = new Map(prev);
          updated.set(play.attackingTeamId, play.attackerNewTotal);
          updated.set(play.defendingTeamId, play.defenderTotal);
          return updated;
        });

        // Start playing if not already
        if (!isPlayingRef.current) {
          playNextScoringPlay();
        }
        setLastUpdateTime(new Date());

        console.log(`[ClientPlayQueue] Queued: ${play.playerName} (+${play.pointsScored}) (${pendingPlays.length - playIndex} remaining)`);
      }, intervalMs);
    }
  }, [playNextScoringPlay]);

  // WebSocket connection for real-time updates
  const { isConnected } = useWebSocket({
    userId: user?.id || 0,
    leagueId: challengeId,
    teamId: userTeamId,
    onMessage: (message) => {
      console.log('[WS] Received message:', message.type);
      if (message.type === 'challenge_score_update') {
        console.log('[WS] challenge_score_update received:', {
          msgStatDate: message.statDate,
          currentStatDate: statDate,
          scores: message.scores,
        });
        if (message.statDate && statDate && message.statDate !== statDate) {
          console.log('[WS] Ignoring update - dates dont match');
          return;
        }
        setLastUpdateTime(new Date(message.updateTime));
        hasReceivedWsUpdateRef.current = false; // Allow server scores to update
        refetchScores();

        // Update liveScores directly from WebSocket message for immediate feedback
        if (message.scores && Array.isArray(message.scores)) {
          const newLiveScores = new Map(liveScores);
          let hasChanges = false;
          message.scores.forEach((s: { teamId: number; points: number }) => {
            const oldScore = newLiveScores.get(s.teamId);
            if (oldScore !== s.points) {
              newLiveScores.set(s.teamId, s.points);
              hasChanges = true;
              console.log(`[WS] Score update: Team ${s.teamId}: ${oldScore} -> ${s.points}`);
            }
          });
          if (hasChanges) {
            setLiveScores(newLiveScores);
            toast.info("Scores updated!");
          } else {
            console.log('[WS] No score changes detected');
          }
        }
      } else if (message.type === 'challenge_finalized') {
        if (message.statDate && statDate && message.statDate !== statDate) {
          return;
        }
        setWinner(message.winner);
        setLastUpdateTime(new Date(message.finalizedAt));
        refetchScores();
        toast.success(`Challenge complete! Winner: ${message.winner.teamName}`);
      } else if (message.type === 'second_player_joined') {
        toast.success("Dein Gegner ist beigetreten! Der Münzwurf beginnt...");
        setShowCoinFlip(true);
      } else if (message.type === 'coin_flip_result') {
        setCoinFlipWinner({
          teamId: message.winnerTeamId,
          teamName: message.winnerTeamName
        });
        // After showing result, redirect to draft
        setTimeout(() => {
          setLocation(`/challenge/${challengeId}/draft`);
        }, 5000);
      } else if (message.type === 'scoring_play') {
        // Mark that we've received WS updates (don't overwrite with server data)
        hasReceivedWsUpdateRef.current = true;

        // Queue the scoring play for battle animation
        const scoringPlay: ScoringPlayData = {
          attackingTeamId: message.attackingTeamId,
          attackingTeamName: message.attackingTeamName,
          defendingTeamId: message.defendingTeamId,
          defendingTeamName: message.defendingTeamName,
          playerName: message.playerName,
          playerType: message.playerType,
          pointsScored: message.pointsScored,
          attackerNewTotal: message.attackerNewTotal,
          defenderTotal: message.defenderTotal,
          imageUrl: message.imageUrl,
          position: message.position,
        };

        scoringPlayQueueRef.current.push(scoringPlay);

        // Add to recent plays feed with timestamp (keep last 10)
        setRecentPlays(prev => [{ ...scoringPlay, timestamp: new Date() }, ...prev].slice(0, 10));

        // Update live display scores incrementally (this is the key for realistic feel!)
        // Don't show final total immediately - let it build up with each play
        setLiveScores(prev => {
          const updated = new Map(prev);
          updated.set(message.attackingTeamId, message.attackerNewTotal);
          updated.set(message.defendingTeamId, message.defenderTotal);
          return updated;
        });

        // Start playing if not already
        if (!isPlayingRef.current) {
          playNextScoringPlay();
        }

        // Update last update time (but don't refetch - we're using live scores!)
        setLastUpdateTime(new Date());

        // Only sync with server every 30 seconds to avoid overwriting live scores
        const now = Date.now();
        if (now - lastScoreSyncRef.current > 30000) {
          lastScoreSyncRef.current = now;
          refetchScores();
        }
      }
    },
    autoConnect: !!challengeId && !!user?.id,
  });

  // Track whether we've received any WebSocket score updates (to avoid overwriting live data)
  const hasReceivedWsUpdateRef = useRef(false);

  // Reset WS update flag when connection drops so polling can take over
  useEffect(() => {
    if (!isConnected) {
      hasReceivedWsUpdateRef.current = false;
    }
  }, [isConnected]);

  // Update cache and live scores when new scores arrive from server
  useEffect(() => {
    if (dayScores && dayScores.length > 0) {
      setCachedScores(dayScores);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(SCORE_CACHE_KEY, JSON.stringify({
            scores: dayScores,
            timestamp: Date.now()
          }));
          console.log('[ScoreCache] Updated cached scores in localStorage');
        } catch (e) {
          console.error('[ScoreCache] Failed to cache scores', e);
        }
      }

      // Initialize or update live scores from server scores
      // - Initialize when empty
      // - Update when server has higher scores and we haven't received WS updates
      //   (WS updates are incremental and should take precedence)
      // Check if server has different scores than local state
      const serverScoresDiffer = dayScores.some(score => {
        const liveScore = liveScores.get(score.teamId);
        return (score.points || 0) !== (liveScore || 0);
      });

      // Update liveScores from server when:
      // 1. We don't have any live scores yet (initial load)
      // 2. Server scores are different AND (we haven't just received a WS update OR we are disconnected)
      //    (WS updates are incremental, so we trust them over server for a brief period, unless WS is down)
      if (liveScores.size === 0 || (serverScoresDiffer && (!hasReceivedWsUpdateRef.current || !isConnected))) {
        const initialScores = new Map<number, number>();
        dayScores.forEach(score => {
          initialScores.set(score.teamId, score.points || 0);
        });
        setLiveScores(initialScores);
        console.log('[LiveScores] Updated from server scores:',
          dayScores.map(s => `${s.teamId}:${s.points}`).join(', '));
      }
    }
  }, [dayScores, SCORE_CACHE_KEY, liveScores]);

  // Client-side delta detection: watch for breakdown changes and detect scoring plays
  useEffect(() => {
    // Need both breakdowns and a pending check flag
    if (!pendingClientDeltaCheckRef.current) return;
    if (!breakdown?.breakdowns || !opponentBreakdown?.breakdowns) return;
    if (!selectedTeamId || !opponentTeamId) return;
    if (!dayScores || dayScores.length < 2) return;

    // Build new breakdowns object for comparison
    const selectedTeamScore = dayScores.find(s => s.teamId === selectedTeamId);
    const opponentTeamScore = dayScores.find(s => s.teamId === opponentTeamId);
    if (!selectedTeamScore || !opponentTeamScore) return;

    const newBreakdowns: Record<number, CachedTeamBreakdown> = {
      [selectedTeamId]: breakdownToCacheFormat(
        selectedTeamId,
        selectedTeamScore.teamName || `Team ${selectedTeamId}`,
        selectedTeamScore.points || 0,
        breakdown.breakdowns
      ),
      [opponentTeamId]: breakdownToCacheFormat(
        opponentTeamId,
        opponentTeamScore.teamName || `Team ${opponentTeamId}`,
        opponentTeamScore.points || 0,
        opponentBreakdown.breakdowns
      ),
    };

    // Detect plays comparing cached vs new
    const plays = detectClientScoringPlays(cachedBreakdowns, newBreakdowns);

    console.log(`[ClientDelta] Detected ${plays.length} scoring plays from cache comparison`);

    // Queue plays for display with 10 minute spread
    if (plays.length > 0) {
      queueClientPlaysForDisplay(plays, 10);
    }

    // Update the cache with new breakdowns
    const newCache: BreakdownCache = {
      teams: newBreakdowns,
      timestamp: Date.now(),
    };
    setCachedBreakdowns(newCache);

    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(BREAKDOWN_CACHE_KEY, JSON.stringify(newCache));
        console.log('[BreakdownCache] Saved breakdowns to localStorage');
      } catch (e) {
        console.error('[BreakdownCache] Failed to save breakdowns', e);
      }
    }

    // Clear the pending flag
    pendingClientDeltaCheckRef.current = false;
  }, [
    breakdown,
    opponentBreakdown,
    selectedTeamId,
    opponentTeamId,
    dayScores,
    cachedBreakdowns,
    queueClientPlaysForDisplay,
    BREAKDOWN_CACHE_KEY
  ]);

  // Auto-sync scores when WebSocket connects to ensure real-time updates flow
  // This triggers a score calculation while the client is in the broadcast channel
  useEffect(() => {
    // Only auto-sync once per mount
    if (hasAutoSyncedRef.current) return;

    // Wait for WebSocket to connect first (most important for receiving broadcasts)
    if (!isConnected) return;

    // Wait for data to load
    if (!league || !statDate || scoresLoading) return;

    // Only sync for active challenges
    if (league.status !== 'active') return;

    // Don't sync if mutation is already running
    if (syncScoresMutation.isPending) return;

    // Check if scores are missing (new game)
    const hasRealScores = dayScores && dayScores.length > 0 &&
      dayScores.some(score => (score.points || 0) > 0);

    // Always sync once when WS connects - this ensures we're in the broadcast channel
    // and will receive the challenge_score_update event
    console.log(`[ScoreSync] Auto-syncing on WS connect (hasScores: ${hasRealScores})`);
    hasAutoSyncedRef.current = true;
    lastSyncTimeRef.current = Date.now();

    // Enable client-side delta detection for page load/refresh
    pendingClientDeltaCheckRef.current = true;

    syncScoresMutation.mutate({ challengeId, statDate });
  }, [league, statDate, dayScores, scoresLoading, syncScoresMutation, challengeId, isConnected]);

  // Visibility change listener: detect when page becomes visible (screen wake, tab switch)
  // and trigger delta detection to show any score changes that happened while away
  useEffect(() => {
    if (!statDate || !league || league.status !== 'active') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible - check for score changes
        const timeSinceLastSync = Date.now() - lastSyncTimeRef.current;

        // Only sync if more than 30 seconds since last sync
        if (timeSinceLastSync > 30000 && !syncScoresMutation.isPending) {
          console.log('[Visibility] Page visible, checking for score changes...');
          lastSyncTimeRef.current = Date.now();

          // Enable client-side delta detection
          pendingClientDeltaCheckRef.current = true;

          // Trigger sync and refetch
          syncScoresMutation.mutate({ challengeId, statDate });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [statDate, league, challengeId, syncScoresMutation]);

  // Show invite landing page for unauthenticated users
  // (Logged-in users always see the normal challenge page)
  if (!authLoading && !isAuthenticated) {
    return <ChallengeInviteLanding challengeId={challengeId} />;
  }

  // Helper to get fighter illustration from league teams
  const getFighterForTeam = useCallback((teamId: number) => {
    const team = league?.teams?.find((t: any) => t.id === teamId);
    return team?.fighterIllustration || null;
  }, [league?.teams]);

  // Helper to get battlefield background from league teams
  const getBackgroundForTeam = useCallback((teamId: number) => {
    const team = league?.teams?.find((t: any) => t.id === teamId);
    return team?.battlefieldBackground || null;
  }, [league?.teams]);

  // Redirect non-challenges back to league detail
  const baseTeamScores: TeamScore[] = useMemo(() => {
    // Always start with all teams from the league to ensure both teams show
    const allTeams: TeamScore[] = (league?.teams || []).map((team: any, index: number) => ({
      teamId: team.id,
      teamName: team.name || `Team ${index + 1}`,
      points: 0,
      userAvatarUrl: team.userAvatarUrl,
      userName: team.userName,
      fighterIllustration: team.fighterIllustration || null,
      battlefieldBackground: team.battlefieldBackground || null,
    }));

    // If we have day scores, merge them with all teams
    // BUT prefer liveScores when available (they update incrementally with each play)
    if (dayScores && dayScores.length > 0) {
      const scoreMap = new Map(dayScores.map((score) => [score.teamId, score]));
      return allTeams.map((team) => {
        const score = scoreMap.get(team.teamId);
        // Use live score if available (for real-time incremental updates)
        const liveScore = liveScores.get(team.teamId);
        if (score) {
          return {
            teamId: score.teamId,
            teamName: score.teamName || team.teamName,
            // Prefer liveScore for real-time feel, fall back to server score
            points: liveScore !== undefined ? liveScore : (score.points || 0),
            userAvatarUrl: score.userAvatarUrl || team.userAvatarUrl,
            userName: score.userName || team.userName,
            fighterIllustration: getFighterForTeam(score.teamId),
            battlefieldBackground: getBackgroundForTeam(score.teamId),
          };
        }
        return {
          ...team,
          points: liveScore !== undefined ? liveScore : team.points,
          fighterIllustration: getFighterForTeam(team.teamId),
          battlefieldBackground: getBackgroundForTeam(team.teamId),
        };
      });
    }

    // Fall back to cached scores merged with all teams
    if (cachedScores && cachedScores.length > 0) {
      console.log('[ScoreCache] Using cached scores for display');
      const scoreMap = new Map(cachedScores.map((score: any) => [score.teamId, score]));
      return allTeams.map((team) => {
        const score = scoreMap.get(team.teamId);
        const liveScore = liveScores.get(team.teamId);
        if (score) {
          return {
            teamId: score.teamId,
            teamName: score.teamName || team.teamName,
            points: liveScore !== undefined ? liveScore : (score.points || 0),
            userAvatarUrl: score.userAvatarUrl || team.userAvatarUrl,
            userName: score.userName || team.userName,
            fighterIllustration: getFighterForTeam(score.teamId),
            battlefieldBackground: getBackgroundForTeam(score.teamId),
          };
        }
        return {
          ...team,
          points: liveScore !== undefined ? liveScore : team.points,
          fighterIllustration: getFighterForTeam(team.teamId),
          battlefieldBackground: getBackgroundForTeam(team.teamId),
        };
      });
    }

    // Return all teams with live scores if available, otherwise 0 points
    return allTeams.map((team) => {
      const liveScore = liveScores.get(team.teamId);
      return {
        ...team,
        points: liveScore !== undefined ? liveScore : team.points,
        fighterIllustration: getFighterForTeam(team.teamId),
        battlefieldBackground: getBackgroundForTeam(team.teamId),
      };
    });
  }, [dayScores, cachedScores, league, getFighterForTeam, getBackgroundForTeam, liveScores]);

  const sortedScores: TeamScore[] = useMemo(() => {
    if (baseTeamScores.length === 0) return [];

    const hasLiveScores = dayScores && dayScores.length > 0;
    const list = hasLiveScores
      ? [...baseTeamScores].sort((a, b) => (b.points || 0) - (a.points || 0))
      : baseTeamScores;

    return list.map((score, index) => ({
      ...score,
      rank: index + 1,
    }));
  }, [baseTeamScores, dayScores]);

  // Track if scores were just synced for the first time
  const [scoresJustSynced, setScoresJustSynced] = useState(false);

  useEffect(() => {
    if (sortedScores.length > 0 && !selectedTeamId) {
      setSelectedTeamId(sortedScores[0].teamId);
      // Mark that we need to refetch breakdown after setting the team
      setScoresJustSynced(true);
    }
  }, [sortedScores, selectedTeamId]);

  // Refetch breakdown when selectedTeamId is set and scores were just synced
  useEffect(() => {
    if (scoresJustSynced && selectedTeamId && dayScores && dayScores.length > 0) {
      console.log('[AutoRefresh] Scores synced, refetching breakdown for team', selectedTeamId);
      refetchBreakdown();
      setScoresJustSynced(false);
    }
  }, [scoresJustSynced, selectedTeamId, dayScores, refetchBreakdown]);

  // Check for winner when challenge is complete (after sortedScores is defined)
  useEffect(() => {
    if (league?.status === 'complete' && sortedScores.length > 0 && !winner) {
      setWinner(sortedScores[0]);
    }
  }, [league, sortedScores, winner]);

  // Real-time updates now come via WebSocket from the server's scoreBroadcaster
  // No client-side polling needed - the server drip-feeds scoring plays automatically

  const leader = sortedScores[0];
  const challenger = sortedScores[1];
  const activeTeamCount = dayScores?.length ?? league?.teams?.length ?? 0;
  // userTeam is defined earlier as userTeamFromLeague
  const userTeam = userTeamFromLeague;
  const showInviteCard = (league?.teams?.length ?? 0) < (league?.teamCount ?? 2);
  const scoreDiff =
    leader && challenger ? (leader.points || 0) - (challenger.points || 0) : 0;

  const selectedTeam = useMemo(
    () => sortedScores.find((team) => team.teamId === selectedTeamId) || null,
    [sortedScores, selectedTeamId]
  );

  const topPerformers = useMemo<
    { name: string; type: string; total: number; breakdown: any; imageUrl?: string | null }[]
  >(() => {
    if (!breakdown || !breakdown.breakdowns) {
      return [];
    }
    return breakdown.breakdowns
      .map((item: any) => ({
        name: item.assetName || `Unknown ${item.assetType}`,
        type: item.assetType,
        total: item.breakdown?.total ?? item.totalPoints ?? 0,
        breakdown: item.breakdown,
        imageUrl: item.imageUrl || null,
      }))
      .sort((a: { total: number }, b: { total: number }) => b.total - a.total)
      .slice(0, 3);
  }, [breakdown]);



  const normalizedLineup = useMemo(
    () => normalizeLineup(teamLineup),
    [teamLineup]
  );


  if (
    !challengeId ||
    authLoading ||
    leagueLoading ||
    scoresLoading ||
    (selectedTeamId && breakdownLoading)
  ) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (leagueError || !league) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <div className="text-center space-y-4">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Challenge nicht gefunden
            </h2>
            <p className="text-muted-foreground mt-2">
              Diese Challenge existiert nicht oder wurde beendet.
            </p>
          </div>
          <Button onClick={() => setLocation("/")}>
            Zurück zum Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isLive = league.status === "active";

  return (
    <div className="min-h-screen gradient-dark">
      {/* Coin Flip Overlay */}
      {showCoinFlip && league?.teams && league.teams.length >= 2 && (
        <CoinFlip
          team1Name={league.teams[0]?.name || "Team 1"}
          team2Name={league.teams[1]?.name || "Team 2"}
          winnerTeamName={coinFlipWinner?.teamName || null}
        />
      )}

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Back Button and Title */}
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-2xl border border-white/10 text-white hover:bg-white/10"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{league.name}</h1>
          </div>
        </div>

        {/* Scoring Play Announcement Banner */}
        <ScoringPlayAnnouncement
          play={currentScoringPlay}
          duration={5000}
          onComplete={handleScoringPlayComplete}
        />

        {/* Battle Arena - Team mascot GIFs (clickable to select team) */}
        <BattleArena
          leftTeam={leader ? {
            teamId: leader.teamId,
            teamName: leader.teamName,
            userName: leader.userName,
            userAvatarUrl: leader.userAvatarUrl,
            fighterIllustration: leader.fighterIllustration,
            battlefieldBackground: leader.battlefieldBackground,
            points: leader.points,
          } : null}
          rightTeam={challenger ? {
            teamId: challenger.teamId,
            teamName: challenger.teamName,
            userName: challenger.userName,
            userAvatarUrl: challenger.userAvatarUrl,
            fighterIllustration: challenger.fighterIllustration,
            battlefieldBackground: challenger.battlefieldBackground,
            points: challenger.points,
          } : !challenger && league?.leagueCode ? null : null}
          isLive={isLive}
          challengeDate={challengeDateLabel}
          userTeamId={userTeam?.id}
          selectedTeamId={selectedTeamId}
          onFighterChange={() => refetchLeague()}
          onBackgroundChange={() => refetchLeague()}
          onTeamClick={(teamId) => setSelectedTeamId(teamId)}
          scoringPlay={currentScoringPlay}
        />


        {/* Invite Block (when waiting for opponent) */}
        {!challenger && league?.leagueCode && (
          <InviteBlock
            leagueCode={league.leagueCode}
            leagueId={challengeId}
            leagueName={league.name}
          />
        )}

        {/* Game Phase Timer - Shows halftime countdown, Power Hour, overtime meter */}
        {gamePhaseData && isLive && challenger && (
          <GamePhaseIndicator
            data={{
              phase: gamePhaseData.phase as GamePhaseData['phase'],
              halftimeAt: gamePhaseData.halftimeAt,
              endTime: gamePhaseData.endTime,
              halftimeScoreTeam1: gamePhaseData.halftimeScoreTeam1,
              halftimeScoreTeam2: gamePhaseData.halftimeScoreTeam2,
              isHalftimePassed: gamePhaseData.isHalftimePassed,
              isInOvertime: gamePhaseData.isInOvertime,
              overtimeEndTime: gamePhaseData.overtimeEndTime,
              durationHours: gamePhaseData.durationHours,
              isPowerHour: gamePhaseData.isPowerHour,
              powerHourMultiplier: gamePhaseData.powerHourMultiplier,
            }}
            overtimeData={gamePhaseData.isInOvertime ? {
              team1Score: leader?.points || 0,
              team2Score: challenger?.points || 0,
              team1Name: leader?.teamName,
              team2Name: challenger?.teamName,
              leadingTeamName: leader && challenger 
                ? (leader.points > challenger.points ? leader.teamName : challenger.teamName)
                : undefined,
              currentLead: Math.abs((leader?.points || 0) - (challenger?.points || 0)),
              winMarginRequired: 25,
              minutesRemaining: gamePhaseData.overtimeEndTime 
                ? Math.max(0, Math.ceil((new Date(gamePhaseData.overtimeEndTime).getTime() - Date.now()) / 60000))
                : undefined,
            } : undefined}
          />
        )}

        {/* Halftime Substitution Button */}
        {gamePhaseData?.phase === 'halftime_window' && userTeam && subsData && subsData.remaining > 0 && (
          <div className="flex justify-center">
            <Button
              onClick={() => setShowSubstitutionModal(true)}
              className="bg-green-600 hover:bg-green-500 text-white gap-2 animate-pulse"
            >
              <span className="text-lg">🔄</span>
              Make Halftime Substitution ({subsData.remaining} left)
            </Button>
          </div>
        )}

        {/* Status Bar with Live Feed - Double-click to manually sync */}
        <div
          className="rounded-2xl bg-white/5 border border-white/10 p-4 cursor-pointer select-none"
          onDoubleClick={handleManualSync}
          title="Double-click to sync scores"
        >
          <div className="flex flex-col gap-3">
            {/* Top Row: Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isLive ? <LiveIndicator size="sm" /> : <Badge variant="outline">Final</Badge>}
                {(league?.status === 'active' || league?.status === 'draft') && (
                  <span className="text-xs text-white/60">
                    {!isConnected && "Connecting..."}
                    {isConnected && lastUpdateTime && (
                      <>Game Stats Last Updated: {lastUpdateTime.toLocaleTimeString()}</>
                    )}
                    {isConnected && !lastUpdateTime && "Waiting for updates..."}
                    {syncScoresMutation.isPending && " • Syncing..."}
                  </span>
                )}
              </div>

            </div>

            {/* Recent Plays Feed - Left aligned with full width */}
            {recentPlays.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
                <span className="text-[10px] uppercase tracking-wider text-white/40">Recent Scoring Plays</span>
                {recentPlays.map((play, i) => (
                  <div
                    key={`${play.playerName}-${play.pointsScored}-${i}`}
                    className={cn(
                      "flex items-center gap-3 text-sm transition-opacity",
                      i === 0 ? "opacity-100" : i < 5 ? "opacity-80" : "opacity-60"
                    )}
                  >
                    <span className="text-white/40 text-xs tabular-nums min-w-[60px]">
                      {play.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-white font-medium flex-1">{play.playerName}</span>
                    <span className="text-white/50 text-xs hidden sm:inline">
                      for {play.attackingTeamName}
                    </span>
                    <Badge
                      className={cn(
                        "text-xs font-bold px-2 py-0.5",
                        play.pointsScored >= 10
                          ? "bg-primary/30 text-primary border border-primary/50"
                          : "bg-white/10 text-white/70 border border-white/20"
                      )}
                    >
                      +{play.pointsScored.toFixed(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Draft In Progress Banner */}
        {(league?.status === 'draft' || (league?.draftStarted === 1 && league?.draftCompleted === 0)) && league.teams?.length === 2 && (
          <Card className="gradient-card border-primary/50 glow-primary slide-in-bottom">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center glow-primary animate-pulse">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gradient-primary mb-2 headline-primary">
                    🎯 DRAFT IN PROGRESS
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Beide Spieler sind dabei, ihre Teams zu draften
                  </p>
                </div>
                <Button
                  onClick={() => setLocation(`/challenge/${challengeId}/draft`)}
                  className="gradient-primary"
                  size="lg"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Zum Draft Board
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Challenge Complete Banner */}
        {league?.status === 'complete' && winner && (
          <Card className="gradient-card border-border/50 glow-primary slide-in-bottom">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <Trophy className="w-16 h-16 text-yellow-500" />
                </div>
                <div className="flex items-center gap-3 justify-center">
                  <Trophy className="w-16 h-16 text-yellow-500" />
                  <h2 className="text-3xl font-bold text-gradient-primary mb-2 headline-primary">
                    Challenge Complete!
                  </h2>
                  <p className="text-xl text-foreground mb-1">
                    Winner: <span className="font-bold text-gradient-primary">{winner.teamName}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Final Score: {winner.points.toFixed(1)} points
                  </p>
                </div>
                {/* Smack Talk Chat */}
                <div className="pt-4">
                  <div className="rounded-[32px] bg-[#2a1027] border border-white/10 overflow-hidden">
                    <LeagueChat leagueId={challengeId} variant="dark" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Smack Talk Chat - Show when challenge is not complete */}
        {league?.status !== 'complete' && (
          <div className="rounded-[32px] bg-[#2a1027] border border-white/10 overflow-hidden">
            <LeagueChat leagueId={challengeId} variant="dark" />
          </div>
        )}

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.4em] text-white/40">
              Game Leaders
            </div>
            <div className="grid gap-3">
              {topPerformers.slice(0, 3).map((performer, index) => (
                <div
                  key={`${performer.name}-${index}`}
                  className="rounded-[26px] bg-[#2c101c] border border-white/10 px-5 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 rounded-full bg-[#cfff4d] text-black text-sm font-semibold">
                      #{index + 1}
                    </span>
                    {performer.imageUrl && (
                      <img
                        src={performer.imageUrl}
                        alt={performer.name}
                        className="w-12 h-12 rounded-xl object-cover border border-white/10"
                      />
                    )}
                    <div>
                      <div className="text-lg font-semibold">{performer.name}</div>
                      <div className="text-xs uppercase text-white/60">
                        {performer.type} • {performer.breakdown?.components?.length || 0} Komponenten
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-[#ff744d]">
                      {performer.total.toFixed(1)}
                    </div>
                    <div className="text-xs text-white/50">Total</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}



        {/* Detailed Breakdown */}
        {selectedTeamId && breakdown?.breakdowns?.length ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Scoring Breakdown
              </h3>
              {/* Captain Selection Hint */}
              {isUserTeamSelected && !userTeamHasCaptain && (
                <div className="flex items-center gap-2 text-xs text-yellow-400 animate-pulse">
                  <Crown className="w-4 h-4" />
                  <span>Click a player to make them Captain (2.5x Momentum Score)</span>
                </div>
              )}
              {isUserTeamSelected && userTeamHasCaptain && (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <Crown className="w-4 h-4" />
                  <span>Captain set!</span>
                </div>
              )}
            </div>
            <div className="space-y-6">
              {/* Group assets by type and display in 2-column grid */}
              {(() => {
                const filteredBreakdowns = breakdown.breakdowns.filter((item: any) => item.assetId !== null);
                const groupedByType: Record<string, any[]> = {
                  manufacturer: [],
                  pharmacy: [],
                  cannabis_strain: [],
                  product: [],
                  brand: [],
                };

                // Group assets by type
                filteredBreakdowns.forEach((item: any) => {
                  const type = item.assetType;
                  if (groupedByType[type]) {
                    groupedByType[type].push(item);
                  }
                });

                // Render each group in a 2-column grid
                return Object.entries(groupedByType).map(([assetType, items]) => {
                  if (items.length === 0) return null;

                  return (
                    <div key={assetType} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {items.map((item: any, index: number) => {
                        // Check if this item is the captain
                        const isCaptain = teamLineup?.captainId === item.assetId &&
                          teamLineup?.captainType === item.assetType;
                        // Check if captain earned the First Goal Bonus (top scorer on team)
                        const hasFirstGoalBonus = isCaptain && item.breakdown?.bonuses?.some(
                          (b: any) => b.type?.includes('First Goal') || b.type === 'first_goal_bonus'
                        );
                        // Can select as captain if: user's team, no captain set yet, not already captain
                        const canSelectAsCaptain = isUserTeamSelected && !userTeamHasCaptain && !isCaptain;

                        return (
                          <div
                            key={`${item.assetId}-${index}`}
                            className={cn(
                              "relative transition-all duration-200",
                              canSelectAsCaptain && "cursor-pointer hover:scale-[1.02] hover:ring-2 hover:ring-yellow-400/50 rounded-[28px]",
                              isCaptain && !hasFirstGoalBonus && "ring-2 ring-yellow-400 rounded-[28px]",
                              hasFirstGoalBonus && "ring-2 ring-yellow-400 rounded-[28px] animate-pulse"
                            )}
                            onClick={() => {
                              if (canSelectAsCaptain && item.assetId) {
                                handleSetCaptain(item.assetId, item.assetType);
                              }
                            }}
                          >
                            {/* Captain Badge - shows ⚽ when First Goal Bonus earned */}
                            {isCaptain && (
                              <div 
                                className={cn(
                                  "absolute -top-2 -right-2 z-20 flex items-center justify-center w-8 h-8 rounded-full font-bold shadow-lg border-2",
                                  hasFirstGoalBonus 
                                    ? "bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 text-black border-yellow-300 animate-bounce" 
                                    : "bg-yellow-500 text-black border-white"
                                )}
                                title={hasFirstGoalBonus ? "⚽ First Goal Bonus! +15 pts" : "Captain"}
                              >
                                {hasFirstGoalBonus ? "⚽" : "C"}
                              </div>
                            )}
                            {/* First Goal Bonus celebration label */}
                            {hasFirstGoalBonus && (
                              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                                <div className="text-xs font-bold text-yellow-400 whitespace-nowrap animate-bounce drop-shadow-[0_0_4px_rgba(234,179,8,0.8)] bg-black/60 px-2 py-0.5 rounded-full">
                                  ⚽ First Goal! +15
                                </div>
                              </div>
                            )}
                            {/* Make Captain Overlay */}
                            {canSelectAsCaptain && (
                              <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 bg-black/40 rounded-[28px]">
                                <div className="bg-yellow-500 text-black px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
                                  <Crown className="w-4 h-4" />
                                  Make Captain
                                </div>
                              </div>
                            )}
                            <ScoringCard
                              {...adaptLegacyData({
                                assetName:
                                  item.assetName || `Unknown ${item.assetType}`,
                                assetType: item.assetType,
                                imageUrl: item.imageUrl || null,
                                components: item.breakdown?.components || [],
                                bonuses: item.breakdown?.bonuses || [],
                                penalties: item.breakdown?.penalties || [],
                                subtotal: item.totalPoints ?? item.breakdown?.subtotal ?? 0,
                                // Use totalPoints from position points (source of truth) over breakdown row
                                total: item.totalPoints ?? item.breakdown?.total ?? 0,
                                trendMultiplier: item.breakdown?.trendMultiplier,
                                streakDays: item.breakdown?.streakDays,
                                marketSharePercent: item.breakdown?.marketSharePercent,
                                consistencyScore: item.breakdown?.consistencyScore,
                                velocityScore: item.breakdown?.velocityScore,
                                currentRank: item.breakdown?.currentRank,
                              })}
                              onNameClick={() => handlePlayerNameClick(item.assetId, item.assetType, item.assetName || '', item.imageUrl)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          <Card className="border-border/50 bg-card/80">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-70" />
              <p>Wähle ein Team, um die Scoring-Details zu sehen.</p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Entity Profile Modal */}
      {selectedEntity && (
        <EntityHistoryModal
          isOpen={!!selectedEntity}
          onClose={() => setSelectedEntity(null)}
          entityType={selectedEntity.type}
          entityId={selectedEntity.id}
          entityName={selectedEntity.name}
          entityImage={selectedEntity.image}
        />
      )}

      {/* Halftime Substitution Modal */}
      {userTeam && teamLineup && (
        <HalftimeSubstitutionModal
          open={showSubstitutionModal}
          onOpenChange={setShowSubstitutionModal}
          challengeId={challengeId}
          teamId={userTeam.id}
          currentLineup={normalizeLineup(teamLineup).filter(s => s.assetId).map(s => ({
            id: s.assetId!,
            assetType: s.assetType || '',
            assetId: s.assetId!,
            assetName: s.assetName || '',
            imageUrl: s.imageUrl,
            points: s.points || 0,
            position: s.position,
          }))}
          benchAssets={[]} // TODO: Fetch bench assets from roster
          remainingSubstitutions={subsData?.remaining || 0}
          onSubstitutionComplete={() => {
            refetchSubs();
            refetchLineup();
            refetchBreakdown();
          }}
        />
      )}
    </div>
  );
}

interface LineupSlot {
  position: string;
  assetType?: string | null;
  assetId?: number | null;
  assetName?: string | null;
  imageUrl?: string | null;
  points?: number | null;
  locked?: boolean;
}

function normalizeLineup(lineup: any): LineupSlot[] {
  if (!lineup) return [];

  const convert = (slots: any[]): LineupSlot[] =>
    slots.map((slot) => ({
      position: slot.position,
      assetType: slot.assetType ?? null,
      assetId: slot.assetId ?? null,
      assetName: slot.assetName ?? null,
      imageUrl: slot.imageUrl ?? slot.logoUrl ?? null,
      points:
        typeof slot.points === "number"
          ? slot.points
          : typeof slot.totalPoints === "number"
            ? slot.totalPoints
            : null,
      locked: slot.locked ?? false,
    }));

  if (Array.isArray(lineup)) {
    return convert(lineup);
  }

  if (typeof lineup === "object") {
    if (Array.isArray(lineup.lineup)) {
      return convert(lineup.lineup);
    }
  }

  return [];
}

function InviteBlock({
  leagueCode,
  leagueId,
  leagueName,
}: {
  leagueCode: string;
  leagueId: number;
  leagueName: string;
}) {
  const handleCopyCode = () => {
    navigator.clipboard.writeText(leagueCode);
    toast.success("Invite code copied to clipboard!");
  };

  return (
    <Card className="flex-1 rounded-2xl gradient-card border-border/50 glow-primary">
      <CardContent className="p-6 text-center space-y-4">
        <div className="flex justify-center">
          <UserPlus className="w-12 h-12 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            Challenge einen Freund!
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Teile diesen Code, um deinen Gegner einzuladen
          </p>
        </div>
        <div className="space-y-2">
          <div className="text-sm uppercase text-muted-foreground tracking-wider">
            Invite Code
          </div>
          <div className="text-4xl font-bold text-gradient-primary tracking-widest font-mono">
            {leagueCode}
          </div>
        </div>
        <Button
          onClick={handleCopyCode}
          className="gradient-primary w-full"
          size="lg"
        >
          <Copy className="w-4 h-4 mr-2" />
          Code kopieren
        </Button>
        <div className="pt-2 space-y-1">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <p className="text-sm">Warte auf Gegner...</p>
          </div>
          <p className="text-xs text-muted-foreground/80">
            Der Draft startet automatisch, sobald dein Freund beitritt!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
