import { wsManager } from "./websocket";
import { getDb } from "./db";
import { leagues } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { calculateNextPick } from "./draftLogic";

/**
 * Draft Timer Manager
 * 
 * Handles countdown timers for draft picks
 * Auto-picks if timer expires
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

class DraftTimerManager {
  private timers: Map<number, DraftTimer> = new Map();

  /**
   * Start timer for current pick
   */
  async startTimer(leagueId: number): Promise<void> {
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

    if (!league || league.draftCompleted) {
      return; // Don't start timer if draft is complete
    }

    const nextPick = await calculateNextPick(leagueId);
    const timeLimit = league.draftPickTimeLimit || 90;
    const startTime = Date.now();

    // Broadcast timer start
    wsManager.notifyTimerStart(leagueId, {
      pickNumber: nextPick.pickNumber,
      teamId: nextPick.teamId,
      timeLimit,
      startTime,
    });

    // Send countdown updates every second
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
    }, 1000);

    // Auto-pick when timer expires
    const timeout = setTimeout(async () => {
      console.log(`[DraftTimer] Time expired for pick ${nextPick.pickNumber} in league ${leagueId}`);
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
    }
  }

  /**
   * Handle timer expiration - auto-pick a player
   */
  private async handleTimeExpired(leagueId: number, teamId: number): Promise<void> {
    try {
      // Import here to avoid circular dependency
      const { makeAutoPick } = await import("./autoPick");
      
      console.log(`[DraftTimer] Auto-picking for team ${teamId} in league ${leagueId}`);
      
      await makeAutoPick(leagueId, teamId);

      // Notify all clients
      wsManager.notifyAutoPick(leagueId, {
        teamId,
        pickNumber: this.timers.get(leagueId)?.pickNumber || 0,
      });

      // Timer for next pick will be started by the makeDraftPick mutation
    } catch (error) {
      console.error("[DraftTimer] Error handling time expired:", error);
      // Notify clients of error
      wsManager.broadcastToDraftRoom(leagueId, {
        type: "error",
        message: "Failed to auto-pick player",
      });
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
      
      wsManager.notifyTimerPause(leagueId, {
        remaining: this.getRemainingTime(leagueId) || 0,
      });
    }
  }

  /**
   * Resume timer
   */
  async resumeTimer(leagueId: number, remainingTime: number): Promise<void> {
    this.stopTimer(leagueId);

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const nextPick = await calculateNextPick(leagueId);
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
    }, 1000);

    const timeout = setTimeout(async () => {
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
  }
}

export const draftTimerManager = new DraftTimerManager();
