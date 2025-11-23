import { sql } from 'drizzle-orm';
import { getDb } from '../server/db';

async function cleanupDuplicateBreakdowns() {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const result = await db.execute(sql`
    WITH ranked AS (
      SELECT
        "id",
        ROW_NUMBER() OVER (
          PARTITION BY "weeklyTeamScoreId", "position", "assetType", "assetId"
          ORDER BY "createdAt" DESC, "id" DESC
        ) AS rn
      FROM "scoringBreakdowns"
    )
    DELETE FROM "scoringBreakdowns" AS sb
    USING ranked r
    WHERE sb."id" = r."id"
      AND r.rn > 1
    RETURNING sb."id";
  `);

  const deleted =
    // @ts-expect-error rowCount not typed on drizzle execute result
    (result.rowCount as number | undefined) ??
    (Array.isArray(result) ? result.length : 0);

  console.log(`[cleanupDuplicateBreakdowns] Removed ${deleted} duplicate breakdown rows.`);
}

cleanupDuplicateBreakdowns()
  .then(() => {
    console.log('[cleanupDuplicateBreakdowns] Done.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[cleanupDuplicateBreakdowns] Failed:', error);
    process.exit(1);
  });



