// Helper to fetch entity images based on type and ID
import { getDb } from "./db";
import { manufacturers, brands, pharmacies, cannabisStrains } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export async function getEntityImage(entityType: string, entityId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    switch (entityType) {
      case 'manufacturer': {
        const result = await db
          .select({ logoUrl: manufacturers.logoUrl })
          .from(manufacturers)
          .where(eq(manufacturers.id, entityId))
          .limit(1);
        return result[0]?.logoUrl || null;
      }
      case 'brand': {
        const result = await db
          .select({ logoUrl: brands.logoUrl })
          .from(brands)
          .where(eq(brands.id, entityId))
          .limit(1);
        return result[0]?.logoUrl || null;
      }
      case 'pharmacy': {
        const result = await db
          .select({ logoUrl: pharmacies.logoUrl })
          .from(pharmacies)
          .where(eq(pharmacies.id, entityId))
          .limit(1);
        return result[0]?.logoUrl || null;
      }
      case 'strain': {
        const result = await db
          .select({ imageUrl: cannabisStrains.imageUrl })
          .from(cannabisStrains)
          .where(eq(cannabisStrains.id, entityId))
          .limit(1);
        return result[0]?.imageUrl || null;
      }
      default:
        return null;
    }
  } catch (error) {
    console.error(`[EntityImageHelper] Error fetching image for ${entityType} ${entityId}:`, error);
    return null;
  }
}
