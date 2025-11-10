# Cannabis Fantasy League - Database Schema Documentation

## Overview

The Cannabis Fantasy League database supports two distinct game modes:
1. **Season Mode**: Year-long fantasy leagues with drafts, weekly matchups, playoffs
2. **Weekly Challenge Mode**: Quick single-week competitions with simplified drafts

All tables use MySQL/TiDB with Drizzle ORM for type-safe database access.

## Table Categories

### 1. Core User Table
- `users` - Authentication and user profiles

### 2. Reference Data (Synced from Metabase)
- `manufacturers` - Cannabis product manufacturers
- `strains` - Cannabis strain products
- `pharmacies` - Cannabis dispensaries

### 3. Historical Data (Weekly Snapshots)
- `manufacturerWeeklyStats` - Weekly manufacturer performance
- `strainWeeklyStats` - Weekly strain performance
- `pharmacyWeeklyStats` - Weekly pharmacy performance

### 4. Season Mode Tables
- `leagues` - Fantasy league configurations
- `teams` - Teams within leagues
- `rosters` - Current asset ownership
- `weeklyLineups` - Locked weekly lineups
- `matchups` - Head-to-head weekly matchups
- `weeklyTeamScores` - Detailed weekly scoring
- `scoringBreakdowns` - Transparent point attribution
- `draftPicks` - Draft history
- `trades` - Player trades
- `waiverClaims` - Free agent acquisitions

### 5. Weekly Challenge Mode Tables
- `challenges` - Single-week competitions
- `challengeParticipants` - Users in challenges
- `challengeRosters` - Challenge draft picks

### 6. Social & Gamification
- `achievements` - User badges and milestones
- `leagueMessages` - League message boards

---

## Detailed Table Specifications

### Reference Data Tables

#### manufacturers
Stores cannabis product manufacturers synced from weed.de Metabase.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| name | VARCHAR(255) | Manufacturer name (unique) |
| currentRank | INT | 1-day ranking |
| weeklyRank | INT | 7-day ranking |
| monthlyRank | INT | 30-day ranking |
| quarterlyRank | INT | 90-day ranking |
| productCount | INT | Number of products |
| createdAt | TIMESTAMP | Record creation time |
| updatedAt | TIMESTAMP | Last update time |

**Data Source**: Metabase "Manufacturer Report" dashboard

**Update Frequency**: Hourly

**Indexes**: 
- `name_idx` on `name`

---

#### strains
Stores cannabis strain products synced from weed.de Metabase.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| name | VARCHAR(255) | Strain name |
| manufacturerId | INT | Foreign key to manufacturers |
| manufacturerName | VARCHAR(255) | Denormalized manufacturer name |
| favoriteCount | INT | Number of user favorites |
| pharmacyCount | INT | Number of pharmacies stocking |
| avgPriceCents | INT | Average price in cents |
| minPriceCents | INT | Minimum price across pharmacies |
| maxPriceCents | INT | Maximum price across pharmacies |
| priceCategory | ENUM | excellent, below_average, average, above_average, expensive |
| thcContent | VARCHAR(50) | THC percentage |
| cbdContent | VARCHAR(50) | CBD percentage |
| genetics | ENUM | sativa, indica, hybrid |
| createdAt | TIMESTAMP | Record creation time |
| updatedAt | TIMESTAMP | Last update time |

**Data Source**: Metabase "Product Listing" dashboard

**Update Frequency**: Hourly

**Indexes**:
- `name_idx` on `name`
- `manufacturer_idx` on `manufacturerId`

---

#### pharmacies
Stores cannabis dispensaries synced from weed.de Metabase.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| name | VARCHAR(255) | Pharmacy name (unique) |
| city | VARCHAR(100) | City location |
| state | VARCHAR(100) | State location |
| productCount | INT | Number of products in stock |
| weeklyRevenueCents | INT | Weekly revenue in cents |
| weeklyOrderCount | INT | Number of orders this week |
| avgOrderSizeGrams | INT | Average order size in grams |
| customerRetentionRate | INT | Retention rate as percentage (0-100) |
| appUsageRate | INT | Percentage of orders via app (0-100) |
| createdAt | TIMESTAMP | Record creation time |
| updatedAt | TIMESTAMP | Last update time |

**Data Source**: Metabase "Pharmacy Insights" dashboard

**Update Frequency**: Hourly

**Indexes**:
- `name_idx` on `name`

---

### Historical Data Tables

