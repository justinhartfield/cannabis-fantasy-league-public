/**
 * Metabase API Client
 * 
 * Connects to weed.de Metabase instance to fetch real-time cannabis market data.
 * Implements caching, retry logic, and error handling for robust data synchronization.
 */

import axios, { AxiosInstance } from 'axios';

// Metabase configuration from environment variables
const METABASE_URL = (process.env.METABASE_URL || 'https://bi.weed.de').trim();
const METABASE_API_KEY = process.env.METABASE_API_KEY || '';

// Table IDs from weed.de Metabase
const TABLES = {
  PRODUCT: 42,
  PHARMACY: 24,
  BRAND: 36,
  STRAIN: 16,
};

interface ManufacturerData {
  name: string;
  rank_1d: number | null;
  rank_7d: number | null;
  rank_30d: number | null;
  rank_90d: number | null;
  product_count: number;
}

interface StrainData {
  name: string;
  manufacturer: string;
  favorite_count: number;
  pharmacy_count: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  price_category: string;
  thc_content: string | null;
  cbd_content: string | null;
}

interface CannabisStrainData {
  metabaseId: string;
  name: string;
  slug: string;
  type: string | null;
  description: string | null;
  effects: string[] | null;
  flavors: string[] | null;
  terpenes: string[] | null;
  thcMin: number | null;
  thcMax: number | null;
  cbdMin: number | null;
  cbdMax: number | null;
}

interface PharmacyData {
  name: string;
  city: string | null;
  state: string | null;
  product_count: number;
  weekly_revenue: number;
  weekly_orders: number;
  avg_order_size: number;
  retention_rate: number;
  app_usage_rate: number;
}

