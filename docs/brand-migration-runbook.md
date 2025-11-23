# Manufacturers → Brands Migration Runbook

This runbook describes how to execute the `20251122_move_manufacturers_to_brands.sql` migration, validate the data model changes, and roll them out safely across environments.

---

## 1. Prerequisites
- ✅ All 117 reclassified entities have purple brand logos on `https://cfls.b-cdn.net/brands/`.
- ✅ Application services are deployed with the brand migration helper (`shared/brandMigration.ts`) so that data-sync scripts no longer reinsert these names into `manufacturers`.
- 📦 Ensure a fresh logical backup exists for every environment before running the migration:  
  `pg_dump $DATABASE_URL --format=custom --file=backups/pre-brand-migration.dump`
- 📋 Check for lineup conflicts ahead of time (see Section 4) to avoid migration aborts.

---

## 2. Migration Script Overview
File: `migrations/20251122_move_manufacturers_to_brands.sql`

Key actions performed inside a single transaction:
1. Loads the 117 IDs into a temporary table and snapshots the current manufacturer rows.
2. Deletes all manufacturer stats (daily/weekly/challenge) for those IDs to satisfy FK constraints.
3. Removes any pre-existing brand stats that would conflict, then inserts new `brands` rows using the same IDs and the `/brands/` CDN path.
4. Reassigns `products.brandId`, clears `products.manufacturerId`, and nulls `strains.manufacturerId`.
5. Converts every roster-style table (`rosters`, `challengeRosters`, `draftPicks`, `waiverClaims`, `scoringBreakdowns`, `dailyScoringBreakdowns`) so the affected assets are tagged as `brand`.
6. Migrates `weeklyLineups` data:  
   - Moves qualifying IDs out of `mfg1Id` / `mfg2Id` into `brd1Id` when empty.  
   - Falls back to the flex slot where possible.  
   - Aborts if any manufacturer slot still references a migrating ID after the automated step (requires manual cleanup).
7. Updates `dailyMatchups` so that any matchup where both entries are migrating IDs is reclassified as `brand`, and aborts if mixed pairings remain.
8. Deletes the manufacturer rows and realigns the `brands_id_seq`.

The migration is intentionally defensive: it raises exceptions if lineup or matchup conflicts remain so that no dangling references survive.

---

## 3. Staging Rollout
1. **Dry-run lineup checks**
   ```sql
   SELECT id, teamId, year, week, mfg1Id, mfg2Id
   FROM "weeklyLineups"
   WHERE mfg1Id = ANY(ARRAY[...ids...]) OR mfg2Id = ANY(ARRAY[...ids...]);
   ```
   Reassign these rows manually (typically moving the asset to the brand or flex slot) until the query returns 0 rows.
2. **Apply migration**
   ```bash
   psql $STAGING_DATABASE_URL -f migrations/20251122_move_manufacturers_to_brands.sql
   ```
3. **Smoke tests**
   - Run `pnpm test` or the relevant CI suite.
   - Validate draft board filters: manufacturers list should no longer include the 117 entries, brands list should.
   - Load sample product detail pages to confirm `brandId` is populated and logos use the purple CDN path.
   - Re-run `scripts/sync-real-daily-stats*.ts` in dry-run mode to confirm the new helper skips those names instead of re-inserting them.
4. **Data validation queries**
   ```sql
   SELECT COUNT(*) FROM manufacturers WHERE id = ANY(ARRAY[...]); -- expect 0
   SELECT COUNT(*) FROM brands WHERE id = ANY(ARRAY[...]);        -- expect 117
   SELECT COUNT(*) FROM products WHERE manufacturerId IS NOT NULL  -- sanity check
   ```

---

## 4. Conflict Resolution Checklist
The migration aborts if either of the following queries returns rows:

### Weekly lineup conflicts
```sql
SELECT id, teamId, year, week, mfg1Id, mfg2Id
FROM "weeklyLineups"
WHERE mfg1Id = ANY(ARRAY[...]) OR mfg2Id = ANY(ARRAY[...]);
```
**Fix**: Move the listed IDs into `brd1Id` (or `flexId`/`flexType = 'brand'`). If both brand and flex slots are occupied, free one slot first or clone the team’s lineup for review.

### Mixed manufacturer matchups
```sql
SELECT id, entityAId, entityBId
FROM "dailyMatchups"
WHERE entityType = 'manufacturer'
  AND (
    entityAId = ANY(ARRAY[...]) AND entityBId <> ALL(ARRAY[...]) OR
    entityBId = ANY(ARRAY[...]) AND entityAId <> ALL(ARRAY[...])
  );
```
**Fix**: Regenerate or delete the offending matchups so that both participants share the same asset type.

---

## 5. Production Deployment Plan
1. **Prepare**
   - Freeze drafts/lineup changes during the migration window (few minutes).
   - Confirm backups and staging validation logs.
2. **Deploy code first**
   - Ship the helpers + data-sync changes so no process can reinsert the deprecated manufacturers.
3. **Run migration**
   ```bash
   psql $PRODUCTION_DATABASE_URL -f migrations/20251122_move_manufacturers_to_brands.sql
   ```
   Monitor for any raised exceptions; if the script aborts, resolve conflicts and rerun.
4. **Post checks**
   - Hit `/admin` stats widget (brands + manufacturers counts should reflect the new split).
   - Validate a random sampling of drafts, rosters, and leaderboards.
   - Re-run the daily stats sync job to populate brand stats if desired.

---

## 6. Rollback Strategy
- If issues arise **before** the script commits (e.g., conflict exception), the transaction auto-rolls back—no manual action required.
- If the script committed successfully but regressions appear:
  1. Restore the pre-migration backup into a new database.
  2. Point staging or a shadow deployment to that snapshot to extract any missing lineup assignments.
  3. If a full rollback is necessary, restore the backup over production and redeploy the previous application build (the helper files are backwards-compatible but will simply skip the brand IDs).

---

## 7. Operational Notes
- The helper `shared/brandMigration.ts` is imported by every data-sync path (v1/v2 services and standalone scripts). If you add a new ingestion entry point, import the helper there as well.
- The SQL migration enforces invariants via `DO $$ ... $$;` blocks. If you need to re-run after resolving conflicts, simply execute the file again—temp tables ensure a clean restart.
- Keep the `brands_to_collect.json` source (in `/home/ubuntu/…`) synced with this repo to simplify future adjustments.

