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
import { desc, eq, and, sql } from "drizzle-orm";

function prioritizeByLogo<T extends { logoUrl?: string | null }>(
  rows: T[],
  limit: number,
): T[] {
  if (!rows || rows.length === 0) return [];

  const withLogo = rows.filter(
    (r) => typeof r.logoUrl === "string" && r.logoUrl.trim().length > 0,
  );
  const withoutLogo = rows.filter(
    (r) => !r.logoUrl || r.logoUrl.trim().length === 0,
  );

  return [...withLogo, ...withoutLogo].slice(0, limit);
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
        const latestStat = await db
          .select({ date: manufacturerDailyChallengeStats.statDate })
          .from(manufacturerDailyChallengeStats)
          .orderBy(desc(manufacturerDailyChallengeStats.statDate))
          .limit(1);

        if (latestStat.length > 0) {
          targetDate = latestStat[0].date;
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

        // Brands
        db
          .select({
            id: brands.id,
            name: brands.name,
            logoUrl: brands.logoUrl,
            score: brandWeeklyStats.totalPoints,
          })
          .from(brandWeeklyStats)
          .innerJoin(brands, eq(brandWeeklyStats.brandId, brands.id))
          .where(
            and(
              eq(brandWeeklyStats.year, targetYear!),
              eq(brandWeeklyStats.week, targetWeek!),
            ),
          )
          .orderBy(desc(brandWeeklyStats.totalPoints))
          .limit(input.limit * 3),

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

      const topBrands = prioritizeByLogo(rawBrands, input.limit);

      // Products (best-effort: uses strainWeeklyStats; if something is off, just skip)
      let topProducts:
        | {
            id: number;
            name: string;
            imageUrl: string | null;
            score: number | null;
          }[]
        | [] = [];

      try {
        topProducts = await db
          .select({
            id: products.id,
            name: products.name,
            imageUrl: products.imageUrl,
            score: strainWeeklyStats.totalPoints,
          })
          .from(strainWeeklyStats)
          .innerJoin(products, eq(strainWeeklyStats.strainId, products.id))
          .where(
            and(
              eq(strainWeeklyStats.year, targetYear!),
              eq(strainWeeklyStats.week, targetWeek!),
            ),
          )
          .orderBy(desc(strainWeeklyStats.totalPoints))
          .limit(input.limit);
      } catch (err) {
        console.error(
          "[Leaderboard] Error fetching weekly product leaderboard – falling back to empty list:",
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
        .orderBy(desc(weeklyTeamScores.totalPoints))
        .limit(input.limit);

      return {
        seasonLeaders,
        weeklyHighScores,
      };
    }),
});