#### manufacturerWeeklyStats
Weekly snapshot of manufacturer performance for scoring calculations.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| manufacturerId | INT | Foreign key to manufacturers |
| year | INT | Year (e.g., 2025) |
| week | INT | Week number (1-52) |
| salesVolumeGrams | INT | Total sales volume in grams |
| growthRatePercent | INT | Growth rate as percentage |
| marketShareRank | INT | Market ranking |
| rankChange | INT | Change in rank (+ = improvement) |
| productCount | INT | Number of products |
| totalPoints | INT | Calculated fantasy points |
| createdAt | TIMESTAMP | Snapshot creation time |

**Unique Constraint**: `manufacturer_week_idx` on (manufacturerId, year, week)

**Indexes**:
- `week_idx` on (year, week)

---

#### strainWeeklyStats
Weekly snapshot of strain performance for scoring calculations.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| strainId | INT | Foreign key to strains |
| year | INT | Year |
| week | INT | Week number |
| favoriteCount | INT | Total favorites |
| favoriteGrowth | INT | New favorites this week |
| pharmacyCount | INT | Number of pharmacies stocking |
| pharmacyExpansion | INT | New pharmacies this week |
| avgPriceCents | INT | Average price in cents |
| priceStability | INT | Stability score (0-100) |
| orderVolumeGrams | INT | Total order volume in grams |
| totalPoints | INT | Calculated fantasy points |
| createdAt | TIMESTAMP | Snapshot creation time |

**Unique Constraint**: `strain_week_idx` on (strainId, year, week)

**Indexes**:
- `week_idx` on (year, week)

---

#### pharmacyWeeklyStats
Weekly snapshot of pharmacy performance for scoring calculations.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| pharmacyId | INT | Foreign key to pharmacies |
| year | INT | Year |
| week | INT | Week number |
| revenueCents | INT | Weekly revenue in cents |
| orderCount | INT | Number of orders |
| avgOrderSizeGrams | INT | Average order size in grams |
| customerRetentionRate | INT | Retention rate (0-100) |
| productVariety | INT | Number of different products |
| appUsageRate | INT | App usage percentage (0-100) |
| growthRatePercent | INT | Growth rate as percentage |
| totalPoints | INT | Calculated fantasy points |
| createdAt | TIMESTAMP | Snapshot creation time |

**Unique Constraint**: `pharmacy_week_idx` on (pharmacyId, year, week)

**Indexes**:
- `week_idx` on (year, week)

---

### Season Mode Tables

#### leagues
Fantasy league configurations and settings.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| name | VARCHAR(255) | League name |
| commissionerUserId | INT | Commissioner user ID |
| teamCount | INT | Number of teams (default: 10) |
| draftType | ENUM | snake, linear |
| scoringType | ENUM | standard, custom |
| playoffTeams | INT | Number of playoff teams (default: 6) |
| seasonYear | INT | Season year |
| currentWeek | INT | Current week number |
| status | ENUM | draft, active, playoffs, completed |
| draftDate | TIMESTAMP | Scheduled draft date |
| seasonStartDate | TIMESTAMP | Season start date |
| playoffStartWeek | INT | Week playoffs begin (default: 19) |
| createdAt | TIMESTAMP | League creation time |
| updatedAt | TIMESTAMP | Last update time |

---

#### teams
Fantasy teams within leagues.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| leagueId | INT | Foreign key to leagues |
| userId | INT | Foreign key to users |
| name | VARCHAR(255) | Team name |
| draftPosition | INT | Position in draft order (1-based) |
| waiverPriority | INT | Current waiver priority |
| faabBudget | INT | Free Agent Acquisition Budget (default: 100) |
| wins | INT | Season wins |
| losses | INT | Season losses |
| ties | INT | Season ties |
| pointsFor | INT | Total points scored |
| pointsAgainst | INT | Total points allowed |
| createdAt | TIMESTAMP | Team creation time |
| updatedAt | TIMESTAMP | Last update time |

**Unique Constraint**: `league_user_idx` on (leagueId, userId)

---

#### rosters
Current asset ownership for teams.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| teamId | INT | Foreign key to teams |
| assetType | ENUM | manufacturer, strain, pharmacy |
| assetId | INT | ID of the asset |
| acquiredWeek | INT | Week acquired |
| acquiredVia | ENUM | draft, waiver, trade, free_agent |
| createdAt | TIMESTAMP | Acquisition time |

**Unique Constraint**: `team_asset_idx` on (teamId, assetType, assetId)

---

