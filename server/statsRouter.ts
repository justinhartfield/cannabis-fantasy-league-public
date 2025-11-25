import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
  manufacturers,
  strains,
  pharmacies,
  cannabisStrains,
  brands,
  manufacturerDailyStats,
  // Note: Using dailyChallengeStats tables for history as they have the trend data
} from "../drizzle/schema";
import {
  productDailyChallengeStats,
  strainDailyChallengeStats,
  pharmacyDailyChallengeStats,
  brandDailyChallengeStats,
} from "../drizzle/dailyChallengeSchema";
import { count, eq, desc } from "drizzle-orm";
import { z } from "zod";

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
        brandCount: 0,
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

      // Get brand count
      const [brandResult] = await db.select({ count: count() }).from(brands);

      return {
        manufacturerCount: manufacturerResult?.count || 0,
        productCount: strainResult?.count || 0, // Products (pharmaceutical)
        cannabisStrainCount: cannabisStrainResult?.count || 0, // Genetics/cultivars
        pharmacyCount: pharmacyResult?.count || 0,
        brandCount: brandResult?.count || 0, // Marketing brands
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
        brandCount: 0,
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


  /**
   * Get manufacturer history
   */
  getManufacturerHistory: publicProcedure
    .input(z.object({
      manufacturerId: z.number(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const history = await db
          .select()
          .from(manufacturerDailyStats)
          .where(eq(manufacturerDailyStats.manufacturerId, input.manufacturerId))
          .orderBy(desc(manufacturerDailyStats.statDate))
          .limit(input.days);

        return history.reverse(); // Return chronological order
      } catch (error) {
        console.error("[Stats] Error fetching manufacturer history:", error);
        return [];
      }
    }),

  /**
   * Get product history
   */
  getProductHistory: publicProcedure
    .input(z.object({
      productId: z.number(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const history = await db
          .select()
          .from(productDailyChallengeStats)
          .where(eq(productDailyChallengeStats.productId, input.productId))
          .orderBy(desc(productDailyChallengeStats.statDate))
          .limit(input.days);

        return history.reverse();
      } catch (error) {
        console.error("[Stats] Error fetching product history:", error);
        return [];
      }
    }),

  /**
   * Get strain history
   */
  getStrainHistory: publicProcedure
    .input(z.object({
      strainId: z.number(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const history = await db
          .select()
          .from(strainDailyChallengeStats)
          .where(eq(strainDailyChallengeStats.strainId, input.strainId))
          .orderBy(desc(strainDailyChallengeStats.statDate))
          .limit(input.days);

        return history.reverse();
      } catch (error) {
        console.error("[Stats] Error fetching strain history:", error);
        return [];
      }
    }),

  /**
   * Get pharmacy history
   */
  getPharmacyHistory: publicProcedure
    .input(z.object({
      pharmacyId: z.number(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const history = await db
          .select()
          .from(pharmacyDailyChallengeStats)
          .where(eq(pharmacyDailyChallengeStats.pharmacyId, input.pharmacyId))
          .orderBy(desc(pharmacyDailyChallengeStats.statDate))
          .limit(input.days);

        return history.reverse();
      } catch (error) {
        console.error("[Stats] Error fetching pharmacy history:", error);
        return [];
      }
    }),

  /**
   * Get brand history
   */
  getBrandHistory: publicProcedure
    .input(z.object({
      brandId: z.number(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const history = await db
          .select()
          .from(brandDailyChallengeStats)
          .where(eq(brandDailyChallengeStats.brandId, input.brandId))
          .orderBy(desc(brandDailyChallengeStats.statDate))
          .limit(input.days);

        return history.reverse();
      } catch (error) {
        console.error("[Stats] Error fetching brand history:", error);
        return [];
      }
    }),

  /**
   * Get all entities for market selection
   */
  getAllEntities: publicProcedure
    .input(z.object({
      type: z.enum(['manufacturer', 'product', 'strain', 'pharmacy', 'brand']),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        switch (input.type) {
          case 'manufacturer':
            return await db.select({ id: manufacturers.id, name: manufacturers.name }).from(manufacturers).orderBy(manufacturers.name);
          case 'product':
            // Products are in strains table with type? Or specific products table?
            // Based on schema, products table exists but aggregation uses strains table for "products" in some contexts?
            // Let's use the 'strains' table which seems to be used for products in aggregateProductsV2
            return await db.select({ id: strains.id, name: strains.name }).from(strains).orderBy(strains.name);
          case 'strain':
            return await db.select({ id: cannabisStrains.id, name: cannabisStrains.name }).from(cannabisStrains).orderBy(cannabisStrains.name);
          case 'pharmacy':
            return await db.select({ id: pharmacies.id, name: pharmacies.name }).from(pharmacies).orderBy(pharmacies.name);
          case 'brand':
            return await db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(brands.name);
          default:
            return [];
        }
      } catch (error) {
        console.error("[Stats] Error fetching entities:", error);
        return [];
      }
    }),
});
