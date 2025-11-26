import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Scoring Play Animation Hook
 * 
 * Orchestrates the sequential reveal of scoring plays with dramatic timing.
 * Queues scoring events and reveals them one at a time with configurable delays.
 */

export interface ScoringPlay {
  id: string;
  teamId: number;
  teamName: string;
  assetType: string;
  assetName: string;
  assetImageUrl?: string | null;
  category: string;
  points: number;
  formula?: string;
  value?: string | number;
  isBonus?: boolean;
  isBigPlay?: boolean; // > 20 points
  isStreakBonus?: boolean;
  isRankBonus?: boolean;
  timestamp: number;
}

interface UseScoringPlayAnimationOptions {
  /** Delay between each play reveal in ms */
  playInterval?: number;
  /** Delay before starting the animation sequence */
  initialDelay?: number;
  /** Minimum points for a "big play" alert */
  bigPlayThreshold?: number;
  /** Callback when a play is revealed */
  onPlayRevealed?: (play: ScoringPlay) => void;
  /** Callback when a big play is revealed */
  onBigPlay?: (play: ScoringPlay) => void;
  /** Callback for streak/milestone celebrations */
  onCelebration?: (play: ScoringPlay, type: 'streak' | 'rank' | 'milestone') => void;
  /** Whether animation is enabled */
  enabled?: boolean;
}

interface ScoringBreakdownItem {
  assetId?: number;
  assetType: string;
  assetName?: string;
  imageUrl?: string | null;
  breakdown?: {
    components?: Array<{
      category: string;
      value: string | number;
      formula: string;
      points: number;
    }>;
    bonuses?: Array<{
      type: string;
      condition: string;
      points: number;
    }>;
    total?: number;
  };
  totalPoints?: number;
}

