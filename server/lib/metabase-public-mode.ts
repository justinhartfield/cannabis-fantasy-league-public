import axios from 'axios';

const METABASE_URL = (process.env.METABASE_URL || 'https://bi.weed.de').trim();
const METABASE_API_KEY = process.env.METABASE_API_KEY || 'mb_v2XR/W+F1+svoeobEorso52tVPk0qeNOHkjgtcNLqTU=';

// Public Mode Card IDs
export const PUBLIC_MODE_CARDS = {
  // Individual question cards
  effectsToday: '4e09747b-1e96-4791-b8d9-763be629a21e',
  effectsYesterday: '60bfaace-000e-4549-83e3-18caa70499f6',
  geneticsToday: '4bcd2943-c2c1-4ede-bd3d-b87e8db21074',
  geneticsYesterday: '21022909-bf18-4ace-9639-28fe4224f29f',
  thcToday: '3f7934cd-5c73-42af-bd2a-8aa02c07c7ae',
  thcYesterday: 'a2ea092b-1635-4495-94c2-6928cdfd2fa3',
  productTypeToday: '9e7fcffa-b3d5-4152-ade3-db7f7facbf24',
  productTypeYesterday: 'c24b17af-216b-4de0-9124-017a1320b869',
  terpenesToday: '005e111b-263c-46e7-a669-e0b99182898f',
  terpenesYesterday: '982d26cc-9779-406c-b335-a5d6ff9078ac',
  strainsRanked: '4d5e2c22-ddbc-4ddc-9036-105afdb5ee37',
};

export const PUBLIC_MODE_DASHBOARDS = {
  pharmacyInsights: 'ed0e055c-ff3b-4925-b347-cb3d5ac6e9d5',
  productListing: 'cfd511c9-c54a-4018-b6a1-73fa4745e6f2',
  manufacturerReport: '1810044b-8856-4c34-8448-c0570313e6b2',
};

interface MetabaseResponse {
  data: {
    cols: Array<{ name: string }>;
    rows: any[][];
  };
}

interface DashboardResponse {
  id: string;
  name: string;
  cards: Array<{
    id: number;
    card_id: number;
    name: string;
    visualization_settings: any;
  }>;
}

// Effect Category Stats
export interface EffectStats {
  effectName: string;
  count: number;
}

// Genetics Stats
export interface GeneticsStats {
  geneticsType: string;
  count: number;
  percentage: number;
}

// THC Level Stats
export interface ThcStats {
  thcRange: string;
  count: number;
  percentage: number;
}

// Product Type Stats
export interface ProductTypeStats {
  productType: string;
  count: number;
  percentage: number;
}

// Terpene Stats
export interface TerpeneStats {
  terpeneName: string;
  count: number;
}

// Strain Stats
export interface StrainStats {
  strainName: string;
  orderCount: number;
  rank: number;
}

// Dashboard Data Types
export interface PharmacyInsightsData {
  orderEvolution: Array<{
    date: string;
    orderCount: number;
    orderType?: string;
  }>;
  filters: {
    orderDate?: string;
    orderType?: string;
    manufacturer?: string;
    product?: string;
    strain?: string;
    pharmacy?: string;
    userState?: string;
    userCity?: string;
  };
}

export interface ProductListingData {
  productRecommendations: Array<{
    productA: string;
    productB: string;
    coPurchaseCount: number;
  }>;
  userCounts: Array<{
    productName: string;
    uniqueUserCount: number;
  }>;
}

export interface ManufacturerReportData {
  periodComparisons: {
    dayOverDay: {
      current: number;
      previous: number;
      delta: number;
      percentage: number;
    };
    weekOverWeek: {
      current: number;
      previous: number;
      delta: number;
      percentage: number;
    };
    monthOverMonth: {
      current: number;
      previous: number;
      delta: number;
      percentage: number;
    };
    quarterOverQuarter: {
      current: number;
      previous: number;
      delta: number;
      percentage: number;
    };
  };
}

