import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  manufacturers,
  pharmacies,
  brands,
  strains,
  cannabisStrains,
  teams,
  users,
  weeklyTeamScores,
  leagues,
} from "../drizzle/schema";
import {
  manufacturerDailyChallengeStats,
  pharmacyDailyChallengeStats,
  brandDailyChallengeStats,
  productDailyChallengeStats,
  strainDailyChallengeStats,
} from "../drizzle/dailyChallengeSchema";
import { desc, eq, and, sql, gt, gte } from "drizzle-orm";

function prioritizeByLogo<
  T extends { logoUrl?: string | null; score?: number | null }
>(rows: T[], limit: number): T[] {
  if (!rows || rows.length === 0) return [];

  const sorted = [...rows].sort((a, b) => {
    const sa = typeof a.score === "number" ? (a.score as number) : 0;
    const sb = typeof b.score === "number" ? (b.score as number) : 0;

    // Primary: sort by score descending
    if (sb !== sa) return sb - sa;

    // Secondary: prefer entries with a non-empty logo
    const aHasLogo = !!(a.logoUrl && a.logoUrl.trim().length > 0);
    const bHasLogo = !!(b.logoUrl && b.logoUrl.trim().length > 0);
    if (aHasLogo !== bHasLogo) return aHasLogo ? -1 : 1;

    return 0;
  });

  return sorted.slice(0, limit);
}

