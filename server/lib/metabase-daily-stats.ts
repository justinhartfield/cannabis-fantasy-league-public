/**
 * Metabase Daily Stats API
 * Fetches real sales/order/revenue data for manufacturers, products, and pharmacies
 */

import axios, { AxiosInstance } from 'axios';

const METABASE_URL = process.env.METABASE_URL || 'https://bi.weed.de';
const METABASE_API_KEY = process.env.METABASE_API_KEY;
const ORDERS_CARD_ID = 1264; // "Orders by day full detail" card

export interface ManufacturerDailyStats {
  manufacturerName: string;
  salesVolumeGrams: number;
  orderCount: number;
  revenueCents: number;
}

export interface ProductDailyStats {
  productName: string;
  salesVolumeGrams: number;
  orderCount: number;
}

export interface PharmacyDailyStats {
  pharmacyName: string;
  orderCount: number;
  revenueCents: number;
}

export class MetabaseDailyStatsClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    if (!METABASE_API_KEY) {
      throw new Error('METABASE_API_KEY environment variable is required');
    }

    this.axiosInstance = axios.create({
      baseURL: METABASE_URL,
      timeout: 120000, // 2 minutes for large queries
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': METABASE_API_KEY,
      },
    });
  }

  /**
   * Fetch manufacturer daily stats for a specific date
   */
  async fetchManufacturerDailyStats(date: string): Promise<ManufacturerDailyStats[]> {
    console.log(`[MetabaseDailyStats] Fetching manufacturer stats for ${date}...`);

    try {
      // Execute the Orders by day full detail card
      const response = await this.axiosInstance.post(
        `/api/card/${ORDERS_CARD_ID}/query`
      );

      const rows = response.data.data.rows;
      console.log(`[MetabaseDailyStats] Fetched ${rows.length} order rows`);

      // Group by manufacturer and aggregate
      // Row structure: [0]=ID, [23]=OrderDate, [30]=ProductManufacturer, [10]=Quantity, [20]=TotalPrice
      const statsMap = new Map<string, ManufacturerDailyStats>();

      for (const row of rows) {
        const orderDate = row[23]; // OrderDate
        const manufacturer = row[30]; // ProductManufacturer
        const quantity = row[10]; // Quantity (grams)
        const totalPrice = row[20]; // TotalPrice (euros)

        // Filter by date (OrderDate format: "2024-11-07T14:51:35.272Z")
        if (!orderDate || !orderDate.startsWith(date)) {
          continue;
        }

        if (!manufacturer || manufacturer === 'Unknown') {
          continue;
        }

        const stats = statsMap.get(manufacturer) || {
          manufacturerName: manufacturer,
          salesVolumeGrams: 0,
          orderCount: 0,
          revenueCents: 0,
        };

        stats.salesVolumeGrams += quantity || 0;
        stats.orderCount += 1;
        stats.revenueCents += Math.round((totalPrice || 0) * 100);

        statsMap.set(manufacturer, stats);
      }

      const results = Array.from(statsMap.values());
      console.log(`[MetabaseDailyStats] Aggregated ${results.length} manufacturers`);
      
      return results;
    } catch (error) {
      console.error('[MetabaseDailyStats] Error fetching manufacturer stats:', error);
      throw error;
    }
  }

  /**
   * Fetch product daily stats for a specific date
   */
  async fetchProductDailyStats(date: string): Promise<ProductDailyStats[]> {
    console.log(`[MetabaseDailyStats] Fetching product stats for ${date}...`);

    try {
      const response = await this.axiosInstance.post(
        `/api/card/${ORDERS_CARD_ID}/query`
      );

      const rows = response.data.data.rows;
      const statsMap = new Map<string, ProductDailyStats>();

      for (const row of rows) {
        const orderDate = row[23]; // OrderDate
        const productName = row[28]; // ProductName
        const quantity = row[10]; // Quantity (grams)

        if (!orderDate || !orderDate.startsWith(date)) {
          continue;
        }

        if (!productName) {
          continue;
        }

        const stats = statsMap.get(productName) || {
          productName,
          salesVolumeGrams: 0,
          orderCount: 0,
        };

        stats.salesVolumeGrams += quantity || 0;
        stats.orderCount += 1;

        statsMap.set(productName, stats);
      }

      const results = Array.from(statsMap.values());
      console.log(`[MetabaseDailyStats] Aggregated ${results.length} products`);
      
      return results;
    } catch (error) {
      console.error('[MetabaseDailyStats] Error fetching product stats:', error);
      throw error;
    }
  }

  /**
   * Fetch pharmacy daily stats for a specific date
   */
  async fetchPharmacyDailyStats(date: string): Promise<PharmacyDailyStats[]> {
    console.log(`[MetabaseDailyStats] Fetching pharmacy stats for ${date}...`);

    try {
      const response = await this.axiosInstance.post(
        `/api/card/${ORDERS_CARD_ID}/query`
      );

      const rows = response.data.data.rows;
      const statsMap = new Map<string, PharmacyDailyStats>();

      for (const row of rows) {
        const orderDate = row[23]; // OrderDate
        const pharmacyName = row[45]; // PharmacyName
        const totalPrice = row[20]; // TotalPrice (euros)

        if (!orderDate || !orderDate.startsWith(date)) {
          continue;
        }

        if (!pharmacyName) {
          continue;
        }

        const stats = statsMap.get(pharmacyName) || {
          pharmacyName,
          orderCount: 0,
          revenueCents: 0,
        };

        stats.orderCount += 1;
        stats.revenueCents += Math.round((totalPrice || 0) * 100);

        statsMap.set(pharmacyName, stats);
      }

      const results = Array.from(statsMap.values());
      console.log(`[MetabaseDailyStats] Aggregated ${results.length} pharmacies`);
      
      return results;
    } catch (error) {
      console.error('[MetabaseDailyStats] Error fetching pharmacy stats:', error);
      throw error;
    }
  }
}

// Singleton instance
let dailyStatsClient: MetabaseDailyStatsClient | null = null;

export function getMetabaseDailyStatsClient(): MetabaseDailyStatsClient {
  if (!dailyStatsClient) {
    dailyStatsClient = new MetabaseDailyStatsClient();
  }
  return dailyStatsClient;
}
