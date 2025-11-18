/**
 * TrendMetrics Data Fetcher
 * 
 * Fetches trend data from the Metabase TrendMetrics collection
 * and provides utilities for calculating advanced scoring metrics.
 */

import { getMetabaseClient } from './metabase';
import { getDb } from './db';
import { sql } from 'drizzle-orm';

export interface TrendMetricsData {
  entityId: string;
  entityName: string;
  entity: string;
  days1: number;
  days7: number;
  days14: number;
  days30: number;
  days60: number;
  days90: number;
  days1Rank: number;
  days7Rank: number;
  days14Rank: number;
  days30Rank: number;
  days60Rank: number;
  days90Rank: number;
}

export interface DailyVolumeHistory {
  entityId: string;
  dailyVolumes: number[]; // Last 7 days
}

/**
 * Fetch TrendMetrics data for a specific entity
 */
export async function fetchTrendMetrics(
  entityType: 'productManufacturer' | 'pharmacyName' | 'productStrainName' | 'productName',
  entityName: string
): Promise<TrendMetricsData | null> {
  const metabase = getMetabaseClient();
  
  try {
    const query = `db.TrendMetrics.find({ "entity": "${entityType}", "entityName": "${entityName}" }).limit(1)`;
    const result = await metabase.executeQuery(query);
    
    if (!result || !result.data || result.data.length === 0) {
      return null;
    }
    
    const record = result.data[0];
    return {
      entityId: record.entityId || record.EntityId,
      entityName: record.entityName || record.EntityName,
      entity: record.entity || record.Entity,
      days1: Number(record.days1 || record.Days1 || 0),
      days7: Number(record.days7 || record.Days7 || 0),
      days14: Number(record.days14 || record.Days14 || 0),
      days30: Number(record.days30 || record.Days30 || 0),
      days60: Number(record.days60 || record.Days60 || 0),
      days90: Number(record.days90 || record.Days90 || 0),
      days1Rank: Number(record.days1Rank || record.Days1Rank || 0),
      days7Rank: Number(record.days7Rank || record.Days7Rank || 0),
      days14Rank: Number(record.days14Rank || record.Days14Rank || 0),
      days30Rank: Number(record.days30Rank || record.Days30Rank || 0),
      days60Rank: Number(record.days60Rank || record.Days60Rank || 0),
      days90Rank: Number(record.days90Rank || record.Days90Rank || 0),
    };
  } catch (error) {
    console.error(`[TrendMetricsFetcher] Error fetching trend metrics for ${entityName}:`, error);
    return null;
  }
}

/**
 * Fetch TrendMetrics data for multiple entities in batch
 */
export async function fetchTrendMetricsBatch(
  entityType: 'productManufacturer' | 'pharmacyName' | 'productStrainName' | 'productName',
  entityNames: string[]
): Promise<Map<string, TrendMetricsData>> {
  const metabase = getMetabaseClient();
  const results = new Map<string, TrendMetricsData>();
  
  try {
    const query = `db.TrendMetrics.find({ "entity": "${entityType}" })`;
    const result = await metabase.executeQuery(query);
    
    if (!result || !result.data) {
      return results;
    }
    
    for (const record of result.data) {
      const name = record.entityName || record.EntityName;
      if (entityNames.includes(name)) {
        results.set(name, {
          entityId: record.entityId || record.EntityId,
          entityName: name,
          entity: record.entity || record.Entity,
          days1: Number(record.days1 || record.Days1 || 0),
          days7: Number(record.days7 || record.Days7 || 0),
          days14: Number(record.days14 || record.Days14 || 0),
          days30: Number(record.days30 || record.Days30 || 0),
          days60: Number(record.days60 || record.Days60 || 0),
          days90: Number(record.days90 || record.Days90 || 0),
          days1Rank: Number(record.days1Rank || record.Days1Rank || 0),
          days7Rank: Number(record.days7Rank || record.Days7Rank || 0),
          days14Rank: Number(record.days14Rank || record.Days14Rank || 0),
          days30Rank: Number(record.days30Rank || record.Days30Rank || 0),
          days60Rank: Number(record.days60Rank || record.Days60Rank || 0),
          days90Rank: Number(record.days90Rank || record.Days90Rank || 0),
        });
      }
    }
  } catch (error) {
    console.error(`[TrendMetricsFetcher] Error fetching batch trend metrics:`, error);
  }
  
  return results;
}

/**
 * Calculate daily volumes from TrendMetrics data
 * Estimates individual daily volumes from cumulative data
 */
export function calculateDailyVolumes(trendData: TrendMetricsData): number[] {
  // We have cumulative data, so we need to calculate daily deltas
  const dailyVolumes: number[] = [];
  
  // Day 1 is the actual daily volume
  dailyVolumes.push(trendData.days1);
  
  // Days 2-7 are estimated by subtracting previous cumulative from current
  // This is an approximation since we don't have exact daily data
  const day2to7 = (trendData.days7 - trendData.days1) / 6;
  for (let i = 0; i < 6; i++) {
    dailyVolumes.push(day2to7);
  }
  
  return dailyVolumes;
}

/**
 * Calculate market share percentage for an entity
 */
