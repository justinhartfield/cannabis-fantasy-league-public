/**
 * Portfolio Duels Service
 * 
 * Business logic for 1v1 multiplayer draft battles
 */

import { getDb } from "../db";
import { eq, and, desc, asc, sql, isNull } from "drizzle-orm";
import {
    portfolioDuels,
    portfolioDuelPicks,
    portfolioDuelInvites,
    portfolioDuelQueue,
    portfolioDuelStats,
    POSITION_MULTIPLIERS,
    DUEL_DURATIONS,
    DuelPosition,
    DuelType
} from "../../drizzle/portfolioDuelsSchema";
import { users } from "../../drizzle/schema";
import {
    strainDailyChallengeStats,
    manufacturerDailyChallengeStats,
    productDailyChallengeStats,
    pharmacyDailyChallengeStats
} from "../../drizzle/dailyChallengeSchema";
import { cannabisStrains, manufacturers, strains, pharmacies } from "../../drizzle/schema";
import { getWebSocketServer } from "../websocket";

export interface CreateDuelOptions {
    creatorId: number;
    anteAmount: number;
    duelType?: DuelType;
}

export interface MakePickOptions {
    duelId: number;
    userId: number;
    position: DuelPosition;
    assetType: 'strain' | 'manufacturer' | 'product' | 'pharmacy';
    assetId: number;
}

class PortfolioDuelsService {

    /**
     * Join the matchmaking queue for quick match
     */
    async joinQueue(userId: number, anteAmount: number, duelType: DuelType = 'sprint') {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Check user has enough BudsRewards
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) throw new Error("User not found");

        const userPoints = user.referralCredits || 0;
        if (userPoints < anteAmount) {
            throw new Error(`Insufficient BudsRewards points. Need ${anteAmount}, have ${userPoints}`);
        }

        // Check if already in queue
        const existing = await db
            .select()
            .from(portfolioDuelQueue)
            .where(eq(portfolioDuelQueue.userId, userId))
            .limit(1);

        if (existing.length > 0) {
            throw new Error("Already in matchmaking queue");
        }

        // Try to find a match
        const [opponent] = await db
            .select()
            .from(portfolioDuelQueue)
            .where(and(
                eq(portfolioDuelQueue.anteAmount, anteAmount),
                eq(portfolioDuelQueue.duelType, duelType)
            ))
            .orderBy(asc(portfolioDuelQueue.joinedAt))
            .limit(1);

        if (opponent) {
            // Match found! Create duel
            const duel = await this.createDuelWithOpponent(userId, opponent.userId, anteAmount, duelType);

            // Remove opponent from queue
            await db.delete(portfolioDuelQueue).where(eq(portfolioDuelQueue.id, opponent.id));

            return { matched: true, duel };
        }

        // No match, add to queue
        await db.insert(portfolioDuelQueue).values({
            userId,
            anteAmount,
            duelType,
        });

