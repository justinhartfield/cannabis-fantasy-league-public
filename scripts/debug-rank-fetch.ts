import 'dotenv/config';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '../server/db';
import { manufacturerDailyChallengeStats } from '../drizzle/dailyChallengeSchema';
import { manufacturers } from '../drizzle/schema';
import { getPreviousRank } from '../server/trendMetricsFetcher';

async function main() {
  const targetDate = process.argv[2] ?? '2025-11-21';
  const prevDate = new Date(`${targetDate}T00:00:00Z`);
  prevDate.setUTCDate(prevDate.getUTCDate() - 1);
  const prevDateStr = prevDate.toISOString().split('T')[0];

  const db = await getDb();
  if (!db) {
    console.error('Database connection not available');
    process.exit(1);
  }

  console.log(`Inspecting previous date ${prevDateStr} for target ${targetDate}`);

  const rows = await db
    .select({
      manufacturerId: manufacturerDailyChallengeStats.manufacturerId,
      name: manufacturers.name,
      statDate: manufacturerDailyChallengeStats.statDate,
      rank: manufacturerDailyChallengeStats.rank,
      previousRank: manufacturerDailyChallengeStats.previousRank,
    })
    .from(manufacturerDailyChallengeStats)
    .innerJoin(
      manufacturers,
      eq(manufacturers.id, manufacturerDailyChallengeStats.manufacturerId)
    )
    .where(and(eq(manufacturerDailyChallengeStats.statDate, prevDateStr)))
    .orderBy(manufacturers.name);

  console.log(`Found ${rows.length} manufacturer rows for ${prevDateStr}`);
  rows.slice(0, 10).forEach((row) => {
    console.log(
      `${row.name}: rank=${row.rank}, previousRank=${row.previousRank}, manufacturerId=${row.manufacturerId}`
    );
  });

  if (rows.length === 0) {
    console.log('No rows available to test getPreviousRank');
    process.exit(0);
  }

  const sample = rows[0];
  console.log(`Sample manufacturer: ${sample.name} (${sample.manufacturerId})`);
  const rawResult = await db.execute(sql`
    SELECT rank FROM ${sql.identifier('manufacturerDailyChallengeStats')}
    WHERE ${sql.identifier('manufacturerId')} = ${sample.manufacturerId}
      AND "statDate" = ${prevDateStr}
    LIMIT 1
  `);
  console.log('Raw query result from getPreviousRank logic:', rawResult.rows);
  const computedPrevRank = await getPreviousRank(
    'manufacturer',
    sample.manufacturerId,
    targetDate
  );

  console.log(
    `getPreviousRank('manufacturer', ${sample.manufacturerId}, ${targetDate}) -> ${computedPrevRank}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

