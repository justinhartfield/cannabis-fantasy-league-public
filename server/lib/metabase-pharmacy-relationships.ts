/**
 * Metabase Pharmacy Relationships Sync Service
 * 
 * Syncs pharmacy-product-manufacturer-strain relationships from order data.
 * This data is used for:
 * 1. Synergy bonus calculations in Daily Challenges
 * 2. Manufacturer stats display in the leaderboard UI
 */

import { getDb } from '../db';
import {
  pharmacyProductRelationships,
  pharmacies,
  manufacturers,
  strains,
  cannabisStrains,
} from '../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { pLimit } from '../utils/concurrency';

interface OrderRecord {
  ID: string;
  Status: string;
  OrderDate: string;
  Quantity: number;
  TotalPrice: number;
  ProductManufacturer: string;
  ProductStrainName: string;
  ProductBrand?: string;
  PharmacyName: string;
  Product: string;
  Pharmacy: string;
}

interface RelationshipStats {
  pharmacyId: number;
  manufacturerId: number | null;
  productId: number | null;
  strainId: number | null;
  orderCount: number;
  salesVolumeGrams: number;
}

type Logger = {
  info?: (message: string, metadata?: any) => Promise<void> | void;
  warn?: (message: string, metadata?: any) => Promise<void> | void;
  error?: (message: string, metadata?: any) => Promise<void> | void;
};

/**
 * Aggregate pharmacy-product relationships from order data
 */