// Query a card by UUID
async function queryCardByUuid(cardUuid: string): Promise<MetabaseResponse> {
  const response = await axios.post(
    `${METABASE_URL}/api/card/${cardUuid}/query`,
    {},
    {
      headers: {
        'X-API-KEY': METABASE_API_KEY,
      },
    }
  );
  return response.data;
}

// Query a dashboard by UUID
async function queryDashboard(dashboardUuid: string): Promise<DashboardResponse> {
  const response = await axios.get(
    `${METABASE_URL}/api/dashboard/${dashboardUuid}`,
    {
      headers: {
        'X-API-KEY': METABASE_API_KEY,
      },
    }
  );
  return response.data;
}

// Get Effects Stats (Today)
export async function getEffectsStatsToday(): Promise<EffectStats[]> {
  const response = await queryCardByUuid(PUBLIC_MODE_CARDS.effectsToday);
  
  // Assuming columns: Effect Name, Count
  return response.data.rows.map((row, index) => ({
    effectName: row[0],
    count: row[1] || 0,
  }));
}

// Get Effects Stats (Yesterday)
export async function getEffectsStatsYesterday(): Promise<EffectStats[]> {
  const response = await queryCardByUuid(PUBLIC_MODE_CARDS.effectsYesterday);
  
  return response.data.rows.map((row, index) => ({
    effectName: row[0],
    count: row[1] || 0,
  }));
}

// Get Genetics Stats (Today)
export async function getGeneticsStatsToday(): Promise<GeneticsStats[]> {
  const response = await queryCardByUuid(PUBLIC_MODE_CARDS.geneticsToday);
  
  // Assuming columns: Genetics Type, Count, Percentage
  return response.data.rows.map((row, index) => ({
    geneticsType: row[0],
    count: row[1] || 0,
    percentage: row[2] || 0,
  }));
}

// Get Genetics Stats (Yesterday)
export async function getGeneticsStatsYesterday(): Promise<GeneticsStats[]> {
  const response = await queryCardByUuid(PUBLIC_MODE_CARDS.geneticsYesterday);
  
  return response.data.rows.map((row, index) => ({
    geneticsType: row[0],
    count: row[1] || 0,
    percentage: row[2] || 0,
  }));
}

// Get THC Stats (Today)
export async function getThcStatsToday(): Promise<ThcStats[]> {
  const response = await queryCardByUuid(PUBLIC_MODE_CARDS.thcToday);
  
  // Assuming columns: THC Range, Count, Percentage
  return response.data.rows.map((row, index) => ({
    thcRange: row[0],
    count: row[1] || 0,
    percentage: row[2] || 0,
  }));
}

// Get THC Stats (Yesterday)
export async function getThcStatsYesterday(): Promise<ThcStats[]> {
  const response = await queryCardByUuid(PUBLIC_MODE_CARDS.thcYesterday);
  
  return response.data.rows.map((row, index) => ({
    thcRange: row[0],
    count: row[1] || 0,
    percentage: row[2] || 0,
  }));
}

// Get Product Type Stats (Today)
export async function getProductTypeStatsToday(): Promise<ProductTypeStats[]> {
  const response = await queryCardByUuid(PUBLIC_MODE_CARDS.productTypeToday);
  
  // Assuming columns: Product Type, Count, Percentage
  return response.data.rows.map((row, index) => ({
    productType: row[0],
    count: row[1] || 0,
    percentage: row[2] || 0,
  }));
}

// Get Product Type Stats (Yesterday)
export async function getProductTypeStatsYesterday(): Promise<ProductTypeStats[]> {
  const response = await queryCardByUuid(PUBLIC_MODE_CARDS.productTypeYesterday);
  
  return response.data.rows.map((row, index) => ({
    productType: row[0],
    count: row[1] || 0,
    percentage: row[2] || 0,
  }));
}