#### weeklyLineups
Locked weekly lineups for scoring.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| teamId | INT | Foreign key to teams |
| year | INT | Year |
| week | INT | Week number |
| mfg1Id | INT | Manufacturer 1 asset ID |
| mfg2Id | INT | Manufacturer 2 asset ID |
| str1Id | INT | Strain 1 asset ID |
| str2Id | INT | Strain 2 asset ID |
| str3Id | INT | Strain 3 asset ID |
| str4Id | INT | Strain 4 asset ID |
| phm1Id | INT | Pharmacy 1 asset ID |
| phm2Id | INT | Pharmacy 2 asset ID |
| flexId | INT | FLEX position asset ID |
| flexType | ENUM | manufacturer, strain, pharmacy |
| isLocked | BOOLEAN | Whether lineup is locked |
| lockedAt | TIMESTAMP | Time lineup was locked |
| createdAt | TIMESTAMP | Lineup creation time |
| updatedAt | TIMESTAMP | Last update time |

**Unique Constraint**: `team_week_idx` on (teamId, year, week)

---

#### matchups
Head-to-head weekly matchups.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| leagueId | INT | Foreign key to leagues |
| year | INT | Year |
| week | INT | Week number |
| team1Id | INT | First team ID |
| team2Id | INT | Second team ID |
| team1Score | INT | First team's score |
| team2Score | INT | Second team's score |
| winnerId | INT | Winning team ID (NULL for tie) |
| status | ENUM | scheduled, in_progress, final |
| createdAt | TIMESTAMP | Matchup creation time |
| updatedAt | TIMESTAMP | Last update time |

**Indexes**:
- `league_week_idx` on (leagueId, year, week)

---

#### weeklyTeamScores
Detailed weekly scoring breakdown.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| teamId | INT | Foreign key to teams |
| year | INT | Year |
| week | INT | Week number |
| mfg1Points | INT | Manufacturer 1 points |
| mfg2Points | INT | Manufacturer 2 points |
| str1Points | INT | Strain 1 points |
| str2Points | INT | Strain 2 points |
| str3Points | INT | Strain 3 points |
| str4Points | INT | Strain 4 points |
| phm1Points | INT | Pharmacy 1 points |
| phm2Points | INT | Pharmacy 2 points |
| flexPoints | INT | FLEX position points |
| bonusPoints | INT | Total bonus points |
| penaltyPoints | INT | Total penalty points |
| totalPoints | INT | Final total points |
| createdAt | TIMESTAMP | Score calculation time |

**Unique Constraint**: `team_week_idx` on (teamId, year, week)

---

#### scoringBreakdowns
Transparent point attribution with detailed JSON.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| weeklyTeamScoreId | INT | Foreign key to weeklyTeamScores |
| assetType | ENUM | manufacturer, strain, pharmacy |
| assetId | INT | Asset ID |
| position | VARCHAR(20) | Position (e.g., "MFG1", "STR2") |
| breakdown | JSON | Detailed scoring components |
| totalPoints | INT | Total points for this asset |
| createdAt | TIMESTAMP | Breakdown creation time |

**JSON Structure Example**:
```json
{
  "assetName": "Remexian Pharma",
  "components": [
    {"category": "Sales Volume", "value": 3422, "points": 34.22},
    {"category": "Growth Rate", "value": 59, "points": 29.50},
    {"category": "Market Share Gain", "value": 3, "points": 30.00},
    {"category": "Top Rank Bonus", "value": 1, "points": 25.00},
    {"category": "Product Diversity", "value": 45, "points": 90.00},
    {"category": "Consistency Bonus", "value": 1, "points": 15.00}
  ],
  "subtotal": 223.72,
  "bonuses": [],
  "penalties": [],
  "total": 223.72
}
```

---

### Weekly Challenge Mode Tables

#### challenges
Single-week competitions.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| name | VARCHAR(255) | Challenge name |
| creatorUserId | INT | Creator user ID |
| year | INT | Year |
| week | INT | Week number |
| maxParticipants | INT | Maximum participants (default: 8) |
| draftRounds | INT | Number of draft rounds (default: 5) |
| status | ENUM | open, drafting, active, completed |
| draftStartTime | TIMESTAMP | When draft begins |
| createdAt | TIMESTAMP | Challenge creation time |
| updatedAt | TIMESTAMP | Last update time |

---

#### challengeParticipants
Users participating in challenges.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| challengeId | INT | Foreign key to challenges |
| userId | INT | Foreign key to users |
| draftPosition | INT | Draft position (assigned at start) |
| finalScore | INT | Final score for the week |
| finalRank | INT | Final ranking (1 = winner) |
| joinedAt | TIMESTAMP | Join time |

