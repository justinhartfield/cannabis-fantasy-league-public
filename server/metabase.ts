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
  metabaseId: string;
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

interface BrandData {
  name: string;
  slug: string | null;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  totalFavorites: number;
  totalViews: number;
  totalComments: number;
  affiliateClicks: number;
}

interface CannabisStrainData {
  metabaseId: string;
  name: string;
  slug: string;
  type: string | null;
  description: string | null;
  effects: string[] | null;
  pharmaceuticalProductCount: number;
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
        ...(METABASE_API_KEY.startsWith('mb_')
          ? { 'X-API-KEY': METABASE_API_KEY }
          : {
            'X-Metabase-Session': METABASE_API_KEY,
            'Cookie': `metabase.SESSION=${METABASE_API_KEY}`
          }
        ),
      },
    });
  }

  /**
   * Execute a Metabase dataset query (MBQL format)
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
   * Fetch table metadata to inspect fields
   */
  async getTableMetadata(tableId: number) {
    try {
      const response = await this.axiosInstance.get(`/api/table/${tableId}/query_metadata`);
      return response.data;
    } catch (error) {
      console.error('[Metabase] Failed to fetch metadata:', error);
      return null;
    }
  }

  /**
   * Execute a native MongoDB query
   * @param nativeQuery - MongoDB query string (e.g., "db.getCollection('Prescription').find({})")
   * @returns Array of result rows
   */
  async executeNativeQuery<T = any>(nativeQuery: string): Promise<T[]> {
    try {
      console.log(`[Metabase] Executing native query: ${nativeQuery.substring(0, 100)}...`);

      const response = await this.axiosInstance.post('/api/dataset', {
        database: 2, // Weed.de Prod DB
        type: 'native',
        native: {
          query: nativeQuery,
        },
      });

      const rows = response.data.data.rows || [];
      console.log(`[Metabase] Native query returned ${rows.length} rows`);
      return rows;
    } catch (error) {
      console.error('[Metabase] Native query failed:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('[Metabase] Error response:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Execute a saved question/card by ID
   * @param cardId - The Metabase card/question ID
   * @param parameters - Optional parameters for the card (e.g., { date: '2025-11-16' })
   * @returns Array of result objects
   */
  async executeCardQuery(cardId: number, parameters?: Record<string, any>): Promise<any[]> {
    try {
      const hasParams = parameters && Object.keys(parameters).length > 0;
      console.log(`[Metabase] Executing card ${cardId}${hasParams ? ' with parameters' : ''}...`, hasParams ? parameters : '');

      // Format parameters for Metabase API if provided
      // Metabase expects an array of parameter objects
      let requestBody = {};
      if (hasParams) {
        const paramList = Object.entries(parameters).map(([key, value]) => ({
          type: 'category',
          target: ['variable', ['template-tag', key]],
          value: value
        }));
        requestBody = { parameters: paramList };
      }
      const response = await this.axiosInstance.post(`/api/card/${cardId}/query`, requestBody);
      const rows = response.data.data?.rows || [];
      const cols = response.data.data?.cols || [];

      // Convert rows array to objects using column names
      const results = rows.map((row: any[]) => {
        const obj: Record<string, any> = {};
        cols.forEach((col: any, index: number) => {
          obj[col.display_name || col.name] = row[index];
        });
        return obj;
      });

      console.log(`[Metabase] Card ${cardId} returned ${results.length} rows`);
      return results;
    } catch (error) {
      console.error(`[Metabase] Card query failed:`, error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('[Metabase] Error response:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Execute a MongoDB aggregation pipeline
   * @param collection - Collection name (e.g., "Prescription")
   * @param pipeline - MongoDB aggregation pipeline array
   * @returns Array of aggregated results
   */
  async executeAggregation<T = any>(collection: string, pipeline: any[]): Promise<T[]> {
    const query = `db.getCollection("${collection}").aggregate(${JSON.stringify(pipeline)})`;
    return this.executeNativeQuery<T>(query);
  }

  /**
   * Fetch manufacturer/brand data
   */
  async fetchManufacturers(): Promise<ManufacturerData[]> {
    console.log('[Metabase] Fetching manufacturer data...');

    try {
      // Query Brand table for all brands
      const rows = await this.executeQuery({
        'source-table': TABLES.PRODUCT,
        limit: 10000, // Fetch enough products to get all manufacturers
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
   * Fetch brands data for the brands table (not manufacturers)
   */
  async fetchBrands(): Promise<BrandData[]> {
    console.log('[Metabase] Fetching brands data...');

    try {
      // Query Brand table for all brands
      const rows = await this.executeQuery({
        'source-table': TABLES.BRAND,
        limit: 1000,
      });

      const brands: BrandData[] = rows.map((row: any) => {
        // Based on weed.de Metabase schema:
        // row[1] = name
        // row[2] = slug
        // row[3] = description
        // row[5] = logoUrl
        // row[6] = websiteUrl  
        // row[7] = totalFavorites (NOT totalRatings)
        // row[8] = totalViews
        // row[9] = totalComments
        // row[10] = affiliateClicks

        return {
          name: row[1] || 'Unknown',
          slug: row[2] || null,
          description: row[3] || null,
          logoUrl: row[5] || null,
          websiteUrl: row[6] || null,
          totalFavorites: typeof row[7] === 'number' ? row[7] : 0,
          totalViews: typeof row[8] === 'number' ? row[8] : 0,
          totalComments: typeof row[9] === 'number' ? row[9] : 0,
          affiliateClicks: typeof row[10] === 'number' ? row[10] : 0,
        };
      });

      console.log(`[Metabase] Fetched ${brands.length} brands`);
      return brands;
    } catch (error) {
      console.error('[Metabase] Error fetching brands:', error);
      throw error;
    }
  }

  /**
   * Fetch strain/product data
   */
  async fetchStrains(options: any = {}): Promise<StrainData[]> {
    console.log('[Metabase] Fetching strain data...');

    try {
      // 1. Fetch default products (likely top 2000)
      const defaultRowsPromise = this.executeQuery({
        'source-table': TABLES.PRODUCT,
        limit: 10000, // Try to get as many as possible
        ...options,
      });

      // 2. Explicitly fetch "187" products to ensure they are included
      // (The default query has a 2000 row limit and might miss these)
      const specificRowsPromise = this.executeQuery({
        'source-table': TABLES.PRODUCT,
        limit: 10000,
        filter: ['contains', ['field', 859, null], '187'], // Filter by Manufacturer (ID 859)
      });

      const [defaultRows, specificRows] = await Promise.all([defaultRowsPromise, specificRowsPromise]);

      // Merge rows and deduplicate by ID (index 0)
      const allRows = [...defaultRows];
      const existingIds = new Set(defaultRows.map((r: any) => r[0]));

      for (const row of specificRows) {
        if (!existingIds.has(row[0])) {
          allRows.push(row);
          existingIds.add(row[0]);
        }
      }

      const strains: StrainData[] = allRows
        .filter((row: any) => row[26] && row[30]) // Filter out products without names or manufacturers
        .map((row: any) => {
          const name = row[26] || 'Unknown'; // Index 26 is the product name
          const manufacturer = row[30] || 'Unknown'; // Index 30 is the manufacturer
          // TODO: Verify row[4] is correct for favorites (not views/ratings)
          // If favorites are showing tens of thousands, try row[7] or row[8] instead
          const favoriteCount = row[4] || 0; // Index 4 is favorite count (needs verification)
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

          // Extract genetics from index 33 (Genetik)
          const genetics = row[33] || 'Unknown';

          return {
            metabaseId: row[0], // Index 0 is the ID
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
            genetics,
          };
        });

      console.log(`[Metabase] Fetched ${strains.length} strains (merged default + 187)`);
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
            thcMin = row[44].rangeLow || null;
            thcMax = row[44].rangeHigh || null;
          }

          // Extract CBD range from index 11 (if available)
          let cbdMin = null, cbdMax = null;
          if (row[11] && typeof row[11] === 'object') {
            cbdMin = row[11].rangeLow || null;
            cbdMax = row[11].rangeHigh || null;
          }

          // Extract type from index 36 (array of types)
          let strainType = null;
          if (row[36] && Array.isArray(row[36]) && row[36].length > 0) {
            const typeStr = row[36][0].toLowerCase();
            if (typeStr.includes('sativa')) strainType = 'sativa';
            else if (typeStr.includes('indica')) strainType = 'indica';
            else if (typeStr.includes('hybrid')) strainType = 'hybrid';
          }

          // Normalize strain name: white_widow -> White Widow
          const rawName = row[1] || '';
          const normalizedName = rawName
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');

          // Get pharmaceutical product count (number of products using this strain)
          const pharmaceuticalProductCount = typeof row[29] === 'number' ? row[29] : 0;

          return {
            metabaseId: row[0] || '',
            name: normalizedName,
            slug: row[2] || '',
            pharmaceuticalProductCount,
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
      // Query Product table for all products
      const rows = await this.executeQuery({
        'source-table': TABLES.PRODUCT,
        limit: 10000,
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

  /**
   * Execute a public Metabase query
   * @param publicUuid - The public UUID from the public query URL
   * @returns Array of query results
   */
  async executePublicQuery(publicUuid: string): Promise<any[]> {
    try {
      console.log(`[Metabase] Executing public query ${publicUuid}...`);

      const response = await axios.get(`${METABASE_URL.trim()}/api/public/card/${publicUuid}/query/json`, {
        timeout: 60000,
      });

      const results = response.data || [];
      console.log(`[Metabase] Public query ${publicUuid} returned ${results.length} rows`);
      return results;
    } catch (error) {
      console.error(`[Metabase] Public query failed: `, error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('[Metabase] Error response:', error.response.data);
      }
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
