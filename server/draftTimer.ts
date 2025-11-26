import { wsManager } from "./websocket";
import { getDb } from "./db";
import { leagues, teams } from "../drizzle/schema";
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
   * If the current team has auto-pick enabled, immediately auto-pick instead of starting timer
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
    
    // Check if this team has auto-pick enabled
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, nextPick.teamId))
      .limit(1);

    if (team && team.autoPickEnabled === 1) {
      // Team has auto-pick enabled, immediately make the pick
      console.log(`[DraftTimer] Team ${nextPick.teamId} (${team.name}) has auto-pick enabled - skipping timer and auto-picking`);
      
      // Small delay to prevent race conditions and allow UI to update
      setTimeout(async () => {
        await this.handleTimeExpired(leagueId, nextPick.teamId);
      }, 1500); // 1.5 second delay so users can see the pick happening
      
      return;
    }

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
    // This reduces WebSocket traffic by 80% while maintaining accurate time sync
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
   * Handle timer expiration - enable auto-pick for the team and auto-pick a player
   */
  private async handleTimeExpired(leagueId: number, teamId: number): Promise<void> {
    try {
      // Import here to avoid circular dependency
      const { makeAutoPick } = await import("./autoPick");
      
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get team details
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);

      if (!team) {
        throw new Error(`Team ${teamId} not found`);
      }

      // Enable auto-pick for this team (persists for rest of draft)
      // Only enable if not already enabled
      if (team.autoPickEnabled !== 1) {
        await db
          .update(teams)
          .set({ autoPickEnabled: 1, updatedAt: new Date().toISOString() })
          .where(eq(teams.id, teamId));

        console.log(`[DraftTimer] Auto-pick ENABLED for team ${teamId} (${team.name}) in league ${leagueId} due to timer expiration`);

        // Notify all clients that auto-pick has been enabled for this team
        wsManager.notifyAutoPickEnabled(leagueId, {
          teamId,
          teamName: team.name,
          reason: 'timer_expired',
        });
      }
      
      console.log(`[DraftTimer] Auto-picking for team ${teamId} in league ${leagueId}`);
      
      await makeAutoPick(leagueId, teamId);
      
      const [league] = await db
        .select()
        .from(leagues)
        .where(eq(leagues.id, leagueId))
        .limit(1);

      // Start timer for next pick if draft is not complete
      if (league && !league.draftCompleted) {
        await this.startTimer(leagueId);
      }
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
    }, 5000);

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
