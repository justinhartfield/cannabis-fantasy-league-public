import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { manufacturers, strains, pharmacies, cannabisStrains } from "../drizzle/schema";
import { count } from "drizzle-orm";

export const statsRouter = router({
  /**
   * Get overall platform statistics
   */
  getStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return {
        manufacturerCount: 0,
        productCount: 0,
        cannabisStrainCount: 0,
        pharmacyCount: 0,
        strainCount: 0,
      };
    }

    try {
      // Get counts from database
      const [manufacturerResult] = await db.select({ count: count() }).from(manufacturers);
      const [strainResult] = await db.select({ count: count() }).from(strains);
      const [pharmacyResult] = await db.select({ count: count() }).from(pharmacies);

      // Get cannabis strain count (genetics/cultivars)
      const [cannabisStrainResult] = await db.select({ count: count() }).from(cannabisStrains);

      return {
        manufacturerCount: manufacturerResult?.count || 0,
        productCount: strainResult?.count || 0, // Products (pharmaceutical)
        cannabisStrainCount: cannabisStrainResult?.count || 0, // Genetics/cultivars
        pharmacyCount: pharmacyResult?.count || 0,
        // Legacy field for backward compatibility
        strainCount: strainResult?.count || 0,
      };
    } catch (error) {
      console.error("[Stats] Error fetching stats:", error);
      return {
        manufacturerCount: 0,
        productCount: 0,
        cannabisStrainCount: 0,
        pharmacyCount: 0,
        strainCount: 0,
      };
    }
  }),

  /**
   * Get top manufacturers by rank
   */
  getTopManufacturers: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    try {
      const topManufacturers = await db
        .select({
          id: manufacturers.id,
          name: manufacturers.name,
          currentRank: manufacturers.currentRank,
          productCount: manufacturers.productCount,
        })
        .from(manufacturers)
        .orderBy(manufacturers.currentRank)
        .limit(5);

      return topManufacturers;
    } catch (error) {
      console.error("[Stats] Error fetching top manufacturers:", error);
      return [];
    }
  }),

  /**
   * Get top strains by favorite count
   */
  getTopStrains: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    try {
      const topStrains = await db
        .select({
          id: strains.id,
          name: strains.name,
          manufacturerName: strains.manufacturerName,
          favoriteCount: strains.favoriteCount,
          avgPriceCents: strains.avgPriceCents,
          pharmacyCount: strains.pharmacyCount,
        })
        .from(strains)
        .orderBy(strains.favoriteCount)
        .limit(5);

      return topStrains.map(strain => ({
        ...strain,
        avgPrice: strain.avgPriceCents ? (strain.avgPriceCents / 100).toFixed(2) : "0.00",
      }));
    } catch (error) {
      console.error("[Stats] Error fetching top strains:", error);
      return [];
    }
  }),

  /**
   * Get top pharmacies by revenue
   */
  getTopPharmacies: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    try {
      const topPharmacies = await db
        .select({
          id: pharmacies.id,
          name: pharmacies.name,
          city: pharmacies.city,
          weeklyRevenueCents: pharmacies.weeklyRevenueCents,
          weeklyOrderCount: pharmacies.weeklyOrderCount,
          productCount: pharmacies.productCount,
        })
        .from(pharmacies)
        .orderBy(pharmacies.weeklyRevenueCents)
        .limit(5);

      return topPharmacies.map(pharmacy => ({
        ...pharmacy,
        weeklyRevenue: pharmacy.weeklyRevenueCents 
          ? (pharmacy.weeklyRevenueCents / 100).toFixed(2) 
          : "0.00",
      }));
    } catch (error) {
      console.error("[Stats] Error fetching top pharmacies:", error);
      return [];
    }
  }),
});