**Unique Constraint**: `challenge_user_idx` on (challengeId, userId)

---

#### challengeRosters
Assets picked in challenge drafts.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| challengeId | INT | Foreign key to challenges |
| userId | INT | Foreign key to users |
| assetType | ENUM | manufacturer, strain, pharmacy |
| assetId | INT | Asset ID |
| draftRound | INT | Round picked |
| draftPick | INT | Overall pick number |
| points | INT | Points scored by this asset |
| createdAt | TIMESTAMP | Pick time |

**Unique Constraint**: `challenge_user_asset_idx` on (challengeId, userId, assetType, assetId)

---

## Data Flow

### Hourly Sync (Metabase → Reference Tables)
```
Metabase API → MetabaseClient → manufacturers/strains/pharmacies tables
```

### Weekly Snapshot (Reference → Historical)
```
manufacturers → manufacturerWeeklyStats
strains → strainWeeklyStats
pharmacies → pharmacyWeeklyStats
```

### Scoring Calculation
```
weeklyLineups + historical stats → ScoringEngine → weeklyTeamScores + scoringBreakdowns
```

### Matchup Resolution
```
weeklyTeamScores → matchups (update scores and winnerId) → teams (update wins/losses)
```

---

## Indexing Strategy

### Primary Indexes
- All tables have auto-incrementing INT primary keys

### Foreign Key Indexes
- `manufacturers.name_idx` - Fast manufacturer lookups
- `strains.name_idx`, `strains.manufacturer_idx` - Fast strain searches
- `pharmacies.name_idx` - Fast pharmacy lookups

### Composite Indexes
- `leagueMessages.league_time_idx` - Efficient message board queries
- `matchups.league_week_idx` - Fast matchup lookups by league and week

### Unique Constraints
- Prevent duplicate weekly stats: `manufacturer_week_idx`, `strain_week_idx`, `pharmacy_week_idx`
- Prevent duplicate lineups: `team_week_idx`
- Prevent duplicate rosters: `team_asset_idx`
- Prevent duplicate participants: `league_user_idx`, `challenge_user_idx`

---

## Data Types & Conventions

### Currency
- All prices/revenue stored as **integers in cents**
- Example: $6.48 = 648 cents
- Avoids floating-point precision issues

### Percentages
- Stored as **integers** (0-100)
- Example: 85% = 85

### Scoring
- All points stored as **integers**
- Allows exact calculations without rounding errors

### Timestamps
- All timestamps use MySQL `TIMESTAMP` type
- Automatically managed with `defaultNow()` and `onUpdateNow()`

### Enums
- Used for fixed-value fields (status, type, category)
- Enforces data integrity at database level

### JSON Fields
- `scoringBreakdowns.breakdown` - Detailed scoring components
- `trades.team1Assets`, `trades.team2Assets` - Trade details
- Allows flexible data structures without schema changes

---

## Migration Strategy

### Initial Setup
```bash
pnpm db:push
```

### Adding New Tables
1. Add table definition to `drizzle/schema.ts`
2. Run `pnpm db:push` to generate and apply migration

### Modifying Existing Tables
1. Update table definition in `drizzle/schema.ts`
2. Run `pnpm db:push`
3. Drizzle Kit will generate ALTER TABLE statements

### Data Seeding
- Use `server/db.ts` helper functions
- Create seed scripts for test data
- Populate reference tables from Metabase on first sync

---

## Performance Considerations

### Query Optimization
- Use indexes for frequently queried columns
- Denormalize where appropriate (e.g., `manufacturerName` in strains)
- Batch inserts for weekly snapshots

### Caching Strategy
- Redis cache for Metabase API responses (5-min TTL)
- Cache current week's scores for live updates
- Invalidate cache on score recalculation

### Scaling
- Partition historical tables by year if needed
- Archive completed seasons to separate tables
- Use read replicas for analytics queries

---

## Security

### Access Control
- All database access via tRPC procedures
- User role enforcement at procedure level
- Commissioner-only operations protected

### Data Validation
- Drizzle ORM provides type safety
- Enum constraints prevent invalid values
- Unique constraints prevent duplicates

### Sensitive Data
- No PII beyond email (optional)
- OAuth tokens never stored in database
- Session management via JWT cookies

---

## Backup & Recovery

### Automated Backups
- Daily full backups
- Transaction log backups every hour
- Retention: 30 days

### Point-in-Time Recovery
- Restore to any point within retention period
- Test restores monthly

### Disaster Recovery
- Geographic replication
- RTO: 1 hour
- RPO: 15 minutes
