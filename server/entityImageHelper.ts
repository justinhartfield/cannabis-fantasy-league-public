// Helper to fetch entity images based on type and ID
import { getDb } from "./db";
import { manufacturers, brands, pharmacies, cannabisStrains } from "../drizzle/schema";
import { eq } from "drizzle-orm";

function normalizeUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    // Validate that the URL can be parsed to avoid returning invalid values
    const parsed = new URL(trimmed, trimmed.startsWith("http") ? undefined : "https://placeholder.invalid");
    // When a relative URL was provided, the above would include the placeholder origin.
    // We only want to allow absolute URLs.
    if (!trimmed.startsWith("http")) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeEntityType(entityType: string): string {
  return (entityType || "").toLowerCase();
}

export async function getEntityImage(entityType: string, entityId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const normalizedType = normalizeEntityType(entityType);

  try {
    switch (normalizedType) {
      case 'manufacturer': {
        const result = await db
          .select({ logoUrl: manufacturers.logoUrl })
          .from(manufacturers)
          .where(eq(manufacturers.id, entityId))
          .limit(1);
        return normalizeUrl(result[0]?.logoUrl);
      }
      case 'brand': {
        const result = await db
          .select({ logoUrl: brands.logoUrl })
          .from(brands)
          .where(eq(brands.id, entityId))
          .limit(1);
        return normalizeUrl(result[0]?.logoUrl);
      }
      case 'pharmacy': {
        const result = await db
          .select({ logoUrl: pharmacies.logoUrl })
          .from(pharmacies)
          .where(eq(pharmacies.id, entityId))
          .limit(1);
        return normalizeUrl(result[0]?.logoUrl);
      }
      case 'strain':
      case 'cannabis_strain':
      case 'cannabisstrain': {
        const result = await db
          .select({ imageUrl: cannabisStrains.imageUrl })
          .from(cannabisStrains)
          .where(eq(cannabisStrains.id, entityId))
          .limit(1);
        return normalizeUrl(result[0]?.imageUrl);
      }
      default:
        return null;
    }
  } catch (error) {
    console.error(`[EntityImageHelper] Error fetching image for ${entityType} ${entityId}:`, error);
    return null;
  }
}