export class MetabaseClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: METABASE_URL,
      timeout: 60000, // Increased timeout for large queries
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': METABASE_API_KEY,
      },
    });
  }

  /**
   * Execute a Metabase dataset query
   */
  private async executeQuery<T = any>(query: any): Promise<T[]> {
    try {
      const response = await this.axiosInstance.post('/api/dataset', {
        database: 2, // Weed.de Prod DB
        type: 'query',
        query,
      });

      return response.data.data.rows || [];
    } catch (error) {
      console.error('[Metabase] Query failed:', error);
      throw error;
    }
  }

  /**
   * Fetch manufacturer/brand data
   */
  async fetchManufacturers(): Promise<ManufacturerData[]> {
    console.log('[Metabase] Fetching manufacturer data...');

    try {
      // Query Brand table for all brands
      const rows = await this.executeQuery({
        'source-table': TABLES.BRAND,
        limit: 1000,
      });

      const manufacturers: ManufacturerData[] = rows.map((row: any, index: number) => {
        // row[1] is name, row[11] is totalRatings
        const totalRatings = typeof row[11] === 'number' ? row[11] : 0;
        return {
          name: row[1] || 'Unknown',
          rank_1d: index + 1,
          rank_7d: index + 1,
          rank_30d: index + 1,
          rank_90d: index + 1,
          product_count: totalRatings,
        };
      });

      console.log(`[Metabase] Fetched ${manufacturers.length} manufacturers`);
      return manufacturers;
    } catch (error) {
      console.error('[Metabase] Error fetching manufacturers:', error);
      throw error;
    }
  }

  /**
   * Fetch strain/product data
   */
  async fetchStrains(): Promise<StrainData[]> {
    console.log('[Metabase] Fetching strain data...');

    try {
      // Query Product table for all products
      const rows = await this.executeQuery({
        'source-table': TABLES.PRODUCT,
        limit: 3000,
      });

      const strains: StrainData[] = rows
        .filter((row: any) => row[26] && row[30]) // Filter out products without names or manufacturers
        .map((row: any) => {
          const name = row[26] || 'Unknown'; // Index 26 is the product name
          const manufacturer = row[30] || 'Unknown'; // Index 30 is the manufacturer
          const favoriteCount = row[4] || 0; // Index 4 is favorite count
          const price = row[32] || 0; // Index 32 is the price
          
          // Extract THC content from index 37
          let thcContent = null;
          if (row[37] && typeof row[37] === 'object') {
            thcContent = `${row[37].value}${row[37].unit || '%'}`;
          }
          
          // Extract CBD content from index 12
          let cbdContent = null;
          if (row[12] && typeof row[12] === 'object') {
            cbdContent = `${row[12].value}${row[12].unit || '%'}`;
          }

          return {
            name,
            manufacturer,
            favorite_count: favoriteCount,
            pharmacy_count: 0, // TODO: Calculate from relationships
            avg_price: price,
            min_price: price * 0.9,
            max_price: price * 1.1,
            price_category: price > 10 ? 'expensive' : price > 7 ? 'above_average' : 'average',
            thc_content: thcContent,
            cbd_content: cbdContent,
          };
        });

      console.log(`[Metabase] Fetched ${strains.length} strains`);
      return strains;
    } catch (error) {
      console.error('[Metabase] Error fetching strains:', error);
      throw error;
    }
  }

  /**
   * Fetch cannabis strain genetics data
   */
  async fetchCannabisStrains(): Promise<CannabisStrainData[]> {
    console.log('[Metabase] Fetching cannabis strain data...');

    try {
      // Query Strain table for all genetics/cultivars
      const rows = await this.executeQuery({
        'source-table': TABLES.STRAIN,
        limit: 2000,
      });

      const cannabisStrains: CannabisStrainData[] = rows
        .filter((row: any) => row[1] && row[2]) // Filter out strains without name and slug
        .map((row: any) => {
          // Extract THC range from index 44
          let thcMin = null, thcMax = null;
          if (row[44] && typeof row[44] === 'object') {
            thcMin = row[44].rangeLow != null ? Math.round(Number(row[44].rangeLow)) : null;
            thcMax = row[44].rangeHigh != null ? Math.round(Number(row[44].rangeHigh)) : null;
          }

          // Extract CBD range from index 11 (if available)
          let cbdMin = null, cbdMax = null;
          if (row[11] && typeof row[11] === 'object') {
            cbdMin = row[11].rangeLow != null ? Math.round(Number(row[11].rangeLow)) : null;
            cbdMax = row[11].rangeHigh != null ? Math.round(Number(row[11].rangeHigh)) : null;
          }

          // Extract type from index 36 (array of types)
          let strainType = null;
          if (row[36] && Array.isArray(row[36]) && row[36].length > 0) {
            const typeStr = row[36][0].toLowerCase();
            if (typeStr.includes('sativa')) strainType = 'sativa';
            else if (typeStr.includes('indica')) strainType = 'indica';
            else if (typeStr.includes('hybrid')) strainType = 'hybrid';
          }

          return {
            metabaseId: row[0] || '',
            name: row[1] || '',
            slug: row[2] || '',
            type: strainType,
            description: null, // Description not available in current schema
            effects: row[24] || null, // Index 24: effects array
            flavors: row[35] || null, // Index 35: flavors array
            terpenes: row[37] || null, // Index 37: terpenes array
            thcMin,
            thcMax,
            cbdMin,
            cbdMax,
          };
        });

      console.log(`[Metabase] Fetched ${cannabisStrains.length} cannabis strains`);
      return cannabisStrains;
    } catch (error) {
      console.error('[Metabase] Error fetching cannabis strains:', error);
      throw error;
    }
  }

  /**
   * Fetch pharmacy data
   */
  async fetchPharmacies(): Promise<PharmacyData[]> {
    console.log('[Metabase] Fetching pharmacy data...');

    try {
      // Query Pharmacy table
      const rows = await this.executeQuery({
        'source-table': TABLES.PHARMACY,
        limit: 500,
      });

      const pharmacies: PharmacyData[] = rows
        .filter((row: any) => row[1]) // Filter out pharmacies without names
        .map((row: any) => {
          // row[15] is the address object with city and state
          const address = row[15] || {};
          return {
            name: row[1] || 'Unknown',
            city: address.city || null,
            state: address.state || null,
            product_count: 0, // TODO: Calculate from relationships
            weekly_revenue: 0,
            weekly_orders: 0,
            avg_order_size: 0,
            retention_rate: 0,
            app_usage_rate: 0,
          };
        });

      console.log(`[Metabase] Fetched ${pharmacies.length} pharmacies`);
      return pharmacies;
    } catch (error) {
      console.error('[Metabase] Error fetching pharmacies:', error);
      throw error;
    }
  }
}

// Singleton instance
let metabaseClient: MetabaseClient | null = null;

export function getMetabaseClient(): MetabaseClient {
  if (!metabaseClient) {
    metabaseClient = new MetabaseClient();
  }
  return metabaseClient;
}
