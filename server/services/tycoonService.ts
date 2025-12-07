import { getDb } from "../db";
import { eq, desc, sql, and } from "drizzle-orm";
import {
    dispensaries,
    dispensaryInventory,
    dispensaryStaff,
    dispensaryUpgrades,
    dispensarySales,
    dispensaryDailyStats,
} from "../../drizzle/dispensaryTycoonSchema";
import { strains } from "../../drizzle/schema";

// ============================================================================
// GAME CONSTANTS
// ============================================================================

export const STARTING_CASH = 10000; // $100.00 in cents
export const STARTING_GEMS = 10;
export const STARTING_REPUTATION = 100;

// Staff salary ranges (cents per day)
export const STAFF_SALARIES = {
    budtender: { min: 5000, max: 15000 },
    grower: { min: 8000, max: 25000 },
    manager: { min: 10000, max: 35000 },
    security: { min: 6000, max: 18000 },
} as const;

// Upgrade costs (cents)
export const UPGRADE_COSTS = {
    display_case: [5000, 15000, 50000, 150000, 500000],
    pos_system: [3000, 10000, 35000, 100000, 300000],
    waiting_area: [2000, 8000, 25000, 75000, 200000],
    grow_room: [25000, 75000, 200000, 500000, 1500000],
    security_system: [4000, 12000, 40000, 120000, 400000],
} as const;

// Upgrade effects
export const UPGRADE_EFFECTS = {
    display_case: { salesMultiplier: 0.1 },
    pos_system: { speedMultiplier: 0.15 },
    waiting_area: { capacityMultiplier: 0.2 },
    grow_room: { costReduction: 0.08 },
    security_system: { theftReduction: 0.25 },
} as const;

// ============================================================================
// DISPENSARY MANAGEMENT
// ============================================================================

export async function createDispensary(userId: number, name: string) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };

    const existing = await db.select().from(dispensaries).where(eq(dispensaries.userId, userId)).limit(1);

    if (existing.length > 0) {
        return { success: false, error: "User already has a dispensary", dispensary: existing[0] };
    }

    const [newDispensary] = await db.insert(dispensaries).values({
        userId,
        name,
        level: 1,
        cashBalance: STARTING_CASH,
        gemBalance: STARTING_GEMS,
        reputation: STARTING_REPUTATION,
        totalRevenue: 0,
        totalCustomers: 0,
        totalSales: 0,
        lastActiveAt: new Date().toISOString(),
        idleEarnings: 0,
    }).returning();

    return { success: true, dispensary: newDispensary };
}

export async function getDispensary(userId: number) {
    const db = await getDb();
    if (!db) return null;

    const [dispensary] = await db.select()
        .from(dispensaries)
        .where(eq(dispensaries.userId, userId))
        .limit(1);

    return dispensary || null;
}

export async function getDispensaryById(id: number) {
    const db = await getDb();
    if (!db) return null;

    const [dispensary] = await db.select()
        .from(dispensaries)
        .where(eq(dispensaries.id, id))
        .limit(1);

    return dispensary || null;
}

export async function collectIdleEarnings(dispensaryId: number) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };

    const [dispensary] = await db.select()
        .from(dispensaries)
        .where(eq(dispensaries.id, dispensaryId));

    if (!dispensary || dispensary.idleEarnings <= 0) {
        return { collected: 0 };
    }

    const collected = dispensary.idleEarnings;

    await db.update(dispensaries)
        .set({
            cashBalance: sql`${dispensaries.cashBalance} + ${collected}`,
            idleEarnings: 0,
            lastActiveAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        })
        .where(eq(dispensaries.id, dispensaryId));

    return { collected };
}

// ============================================================================
// INVENTORY MANAGEMENT
// ============================================================================

export async function getInventory(dispensaryId: number) {
    const db = await getDb();
    if (!db) return [];

    const inventory = await db.select({
        id: dispensaryInventory.id,
        dispensaryId: dispensaryInventory.dispensaryId,
        strainId: dispensaryInventory.strainId,
        quantity: dispensaryInventory.quantity,
        purchaseCostCents: dispensaryInventory.purchaseCostCents,
        salePriceCents: dispensaryInventory.salePriceCents,
        totalSold: dispensaryInventory.totalSold,
        totalRevenue: dispensaryInventory.totalRevenue,
        lastRestocked: dispensaryInventory.lastRestocked,
        strainName: strains.name,
        strainGenetics: strains.genetics,
        strainThc: strains.thcContent,
        strainCbd: strains.cbdContent,
        strainDescription: strains.description,
    })
        .from(dispensaryInventory)
        .innerJoin(strains, eq(dispensaryInventory.strainId, strains.id))
        .where(eq(dispensaryInventory.dispensaryId, dispensaryId));

    return inventory;
}