export function useScoringPlayAnimation(options: UseScoringPlayAnimationOptions = {}) {
  const {
    playInterval = 600,
    initialDelay = 1000,
    bigPlayThreshold = 20,
    onPlayRevealed,
    onBigPlay,
    onCelebration,
    enabled = true,
  } = options;

  const [plays, setPlays] = useState<ScoringPlay[]>([]);
  const [revealedPlays, setRevealedPlays] = useState<ScoringPlay[]>([]);
  const [currentPlay, setCurrentPlay] = useState<ScoringPlay | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const playQueueRef = useRef<ScoringPlay[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);

  /**
   * Convert scoring breakdown data into animated plays
   */
  const queuePlaysFromBreakdown = useCallback((
    teamId: number,
    teamName: string,
    breakdownItems: ScoringBreakdownItem[]
  ) => {
    if (!enabled) return;

    const newPlays: ScoringPlay[] = [];
    let playIndex = 0;

    breakdownItems.forEach((item) => {
      const assetName = item.assetName || `Unknown ${item.assetType}`;
      const imageUrl = item.imageUrl;

      // Add component plays
      if (item.breakdown?.components) {
        item.breakdown.components.forEach((component) => {
          if (component.points > 0) {
            const isBigPlay = component.points >= bigPlayThreshold;
            newPlays.push({
              id: `${teamId}-${item.assetId}-${playIndex++}`,
              teamId,
              teamName,
              assetType: item.assetType,
              assetName,
              assetImageUrl: imageUrl,
              category: component.category,
              points: component.points,
              formula: component.formula,
              value: component.value,
              isBonus: false,
              isBigPlay,
              isStreakBonus: false,
              isRankBonus: false,
              timestamp: Date.now() + playIndex * 100,
            });
          }
        });
      }

      // Add bonus plays
      if (item.breakdown?.bonuses) {
        item.breakdown.bonuses.forEach((bonus) => {
          if (bonus.points > 0) {
            const isStreakBonus = bonus.type.toLowerCase().includes('streak');
            const isRankBonus = bonus.type.toLowerCase().includes('rank');
            const isBigPlay = bonus.points >= bigPlayThreshold || isStreakBonus || isRankBonus;
            
            newPlays.push({
              id: `${teamId}-${item.assetId}-bonus-${playIndex++}`,
              teamId,
              teamName,
              assetType: item.assetType,
              assetName,
              assetImageUrl: imageUrl,
              category: bonus.type,
              points: bonus.points,
              formula: bonus.condition,
              isBonus: true,
              isBigPlay,
              isStreakBonus,
              isRankBonus,
              timestamp: Date.now() + playIndex * 100,
            });
          }
        });
      }
    });

    // Sort by points (bigger plays come later for dramatic effect)
    newPlays.sort((a, b) => a.points - b.points);

    setPlays(newPlays);
    playQueueRef.current = [...newPlays];
    setRevealedPlays([]);
    setCurrentPlay(null);
    setIsComplete(false);
    hasStartedRef.current = false;
  }, [enabled, bigPlayThreshold]);

  /**
   * Reveal the next play in the queue
   */
  const revealNextPlay = useCallback(() => {
    if (playQueueRef.current.length === 0) {
      setIsAnimating(false);
      setIsComplete(true);
      setCurrentPlay(null);
      return;
    }

    const nextPlay = playQueueRef.current.shift()!;
    setCurrentPlay(nextPlay);
    
    // Add to revealed plays (keeping last 10)
    setRevealedPlays((prev) => {
      const updated = [nextPlay, ...prev];
      return updated.slice(0, 10);
    });

    // Trigger callbacks
    onPlayRevealed?.(nextPlay);

    if (nextPlay.isBigPlay) {
      onBigPlay?.(nextPlay);
    }

    if (nextPlay.isStreakBonus) {
      onCelebration?.(nextPlay, 'streak');
    } else if (nextPlay.isRankBonus) {
      onCelebration?.(nextPlay, 'rank');
    }

    // Schedule next play
    timeoutRef.current = setTimeout(() => {
      revealNextPlay();
    }, playInterval);
  }, [playInterval, onPlayRevealed, onBigPlay, onCelebration]);

  /**
   * Start the animation sequence
   */
  const startAnimation = useCallback(() => {
    if (!enabled || hasStartedRef.current || playQueueRef.current.length === 0) return;

    hasStartedRef.current = true;
    setIsAnimating(true);
    setIsComplete(false);

    // Start after initial delay
    timeoutRef.current = setTimeout(() => {
      revealNextPlay();
    }, initialDelay);
  }, [enabled, initialDelay, revealNextPlay]);

  /**
   * Stop and reset the animation
   */
  const stopAnimation = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsAnimating(false);
    hasStartedRef.current = false;
  }, []);

  /**
   * Reset everything
   */
  const reset = useCallback(() => {
    stopAnimation();
    setPlays([]);
    setRevealedPlays([]);
    setCurrentPlay(null);
    setIsComplete(false);
    playQueueRef.current = [];
  }, [stopAnimation]);

  /**
   * Skip to end (reveal all remaining plays instantly)
   */
  const skipToEnd = useCallback(() => {
    stopAnimation();
    setRevealedPlays((prev) => {
      const remaining = playQueueRef.current;
      playQueueRef.current = [];
      return [...remaining.reverse(), ...prev].slice(0, 10);
    });
    setCurrentPlay(null);
    setIsComplete(true);
  }, [stopAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Auto-start when plays are queued
  useEffect(() => {
    if (plays.length > 0 && !hasStartedRef.current && enabled) {
      startAnimation();
    }
  }, [plays, enabled, startAnimation]);

  return {
    /** All plays that have been queued */
    plays,
    /** Plays that have been revealed so far */
    revealedPlays,
    /** The current play being animated */
    currentPlay,
    /** Whether the animation is currently running */
    isAnimating,
    /** Whether all plays have been revealed */
    isComplete,
    /** Queue plays from a scoring breakdown */
    queuePlaysFromBreakdown,
    /** Start the animation sequence */
    startAnimation,
    /** Stop the animation */
    stopAnimation,
    /** Reset everything */
    reset,
    /** Skip to the end */
    skipToEnd,
    /** Total points revealed so far */
    totalPointsRevealed: revealedPlays.reduce((sum, p) => sum + p.points, 0),
    /** Number of plays remaining */
    playsRemaining: playQueueRef.current.length,
  };
}

export default useScoringPlayAnimation;