export async function calculateMarketShare(
  entityType: 'productManufacturer' | 'pharmacyName' | 'productStrainName' | 'productName',
  entityName: string
): Promise<number> {
  const metabase = getMetabaseClient();
  
  try {
    // Fetch total market volume
    const totalQuery = `db.TrendMetrics.aggregate([
      { $match: { "entity": "${entityType}" } },
      { $group: { _id: null, total: { $sum: "$days7" } } }
    ])`;
    const totalResult = await metabase.executeQuery(totalQuery);
    
    if (!totalResult || !totalResult.data || totalResult.data.length === 0) {
      return 0;
    }
    
    const totalVolume = Number(totalResult.data[0].total || 0);
    if (totalVolume === 0) return 0;
    
    // Fetch entity volume
    const entityData = await fetchTrendMetrics(entityType, entityName);
    if (!entityData) return 0;
    
    // Calculate percentage
    const marketShare = (entityData.days7 / totalVolume) * 100;
    return Math.round(marketShare * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error(`[TrendMetricsFetcher] Error calculating market share for ${entityName}:`, error);
    return 0;
  }
}

/**
 * Get previous rank for an entity from historical data
 * This would typically query a historical stats table
 */
export async function getPreviousRank(
  entityType: 'manufacturer' | 'strain' | 'product' | 'pharmacy',
  entityId: number,
  currentDate: string
): Promise<number> {
  const db = await import('./db').then(m => m.getDb());
  
  try {
    // Calculate previous date (1 day before)
    const date = new Date(currentDate);
    date.setDate(date.getDate() - 1);
    const previousDate = date.toISOString().split('T')[0];
    
    // Query the appropriate stats table
    const tableMap = {
      manufacturer: 'manufacturerDailyChallengeStats',
      strain: 'strainDailyChallengeStats',
      product: 'productDailyChallengeStats',
      pharmacy: 'pharmacyDailyChallengeStats',
    };
    
    const tableName = tableMap[entityType];
    const idField = `${entityType}Id`;
    
    // Use Drizzle's sql tagged template for parameterized queries
    const result = await db.execute(sql`
      SELECT rank FROM ${sql.identifier(tableName)}
      WHERE ${sql.identifier(idField)} = ${entityId} AND "statDate" = ${previousDate}
      LIMIT 1
    `);
    
    if (result && result.rows && result.rows.length > 0) {
      return Number(result.rows[0].rank || 0);
    }
    
    return 0;
  } catch (error) {
    console.error(`[TrendMetricsFetcher] Error fetching previous rank:`, error);
    return 0;
  }
}

/**
 * Calculate streak days for an entity
 * Counts consecutive days in top 10
 */
export async function calculateStreakDays(
  entityType: 'manufacturer' | 'strain' | 'product' | 'pharmacy',
  entityId: number,
  currentDate: string,
  currentRank: number
): Promise<number> {
  if (currentRank > 10) return 0; // Not in top 10, streak is 0
  
  const db = await import('./db').then(m => m.getDb());
  
  try {
    const tableMap = {
      manufacturer: 'manufacturerDailyChallengeStats',
      strain: 'strainDailyChallengeStats',
      product: 'productDailyChallengeStats',
      pharmacy: 'pharmacyDailyChallengeStats',
    };
    
    const tableName = tableMap[entityType];
    const idField = `${entityType}Id`;
    
    // Query last 30 days of ranks using sql tagged template
    const result = await db.execute(sql`
      SELECT "statDate", rank FROM ${sql.identifier(tableName)}
      WHERE ${sql.identifier(idField)} = ${entityId} AND "statDate" < ${currentDate}
      ORDER BY "statDate" DESC
      LIMIT 30
    `);
    
    if (!result || !result.rows) return 1; // First day in top 10
    
    // Count consecutive days in top 10 (working backwards from current date)
    let streakDays = 1; // Current day counts
    for (const row of result.rows) {
      const rank = Number(row.rank || 0);
      if (rank > 0 && rank <= 10) {
        streakDays++;
      } else {
        break; // Streak broken
      }
    }
    
    return streakDays;
  } catch (error) {
    console.error(`[TrendMetricsFetcher] Error calculating streak days:`, error);
    return 1;
  }
}

/**
 * Fetch all trend data needed for scoring in one batch
 */
export async function fetchTrendDataForScoring(
  entityType: 'productManufacturer' | 'pharmacyName' | 'productStrainName' | 'productName',
  entityName: string,
  entityId: number,
  currentDate: string,
  currentRank: number
): Promise<{
  trendMetrics: TrendMetricsData | null;
  previousRank: number;
  streakDays: number;
  marketShare: number;
  dailyVolumes: number[];
}> {
  const entityTypeMap = {
    productManufacturer: 'manufacturer',
    pharmacyName: 'pharmacy',
    productStrainName: 'strain',
    productName: 'product',
  } as const;
  
  const dbEntityType = entityTypeMap[entityType];
  
  // Fetch all data in parallel
  const [trendMetrics, previousRank, streakDays, marketShare] = await Promise.all([
    fetchTrendMetrics(entityType, entityName),
    getPreviousRank(dbEntityType, entityId, currentDate),
    calculateStreakDays(dbEntityType, entityId, currentDate, currentRank),
    calculateMarketShare(entityType, entityName),
  ]);
  
  const dailyVolumes = trendMetrics ? calculateDailyVolumes(trendMetrics) : [];
  
  return {
    trendMetrics,
    previousRank,
    streakDays,
    marketShare,
    dailyVolumes,
  };
}