export async function purchaseStock(dispensaryId: number, strainId: number, quantity: number) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };

    const [strain] = await db.select().from(strains).where(eq(strains.id, strainId)).limit(1);
    if (!strain) return { success: false, error: "Strain not found" };

    const [dispensary] = await db.select().from(dispensaries).where(eq(dispensaries.id, dispensaryId)).limit(1);
    if (!dispensary) return { success: false, error: "Dispensary not found" };

    const wholesaleCost = Math.floor(strain.avgPriceCents * 0.6);
    const totalCost = wholesaleCost * quantity;

    if (dispensary.cashBalance < totalCost) {
        return { success: false, error: "Insufficient funds" };
    }

    const defaultSalePrice = Math.floor(wholesaleCost * 1.5);

    const [existing] = await db.select()
        .from(dispensaryInventory)
        .where(and(
            eq(dispensaryInventory.dispensaryId, dispensaryId),
            eq(dispensaryInventory.strainId, strainId)
        ))
        .limit(1);

    if (existing) {
        await db.update(dispensaryInventory)
            .set({
                quantity: sql`${dispensaryInventory.quantity} + ${quantity}`,
                lastRestocked: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            })
            .where(eq(dispensaryInventory.id, existing.id));
    } else {
        await db.insert(dispensaryInventory).values({
            dispensaryId,
            strainId,
            quantity,
            purchaseCostCents: wholesaleCost,
            salePriceCents: defaultSalePrice,
            totalSold: 0,
            totalRevenue: 0,
            lastRestocked: new Date().toISOString(),
        });
    }

    await db.update(dispensaries)
        .set({
            cashBalance: sql`${dispensaries.cashBalance} - ${totalCost}`,
            updatedAt: new Date().toISOString()
        })
        .where(eq(dispensaries.id, dispensaryId));

    return { success: true, cost: totalCost, quantity };
}

export async function updatePrice(dispensaryId: number, strainId: number, newPriceCents: number) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };

    await db.update(dispensaryInventory)
        .set({
            salePriceCents: newPriceCents,
            updatedAt: new Date().toISOString()
        })
        .where(and(
            eq(dispensaryInventory.dispensaryId, dispensaryId),
            eq(dispensaryInventory.strainId, strainId)
        ));

    return { success: true };
}

// ============================================================================
// STAFF MANAGEMENT
// ============================================================================

export async function getStaff(dispensaryId: number) {
    const db = await getDb();
    if (!db) return [];

    return db.select()
        .from(dispensaryStaff)
        .where(eq(dispensaryStaff.dispensaryId, dispensaryId));
}

export async function hireStaff(
    dispensaryId: number,
    role: 'budtender' | 'grower' | 'manager' | 'security',
    name: string
) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };

    const [dispensary] = await db.select().from(dispensaries).where(eq(dispensaries.id, dispensaryId)).limit(1);
    if (!dispensary) return { success: false, error: "Dispensary not found" };

    const salary = STAFF_SALARIES[role].min;
    const hiringCost = salary * 7;

    if (dispensary.cashBalance < hiringCost) {
        return { success: false, error: "Insufficient funds for hiring" };
    }

    await db.update(dispensaries)
        .set({
            cashBalance: sql`${dispensaries.cashBalance} - ${hiringCost}`,
            updatedAt: new Date().toISOString()
        })
        .where(eq(dispensaries.id, dispensaryId));

    const [newStaff] = await db.insert(dispensaryStaff).values({
        dispensaryId,
        role,
        name,
        level: 1,
        salaryCents: salary,
        bonusMultiplier: "1.00",
        hiredAt: new Date().toISOString(),
        lastPaidAt: new Date().toISOString(),
    }).returning();

    return { success: true, staff: newStaff, hiringCost };
}

