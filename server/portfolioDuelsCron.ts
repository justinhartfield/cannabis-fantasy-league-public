/**
 * Portfolio Duels Cron Jobs
 * 
 * Background jobs for score updates and duel finalization
 */

import cron from 'node-cron';
import { getDb } from "./db";
import { eq, and, lte, sql } from "drizzle-orm";
import { portfolioDuels, portfolioDuelQueue } from "../drizzle/portfolioDuelsSchema";
import { getPortfolioDuelsService } from "./services/portfolioDuelsService";
import { getWebSocketServer } from "./websocket";

class PortfolioDuelsCron {
    private isRunning = false;

    /**
     * Start all cron jobs for duels
     */
    start() {
        console.log('[PortfolioDuelsCron] Starting duel background jobs...');

        // Update active duel scores every 10 minutes
        cron.schedule('*/10 * * * *', async () => {
            await this.updateActiveDuelScores();
        });

        // Check for expired duels every hour
        cron.schedule('0 * * * *', async () => {
            await this.finalizeExpiredDuels();
            await this.cleanupStaleQueue();
        });

        console.log('[PortfolioDuelsCron] Cron jobs scheduled');
    }

    /**
     * Update scores for all active duels
     */
    async updateActiveDuelScores() {
        if (this.isRunning) {
            console.log('[PortfolioDuelsCron] Already running, skipping...');
            return;
        }

        this.isRunning = true;

        try {
            const db = await getDb();
            if (!db) return;

            // Get all active duels
            const activeDuels = await db
                .select()
                .from(portfolioDuels)
                .where(eq(portfolioDuels.status, 'active'));

            console.log(`[PortfolioDuelsCron] Updating scores for ${activeDuels.length} active duels`);

            const service = getPortfolioDuelsService();
            const ws = getWebSocketServer();

            for (const duel of activeDuels) {
                try {
                    const { creatorTotal, opponentTotal } = await service.calculateDuelScores(duel.id);

                    // Broadcast score update via WebSocket
                    if (ws) {
                        const scoreUpdate = {
                            type: 'duel_score_update',
                            duelId: duel.id,
                            creatorScore: creatorTotal,
                            opponentScore: opponentTotal,
                            timestamp: new Date().toISOString(),
                        };

                        // Send to both participants
                        ws.sendToUser(duel.creatorId, scoreUpdate);
                        if (duel.opponentId) {
                            ws.sendToUser(duel.opponentId, scoreUpdate);
                        }
                    }
                } catch (error) {
                    console.error(`[PortfolioDuelsCron] Error updating duel ${duel.id}:`, error);
                }
            }

            console.log('[PortfolioDuelsCron] Score update complete');
        } catch (error) {
            console.error('[PortfolioDuelsCron] Error in updateActiveDuelScores:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Finalize duels that have passed their end time
     */
    async finalizeExpiredDuels() {
        try {
            const db = await getDb();
            if (!db) return;

            const now = new Date().toISOString();

            // Get all active duels past their end time
            const expiredDuels = await db
                .select()
                .from(portfolioDuels)
                .where(and(
                    eq(portfolioDuels.status, 'active'),
                    lte(portfolioDuels.endTime, now)
                ));

            console.log(`[PortfolioDuelsCron] Finalizing ${expiredDuels.length} expired duels`);

            const service = getPortfolioDuelsService();
            const ws = getWebSocketServer();

            for (const duel of expiredDuels) {
                try {
                    await service.finalizeDuel(duel.id);

                    // Get final result and broadcast
                    const finalDuel = await service.getDuelById(duel.id);

                    if (ws && finalDuel) {
                        const completeEvent = {
                            type: 'duel_complete',
                            duelId: duel.id,
                            winnerId: finalDuel.winnerId,
                            creatorScore: finalDuel.creatorFinalScore,
                            opponentScore: finalDuel.opponentFinalScore,
                            prizePool: finalDuel.prizePool,
                        };

                        ws.sendToUser(duel.creatorId, completeEvent);
                        if (duel.opponentId) {
                            ws.sendToUser(duel.opponentId, completeEvent);
                        }
                    }
                } catch (error) {
                    console.error(`[PortfolioDuelsCron] Error finalizing duel ${duel.id}:`, error);
                }
            }

            console.log('[PortfolioDuelsCron] Finalization complete');
        } catch (error) {
            console.error('[PortfolioDuelsCron] Error in finalizeExpiredDuels:', error);
        }
    }

    /**
     * Clean up stale matchmaking queue entries (older than 30 minutes)
     */
    async cleanupStaleQueue() {
        try {
            const db = await getDb();
            if (!db) return;

            const thirtyMinutesAgo = new Date();
            thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

            const result = await db
                .delete(portfolioDuelQueue)
                .where(lte(portfolioDuelQueue.joinedAt, thirtyMinutesAgo.toISOString()));

            console.log('[PortfolioDuelsCron] Cleaned up stale queue entries');
        } catch (error) {
            console.error('[PortfolioDuelsCron] Error cleaning queue:', error);
        }
    }

    /**
     * Manual trigger for score update (for testing)
     */
    async triggerScoreUpdate() {
        await this.updateActiveDuelScores();
    }
}

export const portfolioDuelsCron = new PortfolioDuelsCron();
export const getPortfolioDuelsCron = () => portfolioDuelsCron;
