import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { 
  manufacturers, 
  pharmacies, 
  brands, 
  products, 
  cannabisStrains,
  manufacturerDailyStats,
  pharmacyDailyStats,
  brandDailyStats,
  productDailyStats,
  cannabisStrainDailyStats,
  manufacturerWeeklyStats,
  pharmacyWeeklyStats,
  brandWeeklyStats,
  strainWeeklyStats,
  cannabisStrainWeeklyStats,
  teams,
  users,
  weeklyTeamScores,
  leagues
} from "../drizzle/schema";
import { desc, eq, and, sql } from "drizzle-orm";

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
      if (!db) return { manufacturers: [], pharmacies: [], brands: [], products: [], strains: [] };

      // If no date provided, find the latest date with data from manufacturers
      let targetDate = input.date;
      if (!targetDate) {
        const latestStat = await db
          .select({ date: manufacturerDailyStats.statDate })
          .from(manufacturerDailyStats)
          .orderBy(desc(manufacturerDailyStats.statDate))
          .limit(1);
        
        if (latestStat.length > 0) {
          targetDate = latestStat[0].date;
        } else {
          // Fallback to today if no data found (will return empty results)
          targetDate = new Date().toISOString().split('T')[0];
        }
      }

      // Fetch top performers for each category
      const [
        topManufacturers,
        topPharmacies,
        topBrands,
        topProducts,
        topStrains
      ] = await Promise.all([
        // Manufacturers
        db.select({
          id: manufacturers.id,
          name: manufacturers.name,
          logoUrl: manufacturers.logoUrl,
          score: manufacturerDailyStats.totalPoints,
          rank: manufacturerDailyStats.marketShareRank,
          rankChange: manufacturerDailyStats.rankChange,
        })
        .from(manufacturerDailyStats)
        .innerJoin(manufacturers, eq(manufacturerDailyStats.manufacturerId, manufacturers.id))
        .where(eq(manufacturerDailyStats.statDate, targetDate!))
        .orderBy(desc(manufacturerDailyStats.totalPoints))
        .limit(input.limit),

        // Pharmacies
        db.select({
          id: pharmacies.id,
          name: pharmacies.name,
          logoUrl: pharmacies.logoUrl,
          score: pharmacyDailyStats.totalPoints,
          rankChange: sql<number>`0`, // Not currently tracked in daily stats same way
        })
        .from(pharmacyDailyStats)
        .innerJoin(pharmacies, eq(pharmacyDailyStats.pharmacyId, pharmacies.id))
        .where(eq(pharmacyDailyStats.statDate, targetDate!))
        .orderBy(desc(pharmacyDailyStats.totalPoints))
        .limit(input.limit),

        // Brands
        db.select({
          id: brands.id,
          name: brands.name,
          logoUrl: brands.logoUrl,
          score: brandDailyStats.totalPoints,
        })
        .from(brandDailyStats)
        .innerJoin(brands, eq(brandDailyStats.brandId, brands.id))
        .where(eq(brandDailyStats.statDate, targetDate!))
        .orderBy(desc(brandDailyStats.totalPoints))
        .limit(input.limit),

        // Products
        db.select({
          id: products.id,
          name: products.name,
          imageUrl: products.imageUrl,
          score: productDailyStats.totalPoints,
        })
        .from(productDailyStats)
        .innerJoin(products, eq(productDailyStats.productId, products.id))
        .where(eq(productDailyStats.statDate, targetDate!))
        .orderBy(desc(productDailyStats.totalPoints))
        .limit(input.limit),

        // Cannabis Strains (Flower/Genetics)
        db.select({
          id: cannabisStrains.id,
          name: cannabisStrains.name,
          imageUrl: cannabisStrains.imageUrl,
          score: cannabisStrainDailyStats.totalPoints,
        })
        .from(cannabisStrainDailyStats)
        .innerJoin(cannabisStrains, eq(cannabisStrainDailyStats.cannabisStrainId, cannabisStrains.id))
        .where(eq(cannabisStrainDailyStats.statDate, targetDate!))
        .orderBy(desc(cannabisStrainDailyStats.totalPoints))
        .limit(input.limit),
      ]);

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
        topBrands,
        topProducts, // Using strainWeeklyStats for products primarily currently based on schema usage
        topStrains
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
        .innerJoin(manufacturers, eq(manufacturerWeeklyStats.manufacturerId, manufacturers.id))
        .where(and(
          eq(manufacturerWeeklyStats.year, targetYear!),
          eq(manufacturerWeeklyStats.week, targetWeek!)
        ))
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
        .where(and(
          eq(pharmacyWeeklyStats.year, targetYear!),
          eq(pharmacyWeeklyStats.week, targetWeek!)
        ))
        .orderBy(desc(pharmacyWeeklyStats.totalPoints))
        .limit(input.limit),

        // Brands
        db.select({
          id: brands.id,
          name: brands.name,
          logoUrl: brands.logoUrl,
          score: brandWeeklyStats.totalPoints,
        })
        .from(brandWeeklyStats)
        .innerJoin(brands, eq(brandWeeklyStats.brandId, brands.id))
        .where(and(
          eq(brandWeeklyStats.year, targetYear!),
          eq(brandWeeklyStats.week, targetWeek!)
        ))
        .orderBy(desc(brandWeeklyStats.totalPoints))
        .limit(input.limit),

        // Products (Note: Product stats are often in strainWeeklyStats in this schema, but let's check plan. 
        // Plan says "productDailyStats" join "products". Weekly table for products is "strainWeeklyStats" 
        // based on `scoreProduct` implementation in scoringEngine.ts which maps products to strainWeeklyStats for weekly)
        db.select({
          id: products.id, // This might be tricky if strainWeeklyStats links to strains table. 
          // Let's look at scoringEngine.ts:1435 -> eq(strainWeeklyStats.strainId, productId)
          // It seems strainWeeklyStats is overloaded for products? Or products table?
          // Actually, schema.ts says strainWeeklyStats has strainId. 
          // In scoringEngine.ts `scoreProduct` for weekly uses `strainWeeklyStats` joined on `strainId`.
          // This implies products might share IDs or table structure with strains for scoring?
          // However, let's look at cannabisStrainWeeklyStats. 
          // Let's assume products map to strainWeeklyStats for now based on scoringEngine.ts
          name: products.name, // We need to join the correct table. 
          // If strainWeeklyStats uses strainId which is productId...
          // Let's check schema.ts. products table exists. strains table exists.
          // scoreProduct in scoringEngine.ts uses strainWeeklyStats.
          // We will trust scoringEngine.ts logic: Product Score -> strainWeeklyStats.
          imageUrl: products.imageUrl,
          score: strainWeeklyStats.totalPoints,
        })
        .from(strainWeeklyStats)
        .innerJoin(products, eq(strainWeeklyStats.strainId, products.id)) 
        .where(and(
          eq(strainWeeklyStats.year, targetYear!),
          eq(strainWeeklyStats.week, targetWeek!)
        ))
        .orderBy(desc(strainWeeklyStats.totalPoints))
        .limit(input.limit),

        // Cannabis Strains
        db.select({
          id: cannabisStrains.id,
          name: cannabisStrains.name,
          imageUrl: cannabisStrains.imageUrl,
          score: cannabisStrainWeeklyStats.totalPoints,
        })
        .from(cannabisStrainWeeklyStats)
        .innerJoin(cannabisStrains, eq(cannabisStrainWeeklyStats.cannabisStrainId, cannabisStrains.id))
        .where(and(
          eq(cannabisStrainWeeklyStats.year, targetYear!),
          eq(cannabisStrainWeeklyStats.week, targetWeek!)
        ))
        .orderBy(desc(cannabisStrainWeeklyStats.totalPoints))
        .limit(input.limit),
      ]);

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