export async function fireStaff(dispensaryId: number, staffId: number) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };

    await db.delete(dispensaryStaff)
        .where(and(
            eq(dispensaryStaff.id, staffId),
            eq(dispensaryStaff.dispensaryId, dispensaryId)
        ));

    return { success: true };
}

// ============================================================================
// UPGRADES
// ============================================================================

export async function getUpgrades(dispensaryId: number) {
    const db = await getDb();
    if (!db) return [];

    return db.select()
        .from(dispensaryUpgrades)
        .where(eq(dispensaryUpgrades.dispensaryId, dispensaryId));
}

export async function purchaseUpgrade(
    dispensaryId: number,
    upgradeType: keyof typeof UPGRADE_COSTS
) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };

    const [dispensary] = await db.select().from(dispensaries).where(eq(dispensaries.id, dispensaryId)).limit(1);
    if (!dispensary) return { success: false, error: "Dispensary not found" };

    const [existing] = await db.select()
        .from(dispensaryUpgrades)
        .where(and(
            eq(dispensaryUpgrades.dispensaryId, dispensaryId),
            eq(dispensaryUpgrades.upgradeType, upgradeType)
        ))
        .limit(1);

    const currentLevel = existing?.level || 0;
    const costs = UPGRADE_COSTS[upgradeType];

    if (currentLevel >= costs.length) {
        return { success: false, error: "Max level reached" };
    }

    const upgradeCost = costs[currentLevel];

    if (dispensary.cashBalance < upgradeCost) {
        return { success: false, error: "Insufficient funds" };
    }

    await db.update(dispensaries)
        .set({
            cashBalance: sql`${dispensaries.cashBalance} - ${upgradeCost}`,
            updatedAt: new Date().toISOString()
        })
        .where(eq(dispensaries.id, dispensaryId));

    if (existing) {
        await db.update(dispensaryUpgrades)
            .set({ level: currentLevel + 1 })
            .where(eq(dispensaryUpgrades.id, existing.id));
    } else {
        await db.insert(dispensaryUpgrades).values({
            dispensaryId,
            upgradeType,
            level: 1,
        });
    }

    return { success: true, newLevel: currentLevel + 1, cost: upgradeCost };
}

// ============================================================================
// LEADERBOARDS
// ============================================================================

