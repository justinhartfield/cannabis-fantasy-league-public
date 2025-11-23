import 'dotenv/config';
import { dailyChallengeAggregatorV2 } from '../server/dailyChallengeAggregatorV2';

type BackfillArgs = {
  start?: string;
  end?: string;
  date?: string;
};

const logger = {
  info: async (message: string, metadata?: unknown) => {
    console.log(`[TrendBackfill] ${message}`, metadata ?? '');
  },
  warn: async (message: string, metadata?: unknown) => {
    console.warn(`[TrendBackfill][warn] ${message}`, metadata ?? '');
  },
  error: async (message: string, metadata?: unknown) => {
    console.error(`[TrendBackfill][error] ${message}`, metadata ?? '');
  },
};

function parseArgs(): BackfillArgs {
  const args: BackfillArgs = {};
  for (const raw of process.argv.slice(2)) {
    const [key, value] = raw.split('=');
    if (!value) continue;
    if (key === '--start') args.start = value;
    if (key === '--end') args.end = value;
    if (key === '--date') args.date = value;
  }
  return args;
}

function parseDate(value: string, label: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid ${label} "${value}". Expected format YYYY-MM-DD.`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Unable to parse ${label} "${value}".`);
  }
  return date;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function runBackfill() {
  const { start, end, date } = parseArgs();
  if (!start && !date) {
    throw new Error('Provide either --date=<YYYY-MM-DD> or --start=<YYYY-MM-DD> [--end=<YYYY-MM-DD>].');
  }

  const startDate = parseDate(start ?? date!, 'start/date');
  const endDate = end ? parseDate(end, 'end') : startDate;

  if (startDate > endDate) {
    throw new Error('Start date must be before or equal to end date.');
  }

  let current = new Date(startDate);
  while (current <= endDate) {
    const statDate = formatDate(current);
    console.log(`\n[TrendBackfill] Aggregating ${statDate} with trend scoring...`);
    await dailyChallengeAggregatorV2.aggregateForDate(statDate, {
      useTrendScoring: true,
      logger,
    });
    current.setUTCDate(current.getUTCDate() + 1);
  }

  console.log('\n[TrendBackfill] Completed trend multiplier backfill.');
}

runBackfill().catch((error) => {
  console.error('[TrendBackfill] Failed to complete backfill:', error);
  process.exit(1);
});