export async function aggregatePharmacyProductRelationships(
  statDate: string,
  orders: OrderRecord[],
  logger?: Logger
): Promise<{ processed: number; skipped: number }> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const log = (level: 'info' | 'warn' | 'error', message: string, metadata?: any) => {
    const prefix = '[PharmacyRelationships]';
    if (logger?.[level]) {
      logger[level]?.(message, metadata);
    }
    if (level === 'error') {
      console.error(`${prefix} ${message}`, metadata || '');
    } else if (level === 'warn') {
      console.warn(`${prefix} ${message}`, metadata || '');
    } else {
      console.log(`${prefix} ${message}`, metadata || '');
    }
  };

  log('info', `Aggregating pharmacy-product relationships for ${statDate}...`);
  log('info', `Processing ${orders.length} orders for relationship extraction`);

  // Build lookup maps for entity IDs
  const [pharmacyList, manufacturerList, productList, strainList] = await Promise.all([
    db.select({ id: pharmacies.id, name: pharmacies.name }).from(pharmacies),
    db.select({ id: manufacturers.id, name: manufacturers.name }).from(manufacturers),
    db.select({ id: strains.id, name: strains.name }).from(strains),
    db.select({ id: cannabisStrains.id, name: cannabisStrains.name }).from(cannabisStrains),
  ]);

  log('info', `Loaded ${pharmacyList.length} pharmacies, ${manufacturerList.length} manufacturers, ${productList.length} products, ${strainList.length} strains`);

  const pharmacyMap = new Map(pharmacyList.map(p => [p.name.toLowerCase(), p.id]));
  const manufacturerMap = new Map(manufacturerList.map(m => [m.name.toLowerCase(), m.id]));
  const productMap = new Map(productList.map(p => [p.name.toLowerCase(), p.id]));
  const strainMap = new Map(strainList.map(s => [s.name.toLowerCase(), s.id]));

  // Aggregate relationships from orders
  // Key: `pharmacyId-manufacturerId-productId-strainId`
  const relationshipMap = new Map<string, RelationshipStats>();

  // Debug counters
  let noPharmacyName = 0;
  let pharmacyNotFound = 0;
  let noRelationships = 0;
  let successfulMatches = 0;
  const unmatchedPharmacies = new Set<string>();
  const unmatchedManufacturers = new Set<string>();
  const unmatchedProducts = new Set<string>();
  const unmatchedStrains = new Set<string>();

  for (const order of orders) {
    const pharmacyName = order.PharmacyName || order.Pharmacy;
    const manufacturerName = order.ProductManufacturer;
    const productName = order.Product;
    const strainName = order.ProductStrainName;

    if (!pharmacyName) {
      noPharmacyName++;
      continue;
    }

    const pharmacyId = pharmacyMap.get(pharmacyName.toLowerCase());
    if (!pharmacyId) {
      pharmacyNotFound++;
      unmatchedPharmacies.add(pharmacyName);
      continue;
    }

    const manufacturerId = manufacturerName ? manufacturerMap.get(manufacturerName.toLowerCase()) : null;
    const productId = productName ? productMap.get(productName.toLowerCase()) : null;
    const strainId = strainName ? strainMap.get(strainName.toLowerCase()) : null;

    // Track unmatched entities for debugging
    if (manufacturerName && !manufacturerId) {
      unmatchedManufacturers.add(manufacturerName);
    }
    if (productName && !productId) {
      unmatchedProducts.add(productName);
    }
    if (strainName && !strainId) {
      unmatchedStrains.add(strainName);
    }

    // Skip if we don't have at least one relationship
    if (!manufacturerId && !productId && !strainId) {
      noRelationships++;
      continue;
    }

    successfulMatches++;

    const key = `${pharmacyId}-${manufacturerId || 'null'}-${productId || 'null'}-${strainId || 'null'}`;
    
    const existing = relationshipMap.get(key) || {
      pharmacyId,
      manufacturerId: manufacturerId || null,
      productId: productId || null,
      strainId: strainId || null,
      orderCount: 0,
      salesVolumeGrams: 0,
    };

    existing.orderCount += 1;
    existing.salesVolumeGrams += order.Quantity || 0;
    relationshipMap.set(key, existing);
  }

  // Log debug stats
  log('info', `Order processing stats: ${successfulMatches} matched, ${noPharmacyName} no pharmacy name, ${pharmacyNotFound} pharmacy not found, ${noRelationships} no relationships`);
  
  if (unmatchedPharmacies.size > 0) {
    log('warn', `Unmatched pharmacies (${unmatchedPharmacies.size}): ${Array.from(unmatchedPharmacies).slice(0, 3).join(', ')}`);
  }
  if (unmatchedManufacturers.size > 0) {
    log('warn', `Unmatched manufacturers (${unmatchedManufacturers.size}): ${Array.from(unmatchedManufacturers).slice(0, 3).join(', ')}`);
  }
  if (unmatchedProducts.size > 0) {
    log('warn', `Unmatched products (${unmatchedProducts.size}): ${Array.from(unmatchedProducts).slice(0, 3).join(', ')}`);
  }
  if (unmatchedStrains.size > 0) {
    log('warn', `Unmatched strains (${unmatchedStrains.size}): ${Array.from(unmatchedStrains).slice(0, 3).join(', ')}`);
  }

  log('info', `Found ${relationshipMap.size} unique relationships`);

  const relationships = Array.from(relationshipMap.values());
  
  if (relationships.length === 0) {
    log('info', 'No relationships to insert');
    return { processed: 0, skipped: 0 };
  }

  // Strategy: Delete existing records for this date, then batch insert
  // This avoids the NULL comparison issue with ON CONFLICT
  try {
    // Delete existing relationships for this date
    const deleted = await db
      .delete(pharmacyProductRelationships)
      .where(eq(pharmacyProductRelationships.statDate, statDate));
    
    log('info', `Cleared existing relationships for ${statDate}`);

    // Insert relationships one by one to avoid batch issues and get better error info
    let processed = 0;
    let skipped = 0;
    
    for (const rel of relationships) {
      try {
        await db.insert(pharmacyProductRelationships).values({
          pharmacyId: rel.pharmacyId,
          manufacturerId: rel.manufacturerId,
          productId: rel.productId,
          strainId: rel.strainId,
          statDate,
          orderCount: rel.orderCount,
          salesVolumeGrams: rel.salesVolumeGrams,
          // createdAt uses defaultNow() in schema
        });
        processed++;
      } catch (insertError: any) {
        // Log first few errors with details
        if (skipped < 3) {
          const errMsg = insertError?.cause?.message || insertError?.message || String(insertError);
          log('error', `Insert failed for pharmacy ${rel.pharmacyId}, mfg ${rel.manufacturerId}, prod ${rel.productId}, strain ${rel.strainId}: ${errMsg}`);
        }
        skipped++;
      }
    }

    log('info', `Inserted ${processed} relationships, failed ${skipped} for ${statDate}`);
    return { processed, skipped };
  } catch (error: any) {
    // Extract the underlying error message
    const errorMessage = error?.cause?.message || error?.message || String(error);
    log('error', `Error during relationship sync: ${errorMessage}`);
    return { processed: 0, skipped: relationships.length };
  }
}

/**
 * Get manufacturer stats for a specific pharmacy
 * Returns top manufacturers selling at this pharmacy with order counts
 */