export async function getLeaderboard(boardType: string, limit: number = 100) {
    const db = await getDb();
    if (!db) return [];

    const today = new Date().toISOString().split('T')[0];

    if (boardType === 'revenue_daily') {
        return db.select({
            rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${dispensaryDailyStats.revenue} DESC)`,
            dispensaryId: dispensaryDailyStats.dispensaryId,
            dispensaryName: dispensaries.name,
            userId: dispensaries.userId,
            score: dispensaryDailyStats.revenue,
            level: dispensaries.level,
        })
            .from(dispensaryDailyStats)
            .innerJoin(dispensaries, eq(dispensaryDailyStats.dispensaryId, dispensaries.id))
            .where(eq(dispensaryDailyStats.statDate, today))
            .orderBy(desc(dispensaryDailyStats.revenue))
            .limit(limit);
    }

    if (boardType === 'customers_all_time') {
        return db.select({
            rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${dispensaries.totalCustomers} DESC)`,
            dispensaryId: dispensaries.id,
            dispensaryName: dispensaries.name,
            userId: dispensaries.userId,
            score: dispensaries.totalCustomers,
            level: dispensaries.level,
        })
            .from(dispensaries)
            .orderBy(desc(dispensaries.totalCustomers))
            .limit(limit);
    }

    // Default: revenue_all_time
    return db.select({
        rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${dispensaries.totalRevenue} DESC)`,
        dispensaryId: dispensaries.id,
        dispensaryName: dispensaries.name,
        userId: dispensaries.userId,
        score: dispensaries.totalRevenue,
        level: dispensaries.level,
    })
        .from(dispensaries)
        .orderBy(desc(dispensaries.totalRevenue))
        .limit(limit);
}

export async function getPlayerRank(dispensaryId: number, boardType: string = 'revenue_all_time') {
    const leaderboard = await getLeaderboard(boardType, 10000);
    const playerEntry = leaderboard.find((e: { dispensaryId: number }) => e.dispensaryId === dispensaryId);
    return playerEntry?.rank || null;
}

// ============================================================================
// AVAILABLE STRAINS FOR PURCHASE
// ============================================================================

export async function getAvailableStrains(limit: number = 50, offset: number = 0) {
    const db = await getDb();
    if (!db) return [];

    return db.select({
        id: strains.id,
        name: strains.name,
        genetics: strains.genetics,
        thcContent: strains.thcContent,
        cbdContent: strains.cbdContent,
        description: strains.description,
        avgPriceCents: strains.avgPriceCents,
        wholesaleCost: sql<number>`FLOOR(${strains.avgPriceCents} * 0.6)`,
        favoriteCount: strains.favoriteCount,
        pharmacyCount: strains.pharmacyCount,
    })
        .from(strains)
        .orderBy(desc(strains.favoriteCount))
        .limit(limit)
        .offset(offset);
}

// ============================================================================
// SALES SIMULATION
// ============================================================================

export async function simulateSales(dispensaryId: number) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };

    const inventory = await db.select()
        .from(dispensaryInventory)
        .where(and(
            eq(dispensaryInventory.dispensaryId, dispensaryId),
            sql`${dispensaryInventory.quantity} > 0`
        ));

    if (inventory.length === 0) {
        return { sales: 0, revenue: 0 };
    }

    const upgrades = await getUpgrades(dispensaryId);
    const displayLevel = upgrades.find((u: { upgradeType: string }) => u.upgradeType === 'display_case')?.level || 0;
    const posLevel = upgrades.find((u: { upgradeType: string }) => u.upgradeType === 'pos_system')?.level || 0;

    const salesBonus = 1 + (displayLevel * 0.1) + (posLevel * 0.05);

    let totalSales = 0;
    let totalRevenue = 0;

    for (const item of inventory) {
        const baseSales = Math.floor(Math.random() * 5) + 1;
        const priceFactor = item.purchaseCostCents / item.salePriceCents;
        const stockFactor = Math.min(item.quantity / 10, 1);

        let salesQuantity = Math.floor(baseSales * salesBonus * (0.5 + priceFactor) * stockFactor);
        salesQuantity = Math.min(salesQuantity, item.quantity);

        if (salesQuantity > 0) {
            const saleRevenue = salesQuantity * item.salePriceCents;

            await db.insert(dispensarySales).values({
                dispensaryId,
                strainId: item.strainId,
                quantitySold: salesQuantity,
                salePriceCents: item.salePriceCents,
                totalRevenueCents: saleRevenue,
                customerRating: Math.floor(Math.random() * 2) + 4,
            });

            await db.update(dispensaryInventory)
                .set({
                    quantity: sql`${dispensaryInventory.quantity} - ${salesQuantity}`,
                    totalSold: sql`${dispensaryInventory.totalSold} + ${salesQuantity}`,
                    totalRevenue: sql`${dispensaryInventory.totalRevenue} + ${saleRevenue}`,
                    updatedAt: new Date().toISOString()
                })
                .where(eq(dispensaryInventory.id, item.id));

            totalSales += salesQuantity;
            totalRevenue += saleRevenue;
        }
    }

    if (totalSales > 0) {
        await db.update(dispensaries)
            .set({
                totalRevenue: sql`${dispensaries.totalRevenue} + ${totalRevenue}`,
                totalCustomers: sql`${dispensaries.totalCustomers} + ${totalSales}`,
                totalSales: sql`${dispensaries.totalSales} + ${totalSales}`,
                cashBalance: sql`${dispensaries.cashBalance} + ${totalRevenue}`,
                updatedAt: new Date().toISOString()
            })
            .where(eq(dispensaries.id, dispensaryId));
    }

    return { sales: totalSales, revenue: totalRevenue };
}

export default {
    createDispensary,
    getDispensary,
    getDispensaryById,
    collectIdleEarnings,
    getInventory,
    purchaseStock,
    updatePrice,
    getStaff,
    hireStaff,
    fireStaff,
    getUpgrades,
    purchaseUpgrade,
    getLeaderboard,
    getPlayerRank,
    getAvailableStrains,
    simulateSales,
    UPGRADE_COSTS,
    UPGRADE_EFFECTS,
    STAFF_SALARIES,
};
