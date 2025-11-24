import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  manufacturers,
  pharmacies,
  brands,
  strains,
  products,
  cannabisStrains,
  manufacturerWeeklyStats,
  pharmacyWeeklyStats,
  brandWeeklyStats,
  strainWeeklyStats,
  cannabisStrainWeeklyStats,
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
import { desc, eq, and, sql, gt } from "drizzle-orm";

import { calculateStrainPoints } from "./scoringEngine";

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
          })
          .from(productDailyChallengeStats)
          .innerJoin(
            strains,
            eq(productDailyChallengeStats.productId, strains.id),
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

      // Logic to determine year/week if not provided
      let targetYear = input.year;
      let targetWeek = input.week;

      if (!targetYear || !targetWeek) {
        const latestStat = await db
          .select({ year: manufacturerWeeklyStats.year, week: manufacturerWeeklyStats.week })
          .from(manufacturerWeeklyStats)
          .orderBy(desc(manufacturerWeeklyStats.year), desc(manufacturerWeeklyStats.week))
          .limit(1);

        if (latestStat.length > 0) {
          targetYear = latestStat[0].year;
          targetWeek = latestStat[0].week;
        } else {
          // Default to something safe if no data
          const now = new Date();
          targetYear = now.getFullYear();
          targetWeek = 1;
        }
      }

      const [
        topManufacturers,
        topPharmacies,
        rawBrands,
        topStrains,
      ] = await Promise.all([
        // Manufacturers
        db.select({
          id: manufacturers.id,
          name: manufacturers.name,
          logoUrl: manufacturers.logoUrl,
          score: manufacturerWeeklyStats.totalPoints,
          rank: manufacturerWeeklyStats.marketShareRank,
          rankChange: manufacturerWeeklyStats.rankChange,
        })
          .from(manufacturerWeeklyStats)
          .innerJoin(
            manufacturers,
            eq(manufacturerWeeklyStats.manufacturerId, manufacturers.id),
          )
          .where(
            and(
              eq(manufacturerWeeklyStats.year, targetYear!),
              eq(manufacturerWeeklyStats.week, targetWeek!),
            ),
          )
          .orderBy(desc(manufacturerWeeklyStats.totalPoints))
          .limit(input.limit),

        // Pharmacies
        db.select({
          id: pharmacies.id,
          name: pharmacies.name,
          logoUrl: pharmacies.logoUrl,
          score: pharmacyWeeklyStats.totalPoints,
        })
          .from(pharmacyWeeklyStats)
          .innerJoin(pharmacies, eq(pharmacyWeeklyStats.pharmacyId, pharmacies.id))
          .where(
            and(
              eq(pharmacyWeeklyStats.year, targetYear!),
              eq(pharmacyWeeklyStats.week, targetWeek!),
            ),
          )
          .orderBy(desc(pharmacyWeeklyStats.totalPoints))
          .limit(input.limit),

        // Brands: Aggregate from Daily Challenge Stats for the week
        // This ensures the leaderboard reflects the sum of daily points (Ratings Count + Quality)
        (async () => {
          // Calculate date range for the week
          // Simple approximation: ISO week calculation
          const simpleDate = new Date(targetYear!, 0, 1 + (targetWeek! - 1) * 7);
          const dayOfWeek = simpleDate.getDay();
          const ISOweekStart = simpleDate;
          if (dayOfWeek <= 4)
            ISOweekStart.setDate(simpleDate.getDate() - simpleDate.getDay() + 1);
          else
            ISOweekStart.setDate(simpleDate.getDate() + 8 - simpleDate.getDay());

          const startDate = ISOweekStart.toISOString().split('T')[0];
          const endDate = new Date(ISOweekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

          return db
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
            .limit(input.limit * 3);
        })(),

        // Cannabis Strains
        db.select({
          id: cannabisStrains.id,
          name: cannabisStrains.name,
          imageUrl: cannabisStrains.imageUrl,
          score: cannabisStrainWeeklyStats.totalPoints,
        })
          .from(cannabisStrainWeeklyStats)
          .innerJoin(
            cannabisStrains,
            eq(cannabisStrainWeeklyStats.cannabisStrainId, cannabisStrains.id),
          )
          .where(
            and(
              eq(cannabisStrainWeeklyStats.year, targetYear!),
              eq(cannabisStrainWeeklyStats.week, targetWeek!),
            ),
          )
          .orderBy(desc(cannabisStrainWeeklyStats.totalPoints))
          .limit(input.limit),
      ]);

      // Prioritize by logo
      const topBrands = prioritizeByLogo(rawBrands, input.limit);

      // Products: derive weekly scores from strainWeeklyStats + strains
      let topProducts: { id: number; name: string; score: number }[] = [];

      try {
        const productRows = await db
          .select({
            id: strains.id,
            name: strains.name,
            favoriteCount: strainWeeklyStats.favoriteCount,
            favoriteGrowth: strainWeeklyStats.favoriteGrowth,
            pharmacyCount: strainWeeklyStats.pharmacyCount,
            pharmacyExpansion: strainWeeklyStats.pharmacyExpansion,
            avgPriceCents: strainWeeklyStats.avgPriceCents,
            priceStability: strainWeeklyStats.priceStability,
            orderVolumeGrams: strainWeeklyStats.orderVolumeGrams,
          })
          .from(strainWeeklyStats)
          .innerJoin(strains, eq(strainWeeklyStats.strainId, strains.id))
          .where(
            and(
              eq(strainWeeklyStats.year, targetYear!),
              eq(strainWeeklyStats.week, targetWeek!),
            ),
          )
          .limit(500);

        const scoredProducts = productRows
          .map((row) => {
            const { points } = calculateStrainPoints({
              favoriteCount: row.favoriteCount ?? 0,
              favoriteGrowth: row.favoriteGrowth ?? 0,
              pharmacyCount: row.pharmacyCount ?? 0,
              pharmacyExpansion: row.pharmacyExpansion ?? 0,
              avgPriceCents: row.avgPriceCents ?? 0,
              priceStability: row.priceStability ?? 0,
              orderVolumeGrams: row.orderVolumeGrams ?? 0,
            });

            return {
              id: row.id,
              name: row.name,
              score: points,
            };
          })
          .filter((p) => p.score > 0)
          .sort((a, b) => b.score - a.score);

        topProducts = scoredProducts.slice(0, input.limit);
      } catch (err) {
        console.error(
          "[Leaderboard] Error computing weekly product leaderboard – falling back to empty list:",
          err,
        );
        topProducts = [];
      }

      return {
        year: targetYear,
        week: targetWeek,
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
});