export async function getPharmacyManufacturerStats(
  pharmacyId: number,
  statDate?: string,
  limit: number = 10
): Promise<Array<{
  manufacturerId: number;
  manufacturerName: string;
  logoUrl: string | null;
  orderCount: number;
  salesVolumeGrams: number;
}>> {
  const db = await getDb();
  if (!db) return [];

  // If no date specified, find the latest date with data for this pharmacy
  let targetDate = statDate;
  if (!targetDate) {
    const latestDate = await db
      .select({ maxDate: sql<string>`max(${pharmacyProductRelationships.statDate})` })
      .from(pharmacyProductRelationships)
      .where(eq(pharmacyProductRelationships.pharmacyId, pharmacyId));
    targetDate = latestDate[0]?.maxDate || new Date().toISOString().split('T')[0];
  }

  const results = await db
    .select({
      manufacturerId: pharmacyProductRelationships.manufacturerId,
      manufacturerName: manufacturers.name,
      logoUrl: manufacturers.logoUrl,
      orderCount: sql<number>`sum(${pharmacyProductRelationships.orderCount})`.mapWith(Number),
      salesVolumeGrams: sql<number>`sum(${pharmacyProductRelationships.salesVolumeGrams})`.mapWith(Number),
    })
    .from(pharmacyProductRelationships)
    .innerJoin(manufacturers, eq(pharmacyProductRelationships.manufacturerId, manufacturers.id))
    .where(
      and(
        eq(pharmacyProductRelationships.pharmacyId, pharmacyId),
        eq(pharmacyProductRelationships.statDate, targetDate)
      )
    )
    .groupBy(
      pharmacyProductRelationships.manufacturerId,
      manufacturers.name,
      manufacturers.logoUrl
    )
    .orderBy(sql`sum(${pharmacyProductRelationships.orderCount}) DESC`)
    .limit(limit);

  return results.filter(r => r.manufacturerId !== null) as any;
}

/**
 * Get manufacturer stats for a specific strain
 * Returns manufacturers that sell products with this strain
 */
export async function getStrainManufacturerStats(
  strainId: number,
  statDate?: string,
  limit: number = 10
): Promise<Array<{
  manufacturerId: number;
  manufacturerName: string;
  logoUrl: string | null;
  orderCount: number;
  salesVolumeGrams: number;
}>> {
  const db = await getDb();
  if (!db) return [];

  // If no date specified, find the latest date with data for this strain
  let targetDate = statDate;
  if (!targetDate) {
    const latestDate = await db
      .select({ maxDate: sql<string>`max(${pharmacyProductRelationships.statDate})` })
      .from(pharmacyProductRelationships)
      .where(eq(pharmacyProductRelationships.strainId, strainId));
    targetDate = latestDate[0]?.maxDate || new Date().toISOString().split('T')[0];
  }

  const results = await db
    .select({
      manufacturerId: pharmacyProductRelationships.manufacturerId,
      manufacturerName: manufacturers.name,
      logoUrl: manufacturers.logoUrl,
      orderCount: sql<number>`sum(${pharmacyProductRelationships.orderCount})`.mapWith(Number),
      salesVolumeGrams: sql<number>`sum(${pharmacyProductRelationships.salesVolumeGrams})`.mapWith(Number),
    })
    .from(pharmacyProductRelationships)
    .innerJoin(manufacturers, eq(pharmacyProductRelationships.manufacturerId, manufacturers.id))
    .where(
      and(
        eq(pharmacyProductRelationships.strainId, strainId),
        eq(pharmacyProductRelationships.statDate, targetDate)
      )
    )
    .groupBy(
      pharmacyProductRelationships.manufacturerId,
      manufacturers.name,
      manufacturers.logoUrl
    )
    .orderBy(sql`sum(${pharmacyProductRelationships.orderCount}) DESC`)
    .limit(limit);

  return results.filter(r => r.manufacturerId !== null) as any;
}

/**
 * Check if a pharmacy sells products from a specific manufacturer with a specific strain
 * Used for synergy bonus calculation
 */