// Get Terpene Stats (Today)
export async function getTerpenesStatsToday(): Promise<TerpeneStats[]> {
  const response = await queryCardByUuid(PUBLIC_MODE_CARDS.terpenesToday);
  
  // Assuming columns: Terpene Name, Count
  return response.data.rows.map((row, index) => ({
    terpeneName: row[0],
    count: row[1] || 0,
  }));
}

// Get Terpene Stats (Yesterday)
export async function getTerpenesStatsYesterday(): Promise<TerpeneStats[]> {
  const response = await queryCardByUuid(PUBLIC_MODE_CARDS.terpenesYesterday);
  
  return response.data.rows.map((row, index) => ({
    terpeneName: row[0],
    count: row[1] || 0,
  }));
}

// Get Strains Ranked
export async function getStrainsRanked(): Promise<StrainStats[]> {
  const response = await queryCardByUuid(PUBLIC_MODE_CARDS.strainsRanked);
  
  // Assuming columns: Strain Name, Order Count
  return response.data.rows.map((row, index) => ({
    strainName: row[0],
    orderCount: row[1] || 0,
    rank: index + 1,
  }));
}

// Get Pharmacy Insights Dashboard Data
export async function getPharmacyInsightsData(): Promise<PharmacyInsightsData> {
  const dashboard = await queryDashboard(PUBLIC_MODE_DASHBOARDS.pharmacyInsights);
  
  // This is a simplified implementation
  // In a real scenario, you would need to query individual cards within the dashboard
  // and parse the data based on the dashboard structure
  
  return {
    orderEvolution: [],
    filters: {},
  };
}

// Get Product Listing Dashboard Data
export async function getProductListingData(): Promise<ProductListingData> {
  const dashboard = await queryDashboard(PUBLIC_MODE_DASHBOARDS.productListing);
  
  // This is a simplified implementation
  // You would need to query specific cards within the dashboard
  
  return {
    productRecommendations: [],
    userCounts: [],
  };
}

// Get Manufacturer Report Dashboard Data
export async function getManufacturerReportData(): Promise<ManufacturerReportData> {
  const dashboard = await queryDashboard(PUBLIC_MODE_DASHBOARDS.manufacturerReport);
  
  // This is a simplified implementation
  // You would need to query specific cards within the dashboard
  
  return {
    periodComparisons: {
      dayOverDay: {
        current: 0,
        previous: 0,
        delta: 0,
        percentage: 0,
      },
      weekOverWeek: {
        current: 0,
        previous: 0,
        delta: 0,
        percentage: 0,
      },
      monthOverMonth: {
        current: 0,
        previous: 0,
        delta: 0,
        percentage: 0,
      },
      quarterOverQuarter: {
        current: 0,
        previous: 0,
        delta: 0,
        percentage: 0,
      },
    },
  };
}

// Aggregate function to get all public mode data
export async function getAllPublicModeData() {
  const [
    effectsToday,
    effectsYesterday,
    geneticsToday,
    geneticsYesterday,
    thcToday,
    thcYesterday,
    productTypeToday,
    productTypeYesterday,
    terpenesToday,
    terpenesYesterday,
    strainsRanked,
  ] = await Promise.all([
    getEffectsStatsToday(),
    getEffectsStatsYesterday(),
    getGeneticsStatsToday(),
    getGeneticsStatsYesterday(),
    getThcStatsToday(),
    getThcStatsYesterday(),
    getProductTypeStatsToday(),
    getProductTypeStatsYesterday(),
    getTerpenesStatsToday(),
    getTerpenesStatsYesterday(),
    getStrainsRanked(),
  ]);

  return {
    effects: {
      today: effectsToday,
      yesterday: effectsYesterday,
    },
    genetics: {
      today: geneticsToday,
      yesterday: geneticsYesterday,
    },
    thc: {
      today: thcToday,
      yesterday: thcYesterday,
    },
    productType: {
      today: productTypeToday,
      yesterday: productTypeYesterday,
    },
    terpenes: {
      today: terpenesToday,
      yesterday: terpenesYesterday,
    },
    strains: strainsRanked,
  };
}