export const leaderboardRouter = router({
  /**
   * Get Daily Entity Leaderboard
   */
  getDailyEntityLeaderboard: publicProcedure
    .input(z.object({
      date: z.string().optional(), // YYYY-MM-DD
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { manufacturers: [], pharmacies: [], brands: [], products: [], strains: [] };
      }

      // If no date provided, find the latest date with data from daily challenge stats
      let targetDate = input.date;
      if (!targetDate) {
        const [latestMfg, latestBrand] = await Promise.all([
          db
            .select({ date: manufacturerDailyChallengeStats.statDate })
            .from(manufacturerDailyChallengeStats)
            .orderBy(desc(manufacturerDailyChallengeStats.statDate))
            .limit(1),
          db
            .select({ date: brandDailyChallengeStats.statDate })
            .from(brandDailyChallengeStats)
            .orderBy(desc(brandDailyChallengeStats.statDate))
            .limit(1)
        ]);

        const mfgDate = latestMfg.length > 0 ? latestMfg[0].date : null;
        const brandDate = latestBrand.length > 0 ? latestBrand[0].date : null;

        if (mfgDate && brandDate) {
          // Take the later of the two
          targetDate = mfgDate > brandDate ? mfgDate : brandDate;
        } else if (mfgDate) {
          targetDate = mfgDate;
        } else if (brandDate) {
          targetDate = brandDate;
        } else {
          // Fallback (will just return empty lists)
          targetDate = new Date().toISOString().split("T")[0];
        }
      }

      // Core categories from daily challenge stats
      const [
        topManufacturers,
        topPharmacies,
        rawBrands,
        topStrains,
      ] = await Promise.all([
        // Manufacturers
        db
          .select({
            id: manufacturers.id,
            name: manufacturers.name,
            logoUrl: manufacturers.logoUrl,
            description: manufacturers.description,
            score: manufacturerDailyChallengeStats.totalPoints,
          })
          .from(manufacturerDailyChallengeStats)
          .innerJoin(
            manufacturers,
            eq(manufacturerDailyChallengeStats.manufacturerId, manufacturers.id),
          )
          .where(eq(manufacturerDailyChallengeStats.statDate, targetDate!))
          .orderBy(desc(manufacturerDailyChallengeStats.totalPoints))
          .limit(input.limit),

        // Pharmacies
        db
          .select({
            id: pharmacies.id,
            name: pharmacies.name,
            logoUrl: pharmacies.logoUrl,
            description: pharmacies.description,
            score: pharmacyDailyChallengeStats.totalPoints,
          })
          .from(pharmacyDailyChallengeStats)
          .innerJoin(
            pharmacies,
            eq(pharmacyDailyChallengeStats.pharmacyId, pharmacies.id),
          )
          .where(eq(pharmacyDailyChallengeStats.statDate, targetDate!))
          .orderBy(desc(pharmacyDailyChallengeStats.totalPoints))
          .limit(input.limit),

        // Brands
        db
          .select({
            id: brands.id,
            name: brands.name,
            logoUrl: brands.logoUrl,
            description: brands.description,
            score: brandDailyChallengeStats.totalPoints,
          })
          .from(brandDailyChallengeStats)
          .innerJoin(
            brands,
            eq(brandDailyChallengeStats.brandId, brands.id),
          )
          .where(eq(brandDailyChallengeStats.statDate, targetDate!))
          .orderBy(desc(brandDailyChallengeStats.totalPoints))
          .limit(input.limit * 3),

        // Flower (strains)
        db
          .select({
            id: cannabisStrains.id,
            name: cannabisStrains.name,
            imageUrl: cannabisStrains.imageUrl,
            description: cannabisStrains.description,
            score: strainDailyChallengeStats.totalPoints,
          })
          .from(strainDailyChallengeStats)
          .innerJoin(
            cannabisStrains,
            eq(strainDailyChallengeStats.strainId, cannabisStrains.id),
          )
          .where(eq(strainDailyChallengeStats.statDate, targetDate!))
          .orderBy(desc(strainDailyChallengeStats.totalPoints))
          .limit(input.limit),
      ]);

      const topBrands = prioritizeByLogo(rawBrands, input.limit);

      // Products from daily challenge stats (best-effort; if anything is off, just log and return empty)
      let topProducts: any[] = [];

      try {
        topProducts = await db
          .select({
            id: strains.id,
            name: strains.name,
            score: productDailyChallengeStats.totalPoints,
            imageUrl: cannabisStrains.imageUrl,
            description: strains.description,
          })
          .from(productDailyChallengeStats)
          .innerJoin(
            strains,
            eq(productDailyChallengeStats.productId, strains.id),
          )
          .leftJoin(
            cannabisStrains,
            eq(strains.strainId, cannabisStrains.id),
          )
          .where(eq(productDailyChallengeStats.statDate, targetDate!))
          .orderBy(desc(productDailyChallengeStats.totalPoints))
          .limit(input.limit);
      } catch (err) {
        console.error(
          "[Leaderboard] Error fetching daily product leaderboard – falling back to empty list:",
          err,
        );
        topProducts = [];
      }

      return {
        date: targetDate,
        manufacturers: topManufacturers,
        pharmacies: topPharmacies,
        brands: topBrands,
        products: topProducts,
        strains: topStrains,
      };
    }),

  /**
   * Get Weekly Entity Leaderboard
   * Aggregates daily challenge stats for the current ISO week
   */
  getWeeklyEntityLeaderboard: publicProcedure
    .input(z.object({
      year: z.number().optional(),
      week: z.number().optional(),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { manufacturers: [], pharmacies: [], brands: [], products: [], strains: [] };

      // Calculate ISO week and date range
      const now = new Date();
      let targetYear = input.year ?? now.getFullYear();
      let targetWeek = input.week;

      // If no week provided, calculate current ISO week
      if (!targetWeek) {
        const jan1 = new Date(targetYear, 0, 1);
        const days = Math.floor((now.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000));
        targetWeek = Math.ceil((days + jan1.getDay() + 1) / 7);
      }

      // Calculate date range for the week (Monday to Sunday)
      const simpleDate = new Date(targetYear, 0, 1 + (targetWeek - 1) * 7);
      const dayOfWeek = simpleDate.getDay();
      const ISOweekStart = new Date(simpleDate);
      if (dayOfWeek <= 4) {
        ISOweekStart.setDate(simpleDate.getDate() - simpleDate.getDay() + 1);
      } else {
        ISOweekStart.setDate(simpleDate.getDate() + 8 - simpleDate.getDay());
      }

      const startDate = ISOweekStart.toISOString().split('T')[0];
      const endDate = new Date(ISOweekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [
        rawManufacturers,
        rawPharmacies,
        rawBrands,
        rawStrains,
        rawProducts,
      ] = await Promise.all([
        // Manufacturers: Aggregate from Daily Challenge Stats
        db
          .select({
            id: manufacturers.id,
            name: manufacturers.name,
            logoUrl: manufacturers.logoUrl,
            score: sql<number>`sum(${manufacturerDailyChallengeStats.totalPoints})`.mapWith(Number),
          })
          .from(manufacturerDailyChallengeStats)
          .innerJoin(manufacturers, eq(manufacturerDailyChallengeStats.manufacturerId, manufacturers.id))
          .where(
            and(
              sql`${manufacturerDailyChallengeStats.statDate} >= ${startDate}`,
              sql`${manufacturerDailyChallengeStats.statDate} <= ${endDate}`
            )
          )
          .groupBy(manufacturers.id, manufacturers.name, manufacturers.logoUrl)
          .orderBy(desc(sql`sum(${manufacturerDailyChallengeStats.totalPoints})`))
          .limit(input.limit * 3),

        // Pharmacies: Aggregate from Daily Challenge Stats
        db
          .select({
            id: pharmacies.id,
            name: pharmacies.name,
            logoUrl: pharmacies.logoUrl,
            score: sql<number>`sum(${pharmacyDailyChallengeStats.totalPoints})`.mapWith(Number),
          })
          .from(pharmacyDailyChallengeStats)
          .innerJoin(pharmacies, eq(pharmacyDailyChallengeStats.pharmacyId, pharmacies.id))
          .where(
            and(
              sql`${pharmacyDailyChallengeStats.statDate} >= ${startDate}`,
              sql`${pharmacyDailyChallengeStats.statDate} <= ${endDate}`
            )
          )
          .groupBy(pharmacies.id, pharmacies.name, pharmacies.logoUrl)
          .orderBy(desc(sql`sum(${pharmacyDailyChallengeStats.totalPoints})`))
          .limit(input.limit * 3),

        // Brands: Aggregate from Daily Challenge Stats
        db
          .select({
            id: brands.id,
            name: brands.name,
            logoUrl: brands.logoUrl,
            score: sql<number>`sum(${brandDailyChallengeStats.totalPoints})`.mapWith(Number),
          })
          .from(brandDailyChallengeStats)
          .innerJoin(brands, eq(brandDailyChallengeStats.brandId, brands.id))
          .where(
            and(
              sql`${brandDailyChallengeStats.statDate} >= ${startDate}`,
              sql`${brandDailyChallengeStats.statDate} <= ${endDate}`
            )
          )
          .groupBy(brands.id, brands.name, brands.logoUrl)
          .orderBy(desc(sql`sum(${brandDailyChallengeStats.totalPoints})`))
          .limit(input.limit * 3),

        // Strains (Flower): Aggregate from Daily Challenge Stats
        db
          .select({
            id: cannabisStrains.id,
            name: cannabisStrains.name,
            imageUrl: cannabisStrains.imageUrl,
            score: sql<number>`sum(${strainDailyChallengeStats.totalPoints})`.mapWith(Number),
          })
          .from(strainDailyChallengeStats)
          .innerJoin(cannabisStrains, eq(strainDailyChallengeStats.strainId, cannabisStrains.id))
          .where(
            and(
              sql`${strainDailyChallengeStats.statDate} >= ${startDate}`,
              sql`${strainDailyChallengeStats.statDate} <= ${endDate}`
            )
          )
          .groupBy(cannabisStrains.id, cannabisStrains.name, cannabisStrains.imageUrl)
          .orderBy(desc(sql`sum(${strainDailyChallengeStats.totalPoints})`))
          .limit(input.limit * 3),

        // Products: Aggregate from Daily Challenge Stats
        db
          .select({
            id: strains.id,
            name: strains.name,
            imageUrl: cannabisStrains.imageUrl,
            score: sql<number>`sum(${productDailyChallengeStats.totalPoints})`.mapWith(Number),
          })
          .from(productDailyChallengeStats)
          .innerJoin(strains, eq(productDailyChallengeStats.productId, strains.id))
          .leftJoin(cannabisStrains, eq(strains.strainId, cannabisStrains.id))
          .where(
            and(
              sql`${productDailyChallengeStats.statDate} >= ${startDate}`,
              sql`${productDailyChallengeStats.statDate} <= ${endDate}`
            )
          )
          .groupBy(strains.id, strains.name, cannabisStrains.imageUrl)
          .orderBy(desc(sql`sum(${productDailyChallengeStats.totalPoints})`))
          .limit(input.limit * 3),
      ]);

      // Prioritize entries with logos
      const topManufacturers = prioritizeByLogo(rawManufacturers, input.limit);
      const topPharmacies = prioritizeByLogo(rawPharmacies, input.limit);
      const topBrands = prioritizeByLogo(rawBrands, input.limit);
      const topStrains = rawStrains.slice(0, input.limit);
      const topProducts = rawProducts.slice(0, input.limit);

      return {
        year: targetYear,
        week: targetWeek,
        startDate,
        endDate,
        manufacturers: topManufacturers,
        pharmacies: topPharmacies,
        brands: topBrands,
        products: topProducts,
        strains: topStrains,
      };
    }),

  /**
   * Get Hall of Fame (Team Records)
   */
  getHallOfFame: publicProcedure
    .input(z.object({
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { seasonLeaders: [], weeklyHighScores: [] };

      // Season Leaders: Highest total pointsFor in the teams table
      const seasonLeaders = await db
        .select({
          teamId: teams.id,
          teamName: teams.name,
          totalScore: teams.pointsFor,
          userId: users.id,
          userName: users.name,
          avatarUrl: users.avatarUrl,
          leagueName: leagues.name,
          leagueId: leagues.id,
        })
        .from(teams)
        .innerJoin(users, eq(teams.userId, users.id))
        .innerJoin(leagues, eq(teams.leagueId, leagues.id))
        .where(gt(teams.pointsFor, 0))
        .orderBy(desc(teams.pointsFor))
        .limit(input.limit);

      // Weekly High Scores: Highest single week score from weeklyTeamScores
      const weeklyHighScores = await db
        .select({
          scoreId: weeklyTeamScores.id,
          teamId: teams.id,
          teamName: teams.name,
          score: weeklyTeamScores.totalPoints,
          year: weeklyTeamScores.year,
          week: weeklyTeamScores.week,
          userId: users.id,
          userName: users.name,
          avatarUrl: users.avatarUrl,
          leagueName: leagues.name,
        })
        .from(weeklyTeamScores)
        .innerJoin(teams, eq(weeklyTeamScores.teamId, teams.id))
        .innerJoin(users, eq(teams.userId, users.id))
        .innerJoin(leagues, eq(teams.leagueId, leagues.id))
        .where(gt(weeklyTeamScores.totalPoints, 0))
        .orderBy(desc(weeklyTeamScores.totalPoints))
        .limit(input.limit);

      return {
        seasonLeaders,
        weeklyHighScores,
      };
    }),

  /**
   * Get Entity History
   * Fetches historical performance data for a specific entity
   */
  getEntityHistory: publicProcedure
    .input(z.object({
      entityType: z.enum(['manufacturer', 'pharmacy', 'brand', 'product', 'strain']),
      entityId: z.number(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const { entityType, entityId, days } = input;
      const db = await getDb();
      if (!db) return { history: [], dayOfWeekAverages: [] };

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      let history: any[] = [];
      let entityDetails: any = null;

      if (entityType === 'manufacturer') {
        const details = await db.select().from(manufacturers).where(eq(manufacturers.id, entityId)).limit(1);
        if (details.length > 0) entityDetails = details[0];

        history = await db
          .select({
            date: manufacturerDailyChallengeStats.statDate,
            score: manufacturerDailyChallengeStats.totalPoints,
            rank: manufacturerDailyChallengeStats.rank,
            marketShare: manufacturerDailyChallengeStats.marketSharePercent,
            streak: manufacturerDailyChallengeStats.streakDays,
            trend: manufacturerDailyChallengeStats.trendMultiplier,
            description: manufacturers.description,
          })
          .from(manufacturerDailyChallengeStats)
          .innerJoin(manufacturers, eq(manufacturerDailyChallengeStats.manufacturerId, manufacturers.id))
          .where(and(
            eq(manufacturerDailyChallengeStats.manufacturerId, entityId),
            gte(manufacturerDailyChallengeStats.statDate, startDateStr)
          ))
          .orderBy(desc(manufacturerDailyChallengeStats.statDate));
      } else if (entityType === 'pharmacy') {
        const details = await db.select().from(pharmacies).where(eq(pharmacies.id, entityId)).limit(1);
        if (details.length > 0) entityDetails = details[0];

        history = await db
          .select({
            date: pharmacyDailyChallengeStats.statDate,
            score: pharmacyDailyChallengeStats.totalPoints,
            rank: pharmacyDailyChallengeStats.rank,
            marketShare: pharmacyDailyChallengeStats.marketSharePercent,
            streak: pharmacyDailyChallengeStats.streakDays,
            trend: pharmacyDailyChallengeStats.trendMultiplier,
            description: pharmacies.description,
          })
          .from(pharmacyDailyChallengeStats)
          .innerJoin(pharmacies, eq(pharmacyDailyChallengeStats.pharmacyId, pharmacies.id))
          .where(and(
            eq(pharmacyDailyChallengeStats.pharmacyId, entityId),
            gte(pharmacyDailyChallengeStats.statDate, startDateStr)
          ))
          .orderBy(desc(pharmacyDailyChallengeStats.statDate));
      } else if (entityType === 'brand') {
        const details = await db.select().from(brands).where(eq(brands.id, entityId)).limit(1);
        if (details.length > 0) entityDetails = details[0];

        history = await db
          .select({
            date: brandDailyChallengeStats.statDate,
            score: brandDailyChallengeStats.totalPoints,
            rank: brandDailyChallengeStats.rank,
            rating: brandDailyChallengeStats.averageRating,
            ratingCount: brandDailyChallengeStats.totalRatings,
            description: brands.description,
          })
          .from(brandDailyChallengeStats)
          .innerJoin(brands, eq(brandDailyChallengeStats.brandId, brands.id))
          .where(and(
            eq(brandDailyChallengeStats.brandId, entityId),
            gte(brandDailyChallengeStats.statDate, startDateStr)
          ))
          .orderBy(desc(brandDailyChallengeStats.statDate));
      } else if (entityType === 'product') {
        const details = await db.select().from(strains).where(eq(strains.id, entityId)).limit(1);
        if (details.length > 0) entityDetails = details[0];

        history = await db
          .select({
            date: productDailyChallengeStats.statDate,
            score: productDailyChallengeStats.totalPoints,
            rank: productDailyChallengeStats.rank,
            marketShare: productDailyChallengeStats.marketSharePercent,
            streak: productDailyChallengeStats.streakDays,
            trend: productDailyChallengeStats.trendMultiplier,
            description: strains.description,
          })
          .from(productDailyChallengeStats)
          .innerJoin(strains, eq(productDailyChallengeStats.productId, strains.id))
          .where(and(
            eq(productDailyChallengeStats.productId, entityId),
            gte(productDailyChallengeStats.statDate, startDateStr)
          ))
          .orderBy(desc(productDailyChallengeStats.statDate));
      } else if (entityType === 'strain') {
        const details = await db.select().from(cannabisStrains).where(eq(cannabisStrains.id, entityId)).limit(1);
        if (details.length > 0) entityDetails = details[0];

        history = await db
          .select({
            date: strainDailyChallengeStats.statDate,
            score: strainDailyChallengeStats.totalPoints,
            rank: strainDailyChallengeStats.rank,
            marketShare: strainDailyChallengeStats.marketSharePercent,
            streak: strainDailyChallengeStats.streakDays,
            trend: strainDailyChallengeStats.trendMultiplier,
            description: cannabisStrains.description,
          })
          .from(strainDailyChallengeStats)
          .innerJoin(cannabisStrains, eq(strainDailyChallengeStats.strainId, cannabisStrains.id))
          .where(and(
            eq(strainDailyChallengeStats.strainId, entityId),
            gte(strainDailyChallengeStats.statDate, startDateStr)
          ))
          .orderBy(desc(strainDailyChallengeStats.statDate));
      }

      // Calculate average score by day of week
      const dayStats = {
        0: { sum: 0, count: 0, name: 'Sun' },
        1: { sum: 0, count: 0, name: 'Mon' },
        2: { sum: 0, count: 0, name: 'Tue' },
        3: { sum: 0, count: 0, name: 'Wed' },
        4: { sum: 0, count: 0, name: 'Thu' },
        5: { sum: 0, count: 0, name: 'Fri' },
        6: { sum: 0, count: 0, name: 'Sat' },
      };

      history.forEach(item => {
        const date = new Date(item.date);
        const day = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
        dayStats[day].sum += item.score;
        dayStats[day].count += 1;
      });

      // Format for chart: Mon -> Sun
      const dayOrder = [1, 2, 3, 4, 5, 6, 0];
      const dayOfWeekAverages = dayOrder.map(day => {
        const stats = dayStats[day as 0 | 1 | 2 | 3 | 4 | 5 | 6];
        return {
          day: stats.name,
          avgScore: stats.count > 0 ? Math.round(stats.sum / stats.count) : 0,
          count: stats.count
        };
      });

      // Reverse to chronological order for charts
      return {
        history: history.reverse(),
        dayOfWeekAverages,
        entityDetails
      };
    }),

  getEntityRank: publicProcedure
    .input(z.object({ entityType: z.enum(['manufacturer', 'pharmacy', 'brand', 'product', 'strain']), entityId: z.number() }))
    .query(async ({ input }) => {
      const { entityType, entityId } = input;
      const db = await getDb();
      if (!db) return null;
      const today = new Date().toISOString().split('T')[0];
      let allEntities: any[] = [];
      try {
        if (entityType === 'manufacturer') { allEntities = await db.select({ id: manufacturers.id, name: manufacturers.name, logoUrl: manufacturers.logoUrl, score: manufacturerDailyChallengeStats.totalPoints }).from(manufacturerDailyChallengeStats).innerJoin(manufacturers, eq(manufacturerDailyChallengeStats.manufacturerId, manufacturers.id)).where(eq(manufacturerDailyChallengeStats.statDate, today)).orderBy(desc(manufacturerDailyChallengeStats.totalPoints)); }
        else if (entityType === 'pharmacy') { allEntities = await db.select({ id: pharmacies.id, name: pharmacies.name, logoUrl: pharmacies.logoUrl, score: pharmacyDailyChallengeStats.totalPoints }).from(pharmacyDailyChallengeStats).innerJoin(pharmacies, eq(pharmacyDailyChallengeStats.pharmacyId, pharmacies.id)).where(eq(pharmacyDailyChallengeStats.statDate, today)).orderBy(desc(pharmacyDailyChallengeStats.totalPoints)); }
        else if (entityType === 'brand') { allEntities = await db.select({ id: brands.id, name: brands.name, logoUrl: brands.logoUrl, score: brandDailyChallengeStats.totalPoints }).from(brandDailyChallengeStats).innerJoin(brands, eq(brandDailyChallengeStats.brandId, brands.id)).where(eq(brandDailyChallengeStats.statDate, today)).orderBy(desc(brandDailyChallengeStats.totalPoints)); }
        else if (entityType === 'strain') { allEntities = await db.select({ id: cannabisStrains.id, name: cannabisStrains.name, imageUrl: cannabisStrains.imageUrl, score: strainDailyChallengeStats.totalPoints }).from(strainDailyChallengeStats).innerJoin(cannabisStrains, eq(strainDailyChallengeStats.strainId, cannabisStrains.id)).where(eq(strainDailyChallengeStats.statDate, today)).orderBy(desc(strainDailyChallengeStats.totalPoints)); }
        else if (entityType === 'product') { allEntities = await db.select({ id: strains.id, name: strains.name, imageUrl: cannabisStrains.imageUrl, score: productDailyChallengeStats.totalPoints }).from(productDailyChallengeStats).innerJoin(strains, eq(productDailyChallengeStats.productId, strains.id)).leftJoin(cannabisStrains, eq(strains.strainId, cannabisStrains.id)).where(eq(productDailyChallengeStats.statDate, today)).orderBy(desc(productDailyChallengeStats.totalPoints)); }
        const rank = allEntities.findIndex(e => e.id === entityId) + 1;
        const entity = allEntities.find(e => e.id === entityId);
        if (!entity) return null;
        return { id: entity.id, name: entity.name, imageUrl: entity.logoUrl || entity.imageUrl, score: entity.score, rank: rank > 0 ? rank : null, totalEntities: allEntities.length, date: today, entityType };
      } catch (error) { console.error('[Leaderboard] Error fetching entity rank:', error); return null; }
    }),

  getMiniLeaderboard: publicProcedure
    .input(z.object({ entityType: z.enum(['manufacturer', 'pharmacy', 'brand', 'product', 'strain']), limit: z.number().min(1).max(10).default(5), theme: z.enum(['light', 'dark', 'auto']).default('auto') }))
    .query(async ({ input }) => {
      const { entityType, limit } = input;
      const db = await getDb();
      if (!db) return { items: [], date: null, entityType, theme: input.theme };
      const today = new Date().toISOString().split('T')[0];
      let items: any[] = [];
      try {
        if (entityType === 'manufacturer') { items = await db.select({ id: manufacturers.id, name: manufacturers.name, imageUrl: manufacturers.logoUrl, score: manufacturerDailyChallengeStats.totalPoints }).from(manufacturerDailyChallengeStats).innerJoin(manufacturers, eq(manufacturerDailyChallengeStats.manufacturerId, manufacturers.id)).where(eq(manufacturerDailyChallengeStats.statDate, today)).orderBy(desc(manufacturerDailyChallengeStats.totalPoints)).limit(limit); }
        else if (entityType === 'pharmacy') { items = await db.select({ id: pharmacies.id, name: pharmacies.name, imageUrl: pharmacies.logoUrl, score: pharmacyDailyChallengeStats.totalPoints }).from(pharmacyDailyChallengeStats).innerJoin(pharmacies, eq(pharmacyDailyChallengeStats.pharmacyId, pharmacies.id)).where(eq(pharmacyDailyChallengeStats.statDate, today)).orderBy(desc(pharmacyDailyChallengeStats.totalPoints)).limit(limit); }
        else if (entityType === 'brand') { items = await db.select({ id: brands.id, name: brands.name, imageUrl: brands.logoUrl, score: brandDailyChallengeStats.totalPoints }).from(brandDailyChallengeStats).innerJoin(brands, eq(brandDailyChallengeStats.brandId, brands.id)).where(eq(brandDailyChallengeStats.statDate, today)).orderBy(desc(brandDailyChallengeStats.totalPoints)).limit(limit); }
        else if (entityType === 'strain') { items = await db.select({ id: cannabisStrains.id, name: cannabisStrains.name, imageUrl: cannabisStrains.imageUrl, score: strainDailyChallengeStats.totalPoints }).from(strainDailyChallengeStats).innerJoin(cannabisStrains, eq(strainDailyChallengeStats.strainId, cannabisStrains.id)).where(eq(strainDailyChallengeStats.statDate, today)).orderBy(desc(strainDailyChallengeStats.totalPoints)).limit(limit); }
        else if (entityType === 'product') { items = await db.select({ id: strains.id, name: strains.name, imageUrl: cannabisStrains.imageUrl, score: productDailyChallengeStats.totalPoints }).from(productDailyChallengeStats).innerJoin(strains, eq(productDailyChallengeStats.productId, strains.id)).leftJoin(cannabisStrains, eq(strains.strainId, cannabisStrains.id)).where(eq(productDailyChallengeStats.statDate, today)).orderBy(desc(productDailyChallengeStats.totalPoints)).limit(limit); }
        return { items: items.map((item, index) => ({ ...item, rank: index + 1 })), date: today, entityType, theme: input.theme };
      } catch (error) { console.error('[Leaderboard] Error fetching mini leaderboard:', error); return { items: [], date: null, entityType, theme: input.theme }; }
    }),

  getEmbedConfig: publicProcedure
    .input(z.object({ widgetType: z.enum(['leaderboard', 'entity-badge', 'mini-rank']) }))
    .query(async ({ input }) => {
      const baseUrl = process.env.APP_URL || 'https://cfl.weed.de';
      const configs: Record<string, any> = {
        'leaderboard': { defaultWidth: 320, defaultHeight: 400, minWidth: 280, maxWidth: 600, embedUrl: `${baseUrl}/embed/leaderboard`, supportedThemes: ['light', 'dark', 'auto'], supportedEntities: ['manufacturer', 'pharmacy', 'brand', 'product', 'strain'] },
        'entity-badge': { defaultWidth: 250, defaultHeight: 80, minWidth: 200, maxWidth: 400, embedUrl: `${baseUrl}/embed/entity`, supportedThemes: ['light', 'dark', 'auto'] },
        'mini-rank': { defaultWidth: 120, defaultHeight: 40, minWidth: 100, maxWidth: 200, embedUrl: `${baseUrl}/embed/rank`, supportedThemes: ['light', 'dark', 'auto'] },
      };
      return { ...configs[input.widgetType], widgetType: input.widgetType, brandColors: { primary: '#10b981', secondary: '#a3ff12', background: '#111827', card: '#1f2937', text: '#f9fafb', muted: '#9ca3af' }, attribution: { text: 'Powered by CFL', url: baseUrl, logo: `${baseUrl}/logo.svg` } };
    }),
});

