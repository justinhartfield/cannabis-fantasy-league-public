import process from 'node:process';

type TeamScoreRow = {
  teamId: number;
  totalPoints: number;
  bonusPoints: number;
  mfg1Points: number;
  mfg2Points: number;
  cstr1Points: number;
  cstr2Points: number;
  prd1Points: number;
  prd2Points: number;
  phm1Points: number;
  phm2Points: number;
  brd1Points: number;
  flexPoints: number;
};

type SimulationArgs = {
  leagueId?: number;
  year: number;
  startWeek: number;
  endWeek: number;
  validate: boolean;
  mock: boolean;
};

const parseArgs = (): SimulationArgs => {
  const args = process.argv.slice(2);
  const parsed: SimulationArgs = {
    year: new Date().getUTCFullYear(),
    startWeek: 1,
    endWeek: 18,
    validate: false,
    mock: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--leagueId' && args[i + 1]) {
      parsed.leagueId = Number(args[++i]);
    } else if (arg === '--year' && args[i + 1]) {
      parsed.year = Number(args[++i]);
    } else if (arg === '--startWeek' && args[i + 1]) {
      parsed.startWeek = Number(args[++i]);
    } else if (arg === '--endWeek' && args[i + 1]) {
      parsed.endWeek = Number(args[++i]);
    } else if (arg === '--validate') {
      parsed.validate = true;
    } else if (arg === '--mock') {
      parsed.mock = true;
    }
  }

  return parsed;
};

const sampleData: TeamScoreRow[] = [
  {
    teamId: 1,
    totalPoints: 620,
    bonusPoints: 70,
    mfg1Points: 66,
    mfg2Points: 64,
    cstr1Points: 62,
    cstr2Points: 60,
    prd1Points: 58,
    prd2Points: 56,
    phm1Points: 64,
    phm2Points: 62,
    brd1Points: 58,
    flexPoints: 60,
  },
  {
    teamId: 2,
    totalPoints: 610,
    bonusPoints: 65,
    mfg1Points: 64,
    mfg2Points: 62,
    cstr1Points: 60,
    cstr2Points: 58,
    prd1Points: 56,
    prd2Points: 54,
    phm1Points: 63,
    phm2Points: 61,
    brd1Points: 57,
    flexPoints: 60,
  },
];

const computeAverage = (values: number[]) =>
  values.length ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;

const computeStdDev = (values: number[]) => {
  if (!values.length) return 0;
  const mean = computeAverage(values);
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

const aggregateStats = (rows: TeamScoreRow[]) => {
  const teamTotals = rows.map((row) => row.totalPoints);
  const mean = computeAverage(teamTotals);
  const stdDev = computeStdDev(teamTotals);

  const bonusShare =
    rows.reduce((sum, row) => sum + row.bonusPoints, 0) /
    Math.max(1, rows.reduce((sum, row) => sum + row.totalPoints, 0));

  const positionKeys: Array<keyof TeamScoreRow> = [
    'mfg1Points',
    'mfg2Points',
    'cstr1Points',
    'cstr2Points',
    'prd1Points',
    'prd2Points',
    'phm1Points',
    'phm2Points',
    'brd1Points',
    'flexPoints',
  ];

  const positionAverages = positionKeys.map((key) =>
    computeAverage(rows.map((row) => row[key] ?? 0))
  );

  return {
    sampleSize: rows.length,
    mean,
    stdDev,
    bonusShare,
    positionAverages,
  };
};

const validateTargets = (stats: ReturnType<typeof aggregateStats>) => {
  const results: string[] = [];
  if (stats.mean < 500 || stats.mean > 750) {
    results.push(`Average score ${stats.mean.toFixed(1)} outside 500-750 window`);
  }
  if (stats.stdDev > 140) {
    results.push(`Std dev ${stats.stdDev.toFixed(1)} exceeds 140`);
  }
  if (stats.bonusShare < 0.1 || stats.bonusShare > 0.2) {
    results.push(`Bonus share ${(stats.bonusShare * 100).toFixed(1)}% outside 10-20% range`);
  }
  const maxVariance = Math.max(...stats.positionAverages) - Math.min(...stats.positionAverages);
  if (maxVariance > 15) {
    results.push('Position averages differ by more than 15 pts');
  }
  return results;
};

async function fetchScores(args: SimulationArgs): Promise<TeamScoreRow[]> {
  if (args.mock) {
    return sampleData;
  }

  const [{ weeklyTeamScores }, { getDb }] = await Promise.all([
    import('../drizzle/schema'),
    import('../server/db'),
  ]);
  const db = await getDb();
  if (!db) {
    console.warn('[scoring-simulation] Database unavailable, falling back to mock data');
    return sampleData;
  }

  const { and, between, eq } = await import('drizzle-orm');

  const rows = await db
    .select({
      teamId: weeklyTeamScores.teamId,
      totalPoints: weeklyTeamScores.totalPoints,
      bonusPoints: weeklyTeamScores.bonusPoints,
      mfg1Points: weeklyTeamScores.mfg1Points,
      mfg2Points: weeklyTeamScores.mfg2Points,
      cstr1Points: weeklyTeamScores.cstr1Points,
      cstr2Points: weeklyTeamScores.cstr2Points,
      prd1Points: weeklyTeamScores.prd1Points,
      prd2Points: weeklyTeamScores.prd2Points,
      phm1Points: weeklyTeamScores.phm1Points,
      phm2Points: weeklyTeamScores.phm2Points,
      brd1Points: weeklyTeamScores.brd1Points,
      flexPoints: weeklyTeamScores.flexPoints,
      year: weeklyTeamScores.year,
      week: weeklyTeamScores.week,
    })
    .from(weeklyTeamScores)
    .where(
      and(
        eq(weeklyTeamScores.year, args.year),
        between(weeklyTeamScores.week, args.startWeek, args.endWeek)
      )
    );

  if (!rows.length) {
    console.warn('[scoring-simulation] No weeklyTeamScores rows found, using mock data');
    return sampleData;
  }

  return rows;
}

async function main() {
  const args = parseArgs();
  const rows = await fetchScores(args);
  const stats = aggregateStats(rows);

  console.log('--- Scoring Simulation ---');
  console.log(`Samples: ${stats.sampleSize}`);
  console.log(`Average team score: ${stats.mean.toFixed(1)} pts`);
  console.log(`Std dev: ${stats.stdDev.toFixed(1)} pts`);
  console.log(`Bonus share: ${(stats.bonusShare * 100).toFixed(1)}%`);
  console.log(
    `Position averages: ${stats.positionAverages.map((val) => val.toFixed(1)).join(', ')}`
  );

  if (args.validate) {
    const issues = validateTargets(stats);
    if (issues.length) {
      console.error('[scoring-simulation] Validation issues:');
      issues.forEach((issue) => console.error(`- ${issue}`));
      process.exitCode = 1;
    } else {
      console.log('[scoring-simulation] Validation checks passed ✅');
    }
  }
}

main().catch((error) => {
  console.error('[scoring-simulation] Failed to run simulation', error);
  process.exitCode = 1;
});