export async function checkPharmacySynergyRelationship(
  pharmacyId: number,
  manufacturerId?: number | null,
  productId?: number | null,
  strainId?: number | null,
  statDate?: string
): Promise<{
  hasPharmacyStrain: boolean;
  hasPharmacyProduct: boolean;
  hasPharmacyManufacturer: boolean;
  hasFullSynergy: boolean;
}> {
  const db = await getDb();
  if (!db) {
    console.log(`[SynergyCheck] No DB connection`);
    return {
      hasPharmacyStrain: false,
      hasPharmacyProduct: false,
      hasPharmacyManufacturer: false,
      hasFullSynergy: false,
    };
  }

  // If no date specified, find the latest date with data for this pharmacy
  let targetDate = statDate;
  if (!targetDate) {
    const latestDate = await db
      .select({ maxDate: sql<string>`max(${pharmacyProductRelationships.statDate})` })
      .from(pharmacyProductRelationships)
      .where(eq(pharmacyProductRelationships.pharmacyId, pharmacyId));
    targetDate = latestDate[0]?.maxDate || new Date().toISOString().split('T')[0];
  }

  console.log(`[SynergyCheck] Checking pharmacy=${pharmacyId}, strain=${strainId}, product=${productId}, date=${targetDate}`);

  // Check pharmacy-strain relationship
  let hasPharmacyStrain = false;
  if (strainId) {
    const strainRel = await db
      .select({ id: pharmacyProductRelationships.id })
      .from(pharmacyProductRelationships)
      .where(
        and(
          eq(pharmacyProductRelationships.pharmacyId, pharmacyId),
          eq(pharmacyProductRelationships.strainId, strainId),
          eq(pharmacyProductRelationships.statDate, targetDate)
        )
      )
      .limit(1);
    hasPharmacyStrain = strainRel.length > 0;
  }

  // Check pharmacy-product relationship
  let hasPharmacyProduct = false;
  if (productId) {
    const productRel = await db
      .select({ id: pharmacyProductRelationships.id })
      .from(pharmacyProductRelationships)
      .where(
        and(
          eq(pharmacyProductRelationships.pharmacyId, pharmacyId),
          eq(pharmacyProductRelationships.productId, productId),
          eq(pharmacyProductRelationships.statDate, targetDate)
        )
      )
      .limit(1);
    hasPharmacyProduct = productRel.length > 0;
  }

  // Check pharmacy-manufacturer relationship
  let hasPharmacyManufacturer = false;
  if (manufacturerId) {
    const mfgRel = await db
      .select({ id: pharmacyProductRelationships.id })
      .from(pharmacyProductRelationships)
      .where(
        and(
          eq(pharmacyProductRelationships.pharmacyId, pharmacyId),
          eq(pharmacyProductRelationships.manufacturerId, manufacturerId),
          eq(pharmacyProductRelationships.statDate, targetDate)
        )
      )
      .limit(1);
    hasPharmacyManufacturer = mfgRel.length > 0;
  }

  // Full synergy requires pharmacy + strain + product (or manufacturer)
  const hasFullSynergy = hasPharmacyStrain && (hasPharmacyProduct || hasPharmacyManufacturer);

  const result = {
    hasPharmacyStrain,
    hasPharmacyProduct,
    hasPharmacyManufacturer,
    hasFullSynergy,
  };

  console.log(`[SynergyCheck] Result: strain=${hasPharmacyStrain}, product=${hasPharmacyProduct}, mfg=${hasPharmacyManufacturer}, full=${hasFullSynergy}`);

  return result;
}

/**
 * Get pharmacy count and manufacturer count for leaderboard badges
 */
export async function getEntityRelationshipSummary(
  entityType: 'pharmacy' | 'strain' | 'manufacturer',
  entityId: number,
  statDate?: string
): Promise<{
  manufacturerCount?: number;
  pharmacyCount?: number;
  strainCount?: number;
}> {
  const db = await getDb();
  if (!db) return {};

  // If no date specified, find the latest date with ANY data
  let targetDate = statDate;
  if (!targetDate) {
    const latestDate = await db
      .select({ maxDate: sql<string>`max(${pharmacyProductRelationships.statDate})` })
      .from(pharmacyProductRelationships);
    targetDate = latestDate[0]?.maxDate || new Date().toISOString().split('T')[0];
  }

  if (entityType === 'pharmacy') {
    // Count manufacturers selling at this pharmacy
    const result = await db
      .select({
        manufacturerCount: sql<number>`count(distinct ${pharmacyProductRelationships.manufacturerId})`.mapWith(Number),
      })
      .from(pharmacyProductRelationships)
      .where(
        and(
          eq(pharmacyProductRelationships.pharmacyId, entityId),
          eq(pharmacyProductRelationships.statDate, targetDate)
        )
      );
    return { manufacturerCount: result[0]?.manufacturerCount || 0 };
  }

  if (entityType === 'strain') {
    // Count manufacturers and pharmacies selling this strain
    const result = await db
      .select({
        manufacturerCount: sql<number>`count(distinct ${pharmacyProductRelationships.manufacturerId})`.mapWith(Number),
        pharmacyCount: sql<number>`count(distinct ${pharmacyProductRelationships.pharmacyId})`.mapWith(Number),
      })
      .from(pharmacyProductRelationships)
      .where(
        and(
          eq(pharmacyProductRelationships.strainId, entityId),
          eq(pharmacyProductRelationships.statDate, targetDate)
        )
      );
    return {
      manufacturerCount: result[0]?.manufacturerCount || 0,
      pharmacyCount: result[0]?.pharmacyCount || 0,
    };
  }

  if (entityType === 'manufacturer') {
    // Count pharmacies and strains for this manufacturer
    const result = await db
      .select({
        pharmacyCount: sql<number>`count(distinct ${pharmacyProductRelationships.pharmacyId})`.mapWith(Number),
        strainCount: sql<number>`count(distinct ${pharmacyProductRelationships.strainId})`.mapWith(Number),
      })
      .from(pharmacyProductRelationships)
      .where(
        and(
          eq(pharmacyProductRelationships.manufacturerId, entityId),
          eq(pharmacyProductRelationships.statDate, targetDate)
        )
      );
    return {
      pharmacyCount: result[0]?.pharmacyCount || 0,
      strainCount: result[0]?.strainCount || 0,
    };
  }

  return {};
}