        return { matched: false, message: "Added to matchmaking queue" };
    }

    /**
     * Leave the matchmaking queue
     */
    async leaveQueue(userId: number) {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.delete(portfolioDuelQueue).where(eq(portfolioDuelQueue.userId, userId));
        return { success: true };
    }

    /**
     * Create a duel between two matched players
     */
    async createDuelWithOpponent(
        creatorId: number,
        opponentId: number,
        anteAmount: number,
        duelType: DuelType = 'sprint'
    ) {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const prizePool = anteAmount * 2;

        // Deduct ante from both players
        await this.deductPoints(creatorId, anteAmount);
        await this.deductPoints(opponentId, anteAmount);

        // Create the duel
        const [duel] = await db.insert(portfolioDuels).values({
            creatorId,
            opponentId,
            duelType,
            status: 'drafting',
            anteAmount,
            prizePool,
            draftStartedAt: new Date().toISOString(),
        }).returning();

        return duel;
    }

    /**
     * Send duel invite to a friend
     */
    async sendInvite(senderId: number, receiverId: number, anteAmount: number, duelType: DuelType = 'sprint') {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Check sender has enough points
        const [sender] = await db.select().from(users).where(eq(users.id, senderId)).limit(1);
        if (!sender) throw new Error("Sender not found");
        if ((sender.referralCredits || 0) < anteAmount) {
            throw new Error("Insufficient BudsRewards points");
        }

        // Expires in 24 hours
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const [invite] = await db.insert(portfolioDuelInvites).values({
            senderId,
            receiverId,
            duelType,
            anteAmount,
            expiresAt: expiresAt.toISOString(),
        }).returning();

        return invite;
    }

    /**
     * Accept a duel invite
     */
    async acceptInvite(inviteId: number, receiverId: number) {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [invite] = await db
            .select()
            .from(portfolioDuelInvites)
            .where(and(
                eq(portfolioDuelInvites.id, inviteId),
                eq(portfolioDuelInvites.receiverId, receiverId),
                eq(portfolioDuelInvites.status, 'pending')
            ))
            .limit(1);

        if (!invite) throw new Error("Invite not found or already responded");

        if (new Date(invite.expiresAt) < new Date()) {
            await db.update(portfolioDuelInvites)
                .set({ status: 'expired' })
                .where(eq(portfolioDuelInvites.id, inviteId));
            throw new Error("Invite has expired");
        }

        // Create the duel
        const duel = await this.createDuelWithOpponent(
            invite.senderId,
            receiverId,
            invite.anteAmount,
            invite.duelType as DuelType
        );

        // Update invite
        await db.update(portfolioDuelInvites)
            .set({ status: 'accepted', duelId: duel.id })
            .where(eq(portfolioDuelInvites.id, inviteId));

        return duel;
    }

    /**
     * Make a pick during draft phase
     */
    async makePick(options: MakePickOptions) {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { duelId, userId, position, assetType, assetId } = options;

        // Get the duel
        const [duel] = await db
            .select()
            .from(portfolioDuels)
            .where(eq(portfolioDuels.id, duelId))
            .limit(1);

        if (!duel) throw new Error("Duel not found");
        if (duel.status !== 'drafting') throw new Error("Duel is not in drafting phase");
        if (duel.creatorId !== userId && duel.opponentId !== userId) {
            throw new Error("You are not part of this duel");
        }

        // Check position hasn't been filled
        const existingPositionPick = await db
            .select()
            .from(portfolioDuelPicks)
            .where(and(
                eq(portfolioDuelPicks.duelId, duelId),
                eq(portfolioDuelPicks.userId, userId),
                eq(portfolioDuelPicks.position, position)
            ))
            .limit(1);

        if (existingPositionPick.length > 0) {
            throw new Error(`Position ${position} already filled`);
        }

        // Check asset not already taken in this duel
        const existingAssetPick = await db
            .select()
            .from(portfolioDuelPicks)
            .where(and(
                eq(portfolioDuelPicks.duelId, duelId),
                eq(portfolioDuelPicks.assetType, assetType),
                eq(portfolioDuelPicks.assetId, assetId)
            ))
            .limit(1);

        if (existingAssetPick.length > 0) {
            throw new Error("This asset has already been picked in this duel");
        }

        // Validate position matches asset type
        this.validatePositionAssetType(position, assetType);

        // Broadcast pick to opponent immediately (before DB confirm just in case, but better after)

        // Get asset name
        const assetName = await this.getAssetName(assetType, assetId);

        // Count existing picks for order
        const userPicks = await db
            .select()
            .from(portfolioDuelPicks)
            .where(and(
                eq(portfolioDuelPicks.duelId, duelId),
                eq(portfolioDuelPicks.userId, userId)
            ));

        const pickOrder = userPicks.length + 1;

        // Record the pick
        const [pick] = await db.insert(portfolioDuelPicks).values({
            duelId,
            userId,
            position,
            assetType,
            assetId,
            assetName,
            pickOrder,
        }).returning();

        // Check if draft is complete (both players have 5 picks)
        const isComplete = await this.checkDraftComplete(duelId);

        // Notify opponent via WebSocket
        const ws = getWebSocketServer();
        const opponentId = duel.creatorId === userId ? duel.opponentId : duel.creatorId;
        if (opponentId) {
            ws.sendToUser(opponentId, {
                type: 'opponent_picked',
                duelId,
                pick,
                nextTurnUserId: isComplete ? null : opponentId // Simplified turn logic
            });
        }

        return pick;
    }

    /**
     * Check if both players have completed their draft
     */
    async checkDraftComplete(duelId: number) {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [duel] = await db
            .select()
            .from(portfolioDuels)
            .where(eq(portfolioDuels.id, duelId))
            .limit(1);

        if (!duel || duel.status !== 'drafting') return false;

        const picks = await db
            .select()
            .from(portfolioDuelPicks)
            .where(eq(portfolioDuelPicks.duelId, duelId));

        const creatorPicks = picks.filter(p => p.userId === duel.creatorId);
        const opponentPicks = picks.filter(p => p.userId === duel.opponentId);

        if (creatorPicks.length === 5 && opponentPicks.length === 5) {
            // Both complete! Start the duel
            await this.startDuel(duelId);
            return true;
        }

        return false;
    }

    /**
     * Start the duel (after draft complete)
     */
    async startDuel(duelId: number) {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const now = new Date();
        const endTime = new Date(now);
        endTime.setHours(endTime.getHours() + DUEL_DURATIONS.sprint);

        // Record starting scores for all picks
        const picks = await db
            .select()
            .from(portfolioDuelPicks)
            .where(eq(portfolioDuelPicks.duelId, duelId));

        for (const pick of picks) {
            const startScore = await this.getCurrentScore(pick.assetType, pick.assetId);
            await db.update(portfolioDuelPicks)
                .set({ startScore: String(startScore) })
                .where(eq(portfolioDuelPicks.id, pick.id));
        }

        // Activate the duel
        await db.update(portfolioDuels)
            .set({
                status: 'active',
                startTime: now.toISOString(),
                endTime: endTime.toISOString(),
                updatedAt: now.toISOString(),
            })
            .where(eq(portfolioDuels.id, duelId));

        // Notify both players that duel has started
        const ws = getWebSocketServer();
        const [updatedDuel] = await db.select().from(portfolioDuels).where(eq(portfolioDuels.id, duelId));

        if (updatedDuel) {
            ws.sendToUser(updatedDuel.creatorId, { type: 'duel_started', duelId });
            if (updatedDuel.opponentId) {
                ws.sendToUser(updatedDuel.opponentId, { type: 'duel_started', duelId });
            }
        }
    }

    /**
     * Calculate current scores for an active duel
     */
    async calculateDuelScores(duelId: number) {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [duel] = await db
            .select()
            .from(portfolioDuels)
            .where(eq(portfolioDuels.id, duelId))
            .limit(1);

        if (!duel) throw new Error("Duel not found");

        const picks = await db
            .select()
            .from(portfolioDuelPicks)
            .where(eq(portfolioDuelPicks.duelId, duelId));

        let creatorTotal = 0;
        let opponentTotal = 0;

        for (const pick of picks) {
            const currentScore = await this.getCurrentScore(pick.assetType, pick.assetId);
            const startScore = Number(pick.startScore) || 0;
            const scoreChange = currentScore - startScore;

            // Apply position multiplier
            const multiplier = POSITION_MULTIPLIERS[pick.position as DuelPosition] || 1;
            const pointsEarned = scoreChange * multiplier;

            // Update pick
            await db.update(portfolioDuelPicks)
                .set({
                    endScore: String(currentScore),
                    scoreChange: String(scoreChange),
                    pointsEarned: String(pointsEarned),
                })
                .where(eq(portfolioDuelPicks.id, pick.id));

            if (pick.userId === duel.creatorId) {
                creatorTotal += pointsEarned;
            } else {
                opponentTotal += pointsEarned;
            }
        }

        return { creatorTotal, opponentTotal };
    }

    /**
     * Finalize a completed duel
     */
    async finalizeDuel(duelId: number) {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [duel] = await db
            .select()
            .from(portfolioDuels)
            .where(eq(portfolioDuels.id, duelId))
            .limit(1);

        if (!duel || duel.status !== 'active') return;

        // Calculate final scores
        const { creatorTotal, opponentTotal } = await this.calculateDuelScores(duelId);

        // Determine winner
        let winnerId: number | null = null;
        if (creatorTotal > opponentTotal) {
            winnerId = duel.creatorId;
        } else if (opponentTotal > creatorTotal && duel.opponentId) {
            winnerId = duel.opponentId;
        }
        // If equal, it's a draw - split pot later

        // Update duel
        await db.update(portfolioDuels)
            .set({
                status: 'complete',
                winnerId,
                creatorFinalScore: String(creatorTotal),
                opponentFinalScore: String(opponentTotal),
                updatedAt: new Date().toISOString(),
            })
            .where(eq(portfolioDuels.id, duelId));

        // Award prize
        if (winnerId) {
            await this.creditPoints(winnerId, duel.prizePool);
        } else if (duel.opponentId) {
            // Draw - split the pot
            const halfPot = Math.floor(duel.prizePool / 2);
            await this.creditPoints(duel.creatorId, halfPot);
            await this.creditPoints(duel.opponentId, halfPot);
        }

        // Update stats
        await this.updateDuelStats(duel.creatorId, creatorTotal > opponentTotal, creatorTotal >= opponentTotal && opponentTotal >= creatorTotal, duel.anteAmount);
        if (duel.opponentId) {
            await this.updateDuelStats(duel.opponentId, opponentTotal > creatorTotal, creatorTotal >= opponentTotal && opponentTotal >= creatorTotal, duel.anteAmount);
        }

        // Notify players
        const ws = getWebSocketServer();
        ws.sendToUser(duel.creatorId, { type: 'duel_complete', duelId, winnerId });
        if (duel.opponentId) {
            ws.sendToUser(duel.opponentId, { type: 'duel_complete', duelId, winnerId });
        }
    }

    /**
     * Get a duel with all picks
     */
    async getDuelById(duelId: number) {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [duel] = await db
            .select()
            .from(portfolioDuels)
            .where(eq(portfolioDuels.id, duelId))
            .limit(1);

        if (!duel) return null;

        const picks = await db
            .select()
            .from(portfolioDuelPicks)
            .where(eq(portfolioDuelPicks.duelId, duelId));

        // Get user info
        const [creator] = await db.select().from(users).where(eq(users.id, duel.creatorId)).limit(1);
        const opponent = duel.opponentId
            ? (await db.select().from(users).where(eq(users.id, duel.opponentId)).limit(1))[0]
            : null;

        return {
            ...duel,
            creator,
            opponent,
            creatorPicks: picks.filter(p => p.userId === duel.creatorId),
            opponentPicks: picks.filter(p => p.userId === duel.opponentId),
        };
    }

    /**
     * Get user's active duels
     */
    async getActiveDuels(userId: number) {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const duels = await db
            .select()
            .from(portfolioDuels)
            .where(and(
                sql`(${portfolioDuels.creatorId} = ${userId} OR ${portfolioDuels.opponentId} = ${userId})`,
                sql`${portfolioDuels.status} IN ('drafting', 'active')`
            ))
            .orderBy(desc(portfolioDuels.createdAt));

        return duels;
    }

    /**
     * Get pending invites for user
     */
    async getPendingInvites(userId: number) {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const invites = await db
            .select()
            .from(portfolioDuelInvites)
            .where(and(
                eq(portfolioDuelInvites.receiverId, userId),
                eq(portfolioDuelInvites.status, 'pending')
            ))
            .orderBy(desc(portfolioDuelInvites.createdAt));

        return invites;
    }

    /**
     * Get duel leaderboard
     */
    async getLeaderboard(limit: number = 20) {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const stats = await db
            .select({
                userId: portfolioDuelStats.userId,
                name: users.name,
                wins: portfolioDuelStats.wins,
                losses: portfolioDuelStats.losses,
                totalDuels: portfolioDuelStats.totalDuels,
                netPoints: portfolioDuelStats.netPoints,
                currentWinStreak: portfolioDuelStats.currentWinStreak,
            })
            .from(portfolioDuelStats)
            .innerJoin(users, eq(portfolioDuelStats.userId, users.id))
            .orderBy(desc(portfolioDuelStats.wins))
            .limit(limit);

        return stats;
    }

    // ===== Helper Methods =====

    private validatePositionAssetType(position: DuelPosition, assetType: string) {
        const validTypes: Record<DuelPosition, string> = {
            STRAIN_1: 'strain',
            STRAIN_2: 'strain',
            MANUFACTURER: 'manufacturer',
            PRODUCT: 'product',
            PHARMACY: 'pharmacy',
        };

        if (validTypes[position] !== assetType) {
            throw new Error(`Position ${position} requires asset type ${validTypes[position]}, got ${assetType}`);
        }
    }

    private async getAssetName(assetType: string, assetId: number): Promise<string> {
        const db = await getDb();
        if (!db) return 'Unknown';

        switch (assetType) {
            case 'strain':
                const [strain] = await db.select().from(cannabisStrains).where(eq(cannabisStrains.id, assetId)).limit(1);
                return strain?.name || 'Unknown Strain';
            case 'manufacturer':
                const [mfg] = await db.select().from(manufacturers).where(eq(manufacturers.id, assetId)).limit(1);
                return mfg?.name || 'Unknown Manufacturer';
            case 'product':
                const [product] = await db.select().from(strains).where(eq(strains.id, assetId)).limit(1);
                return product?.name || 'Unknown Product';
            case 'pharmacy':
                const [phm] = await db.select().from(pharmacies).where(eq(pharmacies.id, assetId)).limit(1);
                return phm?.name || 'Unknown Pharmacy';
            default:
                return 'Unknown';
        }
    }

    private async getCurrentScore(assetType: string, assetId: number): Promise<number> {
        const db = await getDb();
        if (!db) return 0;

        const today = new Date().toISOString().split('T')[0];

        switch (assetType) {
            case 'strain':
                const [strainStat] = await db
                    .select()
                    .from(strainDailyChallengeStats)
                    .where(and(
                        eq(strainDailyChallengeStats.strainId, assetId),
                        eq(strainDailyChallengeStats.statDate, today)
                    ))
                    .limit(1);
                return strainStat?.totalPoints || 0;
            case 'manufacturer':
                const [mfgStat] = await db
                    .select()
                    .from(manufacturerDailyChallengeStats)
                    .where(and(
                        eq(manufacturerDailyChallengeStats.manufacturerId, assetId),
                        eq(manufacturerDailyChallengeStats.statDate, today)
                    ))
                    .limit(1);
                return mfgStat?.totalPoints || 0;
            case 'product':
                const [prodStat] = await db
                    .select()
                    .from(productDailyChallengeStats)
                    .where(and(
                        eq(productDailyChallengeStats.productId, assetId),
                        eq(productDailyChallengeStats.statDate, today)
                    ))
                    .limit(1);
                return prodStat?.totalPoints || 0;
            case 'pharmacy':
                const [phmStat] = await db
                    .select()
                    .from(pharmacyDailyChallengeStats)
                    .where(and(
                        eq(pharmacyDailyChallengeStats.pharmacyId, assetId),
                        eq(pharmacyDailyChallengeStats.statDate, today)
                    ))
                    .limit(1);
                return phmStat?.totalPoints || 0;
            default:
                return 0;
        }
    }

    private async deductPoints(userId: number, amount: number) {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.update(users)
            .set({
                referralCredits: sql`GREATEST(0, ${users.referralCredits} - ${amount})`
            })
            .where(eq(users.id, userId));
    }

    private async creditPoints(userId: number, amount: number) {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.update(users)
            .set({
                referralCredits: sql`COALESCE(${users.referralCredits}, 0) + ${amount}`
            })
            .where(eq(users.id, userId));
    }

    private async updateDuelStats(userId: number, isWin: boolean, isDraw: boolean, anteAmount: number) {
        const db = await getDb();
        if (!db) return;

        const existing = await db
            .select()
            .from(portfolioDuelStats)
            .where(eq(portfolioDuelStats.userId, userId))
            .limit(1);

        if (existing.length === 0) {
            // Create new stats record
            await db.insert(portfolioDuelStats).values({
                userId,
                totalDuels: 1,
                wins: isWin ? 1 : 0,
                losses: !isWin && !isDraw ? 1 : 0,
                draws: isDraw ? 1 : 0,
                totalPointsWon: isWin ? anteAmount * 2 : (isDraw ? anteAmount : 0),
                totalPointsLost: !isWin && !isDraw ? anteAmount : 0,
                netPoints: isWin ? anteAmount : (isDraw ? 0 : -anteAmount),
                currentWinStreak: isWin ? 1 : 0,
                longestWinStreak: isWin ? 1 : 0,
            });
        } else {
            const stats = existing[0];
            const newStreak = isWin ? stats.currentWinStreak + 1 : 0;

            await db.update(portfolioDuelStats)
                .set({
                    totalDuels: sql`${portfolioDuelStats.totalDuels} + 1`,
                    wins: isWin ? sql`${portfolioDuelStats.wins} + 1` : stats.wins,
                    losses: !isWin && !isDraw ? sql`${portfolioDuelStats.losses} + 1` : stats.losses,
                    draws: isDraw ? sql`${portfolioDuelStats.draws} + 1` : stats.draws,
                    totalPointsWon: isWin ? sql`${portfolioDuelStats.totalPointsWon} + ${anteAmount * 2}` : stats.totalPointsWon,
                    totalPointsLost: !isWin && !isDraw ? sql`${portfolioDuelStats.totalPointsLost} + ${anteAmount}` : stats.totalPointsLost,
                    netPoints: sql`${portfolioDuelStats.netPoints} + ${isWin ? anteAmount : (isDraw ? 0 : -anteAmount)}`,
                    currentWinStreak: newStreak,
                    longestWinStreak: Math.max(stats.longestWinStreak, newStreak),
                    updatedAt: new Date().toISOString(),
                })
                .where(eq(portfolioDuelStats.userId, userId));
        }
    }
}

export const portfolioDuelsService = new PortfolioDuelsService();
export const getPortfolioDuelsService = () => portfolioDuelsService;
