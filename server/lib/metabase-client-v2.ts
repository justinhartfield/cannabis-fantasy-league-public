import axios from 'axios';

const METABASE_URL = (process.env.METABASE_URL || 'https://bi.weed.de').trim();
const METABASE_API_KEY = process.env.METABASE_API_KEY || 'mb_v2XR/W+F1+svoeobEorso52tVPk0qeNOHkjgtcNLqTU=';

// Card IDs for today's data
const CARD_IDS = {
  manufacturersToday: 1273,
  productsToday: 1269,
  strainsToday: 1275,
  pharmaciesToday: 1276,
  manufacturersYesterday: 1274,
  productsYesterday: 1271,
  strainsYesterday: 1267,
  pharmaciesYesterday: 1277,
};

interface MetabaseResponse {
  data: {
    cols: Array<{ name: string }>;
    rows: any[][];
  };
}

interface ManufacturerStats {
  name: string;
  salesVolumeGrams: number;
  revenueCents: number;
  orderCount: number;
}

interface ProductStats {
  name: string;
  salesVolumeGrams: number;
  orderCount: number;
}

interface PharmacyStats {
  name: string;
  orderCount: number;
  revenueCents: number;
}

interface StrainStats {
  name: string;
  salesVolumeGrams: number;
  orderCount: number;
}

async function queryCard(cardId: number): Promise<MetabaseResponse> {
  const response = await axios.post(
    `${METABASE_URL}/api/card/${cardId}/query`,
    {},
    {
      headers: {
        'X-API-KEY': METABASE_API_KEY,
      },
    }
  );
  return response.data;
}

export async function getManufacturerStatsToday(): Promise<ManufacturerStats[]> {
  const response = await queryCard(CARD_IDS.manufacturersToday);
  
  // Columns: Name, Quantity, Sales, Orders, Pharm, Manuf, Prod, Avg order (g), Avg order (€), Avg price
  return response.data.rows.map(row => ({
    name: row[0],
    salesVolumeGrams: Math.round(row[1]), // Quantity in grams
    revenueCents: Math.round(row[2] * 100), // Sales in € converted to cents
    orderCount: row[3],
  }));
}

export async function getProductStatsToday(): Promise<ProductStats[]> {
  const response = await queryCard(CARD_IDS.productsToday);
  
  // Columns: Name, Quantity, Sales, Orders, Pharm, Manuf, Prod, Avg order (g), Avg order (€), Avg price
  return response.data.rows.map(row => ({
    name: row[0],
    salesVolumeGrams: Math.round(row[1]),
    orderCount: row[3],
  }));
}

export async function getStrainStatsToday(): Promise<StrainStats[]> {
  const response = await queryCard(CARD_IDS.strainsToday);
  
  // Columns: Name, Quantity, Sales, Orders, Pharm, Manuf, Prod, Avg order (g), Avg order (€), Avg price
  return response.data.rows.map(row => ({
    name: row[0],
    salesVolumeGrams: Math.round(row[1]),
    orderCount: row[3],
  }));
}

export async function getPharmacyStatsToday(): Promise<PharmacyStats[]> {
  const response = await queryCard(CARD_IDS.pharmaciesToday);
  
  // Columns: Name, Quantity, Sales, Orders, Pharm, Manuf, Prod, Avg order (g), Avg order (€), Avg price
  return response.data.rows.map(row => ({
    name: row[0],
    orderCount: row[3],
    revenueCents: Math.round(row[2] * 100), // Sales in € converted to cents
  }));
}

// Export all functions
export const MetabaseClient = {
  getManufacturerStatsToday,
  getProductStatsToday,
  getStrainStatsToday,
  getPharmacyStatsToday,
};
