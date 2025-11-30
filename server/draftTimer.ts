import { wsManager } from "./websocket";
import { getDb } from "./db";
import { leagues, teams } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { calculateNextPick } from "./draftLogic";
import { autoPickService, type AutoPickResult } from "./autoPick";

/**
 * Draft Timer Manager v2.0
 * 
 * Handles countdown timers for draft picks with improved reliability:
 * - Integrates with AutoPickService for atomic auto-picks
 * - Proper locking to prevent race conditions
 * - Circuit breaker integration for error recovery
 * - No artificial delays that can cause state inconsistency
 */

interface DraftTimer {
  leagueId: number;
  pickNumber: number;
  teamId: number;
  startTime: number;
  timeLimit: number; // seconds
  interval: NodeJS.Timeout;
  timeout: NodeJS.Timeout;
}

function logDraftTimer(message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[DraftTimer ${timestamp}] ${message}`, JSON.stringify(data));
  } else {
    console.log(`[DraftTimer ${timestamp}] ${message}`);
  }
}

class DraftTimerManager {
  private timers: Map<number, DraftTimer> = new Map();
  // Track teams that are in the middle of an auto-pick to prevent double triggers
  private autoPickInProgress: Map<number, boolean> = new Map();

  /**
   * Start timer for current pick
   * If the current team has auto-pick enabled, immediately trigger auto-pick
   */
  async startTimer(leagueId: number): Promise<void> {
    // Check if auto-pick is already in progress for this league
    if (this.autoPickInProgress.get(leagueId)) {
      logDraftTimer("Auto-pick already in progress, skipping timer start", { leagueId });
      return;
    }

    // Check if AutoPickService has an active pick
    if (autoPickService.isPickInProgress(leagueId)) {
      logDraftTimer("AutoPickService has pick in progress, skipping timer start", { leagueId });
      return;
    }

    // Clear any existing timer for this league
    this.stopTimer(leagueId);

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get league and current pick info
    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId))
      .limit(1);

    if (!league) {
      logDraftTimer("League not found", { leagueId });
      return;
    }

<<<<<<< Updated upstream
    const nextPick = await calculateNextPick(leagueId);
    
=======
    if (league.draftCompleted) {
      logDraftTimer("Draft already completed, not starting timer", { leagueId });
      return;
    }

    let nextPick;
    try {
      nextPick = await calculateNextPick(leagueId);
    } catch (error) {
      logDraftTimer("Failed to calculate next pick", { leagueId, error: String(error) });
      return;
    }

>>>>>>> Stashed changes
    // Check if this team has auto-pick enabled
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, nextPick.teamId))
      .limit(1);

    if (team && team.autoPickEnabled === 1) {
<<<<<<< Updated upstream
      // Team has auto-pick enabled, immediately make the pick
      console.log(`[DraftTimer] Team ${nextPick.teamId} (${team.name}) has auto-pick enabled - skipping timer and auto-picking`);
      
      // Small delay to prevent race conditions and allow UI to update
      setTimeout(async () => {
        await this.handleTimeExpired(leagueId, nextPick.teamId);
      }, 1500); // 1.5 second delay so users can see the pick happening
      
=======
      // Team has auto-pick enabled - trigger immediate auto-pick
      logDraftTimer("Team has auto-pick enabled, triggering immediate pick", { 
        leagueId, 
        teamId: nextPick.teamId, 
        teamName: team.name 
      });

      // Execute auto-pick synchronously (no delay)
      await this.executeAutoPick(leagueId, nextPick.teamId, team.name);
>>>>>>> Stashed changes
      return;
    }

    logDraftTimer("Starting normal timer", { 
      leagueId, 
      teamId: nextPick.teamId, 
      teamName: team?.name,
      autoPickEnabled: team?.autoPickEnabled 
    });

    const timeLimit = league.draftPickTimeLimit || 90;
    const startTime = Date.now();

    // Broadcast timer start
    wsManager.notifyTimerStart(leagueId, {
      pickNumber: nextPick.pickNumber,
      teamId: nextPick.teamId,
      timeLimit,
      startTime,
    });

    // Send countdown sync updates every 5 seconds (client interpolates in between)
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, timeLimit - elapsed);

      wsManager.notifyTimerTick(leagueId, {
        pickNumber: nextPick.pickNumber,
        remaining,
      });

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 5000);

    // Auto-pick when timer expires
    const timeout = setTimeout(async () => {
      logDraftTimer("Timer expired", { 
        leagueId, 
        pickNumber: nextPick.pickNumber, 
        teamId: nextPick.teamId 
      });
      await this.handleTimeExpired(leagueId, nextPick.teamId);
    }, timeLimit * 1000);

    this.timers.set(leagueId, {
      leagueId,
      pickNumber: nextPick.pickNumber,
      teamId: nextPick.teamId,
      startTime,
      timeLimit,
      interval,
      timeout,
    });
  }

  /**
   * Stop timer for a league
   */
  stopTimer(leagueId: number): void {
    const timer = this.timers.get(leagueId);
    if (timer) {
      clearInterval(timer.interval);
      clearTimeout(timer.timeout);
      this.timers.delete(leagueId);

      wsManager.notifyTimerStop(leagueId);
      logDraftTimer("Timer stopped", { leagueId });
    }
  }

  /**
   * Handle timer expiration - enable auto-pick for the team and execute pick
   */
  private async handleTimeExpired(leagueId: number, teamId: number): Promise<void> {
    // Stop the current timer first
    this.stopTimer(leagueId);

    const db = await getDb();
    if (!db) {
      logDraftTimer("Database not available in handleTimeExpired", { leagueId });
      return;
    }

    // Get team details
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (!team) {
      logDraftTimer("Team not found in handleTimeExpired", { leagueId, teamId });
      return;
    }

    // Enable auto-pick for this team (persists for rest of draft)
    if (team.autoPickEnabled !== 1) {
      await db
        .update(teams)
        .set({ autoPickEnabled: 1, updatedAt: new Date().toISOString() })
        .where(eq(teams.id, teamId));

      logDraftTimer("Auto-pick ENABLED for team due to timer expiration", { 
        leagueId, 
        teamId, 
        teamName: team.name 
      });

      // Notify clients that auto-pick has been enabled
      wsManager.notifyAutoPickEnabled(leagueId, {
        teamId,
        teamName: team.name,
        reason: 'timer_expired',
      });
    }

    // Execute auto-pick
    await this.executeAutoPick(leagueId, teamId, team.name);
  }

  /**
   * Execute auto-pick using the AutoPickService
   * Handles all error scenarios and timer restart
   */
  private async executeAutoPick(leagueId: number, teamId: number, teamName: string): Promise<void> {
    // Prevent concurrent auto-picks
    if (this.autoPickInProgress.get(leagueId)) {
      logDraftTimer("Auto-pick already in progress, skipping", { leagueId, teamId });
      return;
    }

    this.autoPickInProgress.set(leagueId, true);

    try {
<<<<<<< Updated upstream
      // Import here to avoid circular dependency
      const { makeAutoPick } = await import("./autoPick");
      
      const db = await getDb();
      if (!db) throw new Error("Database not available");
=======
      logDraftTimer("Executing auto-pick via service", { leagueId, teamId, teamName });

      const result = await autoPickService.executeAutoPick(leagueId, teamId);
>>>>>>> Stashed changes

      if (result.success) {
        logDraftTimer("Auto-pick successful", { 
          leagueId, 
          teamId, 
          player: result.pickedPlayer?.name,
          draftCompleted: result.draftCompleted,
          retryCount: result.retryCount 
        });
<<<<<<< Updated upstream
      }
      
      console.log(`[DraftTimer] Auto-picking for team ${teamId} in league ${leagueId}`);
      
      await makeAutoPick(leagueId, teamId);
      
      const [league] = await db
        .select()
        .from(leagues)
        .where(eq(leagues.id, leagueId))
        .limit(1);
=======

        if (!result.draftCompleted) {
          // Draft continues - start timer for next pick
          // Small delay to ensure WebSocket notifications are sent first
          setTimeout(async () => {
            await this.startTimer(leagueId);
          }, 100);
        }
      } else {
        logDraftTimer("Auto-pick failed", { 
          leagueId, 
          teamId, 
          error: result.error,
          retryCount: result.retryCount 
        });

        // Check circuit breaker status
        const cbStatus = autoPickService.getCircuitBreakerStatus(leagueId);
        
        if (cbStatus.tripped) {
          // Circuit breaker tripped - notify clients and disable auto-pick for this team
          const db = await getDb();
          if (db) {
            await db
              .update(teams)
              .set({ autoPickEnabled: 0, updatedAt: new Date().toISOString() })
              .where(eq(teams.id, teamId));
>>>>>>> Stashed changes

            logDraftTimer("Circuit breaker tripped, disabled auto-pick for team", { 
              leagueId, 
              teamId,
              failures: cbStatus.failures 
            });
          }

          wsManager.broadcastToDraftRoom(leagueId, {
            type: "error",
            message: `Auto-pick temporarily disabled for ${teamName} due to repeated failures. Manual pick required.`,
            teamId,
          });

          // Restart timer for manual pick
          await this.startTimer(leagueId);
        } else {
          // Not circuit breaker - notify error and restart timer
          wsManager.broadcastToDraftRoom(leagueId, {
            type: "error",
            message: `Auto-pick failed: ${result.error}. Timer restarted.`,
          });

          // Restart timer
          await this.startTimer(leagueId);
        }
      }
    } catch (error) {
<<<<<<< Updated upstream
      console.error("[DraftTimer] Error handling time expired:", error);
      // Notify clients of error
      wsManager.broadcastToDraftRoom(leagueId, {
        type: "error",
        message: "Failed to auto-pick player",
=======
      logDraftTimer("Unexpected error in executeAutoPick", { 
        leagueId, 
        teamId, 
        error: String(error) 
      });

      // Notify clients of error
      wsManager.broadcastToDraftRoom(leagueId, {
        type: "error",
        message: "Unexpected error during auto-pick. Timer restarted.",
>>>>>>> Stashed changes
      });

      // Attempt to restart timer
      try {
        await this.startTimer(leagueId);
      } catch (restartError) {
        logDraftTimer("Failed to restart timer after error", { 
          leagueId, 
          error: String(restartError) 
        });
      }
    } finally {
      this.autoPickInProgress.delete(leagueId);
    }
  }

  /**
   * Get remaining time for a league's current pick
   */
  getRemainingTime(leagueId: number): number | null {
    const timer = this.timers.get(leagueId);
    if (!timer) return null;

    const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
    return Math.max(0, timer.timeLimit - elapsed);
  }

  /**
   * Pause timer (for commissioner actions)
   */
  pauseTimer(leagueId: number): void {
    const timer = this.timers.get(leagueId);
    if (timer) {
      clearInterval(timer.interval);
      clearTimeout(timer.timeout);
<<<<<<< Updated upstream
      
=======

      const remaining = this.getRemainingTime(leagueId) || 0;

>>>>>>> Stashed changes
      wsManager.notifyTimerPause(leagueId, {
        remaining,
      });

      logDraftTimer("Timer paused", { leagueId, remaining });
    }
  }

  /**
   * Resume timer with specified remaining time
   */
  async resumeTimer(leagueId: number, remainingTime: number): Promise<void> {
    this.stopTimer(leagueId);

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    let nextPick;
    try {
      nextPick = await calculateNextPick(leagueId);
    } catch (error) {
      logDraftTimer("Failed to calculate next pick on resume", { leagueId, error: String(error) });
      return;
    }

    const startTime = Date.now();

    wsManager.notifyTimerResume(leagueId, {
      pickNumber: nextPick.pickNumber,
      remaining: remainingTime,
    });

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, remainingTime - elapsed);

      wsManager.notifyTimerTick(leagueId, {
        pickNumber: nextPick.pickNumber,
        remaining,
      });

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 5000);

    const timeout = setTimeout(async () => {
      logDraftTimer("Resumed timer expired", { leagueId, pickNumber: nextPick.pickNumber });
      await this.handleTimeExpired(leagueId, nextPick.teamId);
    }, remainingTime * 1000);

    this.timers.set(leagueId, {
      leagueId,
      pickNumber: nextPick.pickNumber,
      teamId: nextPick.teamId,
      startTime,
      timeLimit: remainingTime,
      interval,
      timeout,
    });

    logDraftTimer("Timer resumed", { leagueId, remainingTime, pickNumber: nextPick.pickNumber });
  }

  /**
   * Check if a timer is active for a league
   */
  hasActiveTimer(leagueId: number): boolean {
    return this.timers.has(leagueId);
  }

  /**
   * Get current timer info (for debugging)
   */
  getTimerInfo(leagueId: number): { active: boolean; remaining: number | null; teamId: number | null } {
    const timer = this.timers.get(leagueId);
    return {
      active: !!timer,
      remaining: this.getRemainingTime(leagueId),
      teamId: timer?.teamId ?? null,
    };
  }

  /**
   * Force reset circuit breaker for a league (commissioner action)
   */
  resetCircuitBreaker(leagueId: number): void {
    autoPickService.resetCircuitBreaker(leagueId);
    logDraftTimer("Circuit breaker reset via timer manager", { leagueId });
  }
}

export const draftTimerManager = new DraftTimerManager();
