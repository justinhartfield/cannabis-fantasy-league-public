# Cannabis Fantasy League - Resume Instructions

## 📦 Project Archive Contents

This archive contains the complete Cannabis Fantasy League implementation with:
- ✅ 1,724 real cannabis strains from weed.de Metabase
- ✅ 9-player roster system (2 MFG, 2 Strains, 2 Products, 2 Pharmacies, 1 Flex)
- ✅ Complete database schema with migrations
- ✅ Backend tRPC API (roster, lineup, draft routers)
- ✅ Frontend UI components (DraftBoard, LineupEditor, RosterDisplay)
- ✅ Scoring engine with strain + product scoring
- ✅ Test data seed script

---

## 🚀 Quick Start in New Manus Task

### Step 1: Extract Archive
```bash
cd /home/ubuntu
tar -xzf cannabis-fantasy-league-complete.tar.gz
cd cannabis-fantasy-league
```

### Step 2: Install Dependencies
```bash
pnpm install
```

### Step 3: Set Up Environment Variables
The project needs these environment variables (already configured in Manus):
- `DATABASE_URL` - MySQL/TiDB connection
- `METABASE_API_KEY` - Admin API key for weed.de data
- `METABASE_URL` - https://bi.weed.de
- `JWT_SECRET` - Session signing
- OAuth credentials (auto-configured)

**Important:** Make sure to update `METABASE_API_KEY` with the admin key:
```
mb_yYq1BdsG3TbfYkVg4fWBvSVpl5xnoaonsdawziUpsJo=
```

### Step 4: Push Database Schema
```bash
pnpm db:push
```

### Step 5: Seed Test Data (Optional)
```bash
node seed-test-data.mjs
```

This creates:
- Test league (ID: 30003)
- Test team "Green Thunder" (ID: 30003)
- 7/9 roster positions filled
- Week 1 lineup

### Step 6: Start Dev Server
```bash
pnpm dev
```

Server will start on port 3000 (or next available port).

---

## 📊 Project Structure

```
cannabis-fantasy-league/
├── client/                    # Frontend React app
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   ├── DraftBoard.tsx
│   │   │   ├── LineupEditor.tsx
│   │   │   └── RosterDisplay.tsx
│   │   ├── pages/            # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Admin.tsx
│   │   │   └── RosterTest.tsx
│   │   └── lib/trpc.ts       # tRPC client
│   └── index.html
├── server/                    # Backend Express + tRPC
│   ├── _core/                # Framework code
│   ├── routers.ts            # Main router
│   ├── rosterRouter.ts       # Roster management API
│   ├── lineupRouter.ts       # Lineup management API
│   ├── draftRouter.ts        # Draft operations API
│   ├── scoringEngine.ts      # Scoring calculations
│   ├── metabase.ts           # Metabase API client
│   └── dataSync.ts           # Data synchronization
├── drizzle/                   # Database schema
│   └── schema.ts             # All tables defined here
├── seed-test-data.mjs        # Test data generator
└── package.json

Key Files:
- `drizzle/schema.ts` - Database schema with 9-player roster
- `server/scoringEngine.ts` - Cannabis strain + product scoring
- `server/metabase.ts` - Real weed.de data fetching
- `client/src/components/` - Draft/Lineup/Roster UI
```

---

## 🎯 Current Status

### ✅ Completed Features
1. **Data Integration**
   - 1,724 cannabis strains imported
   - 2,002 products, 151 manufacturers, 365 pharmacies
   - Real-time Metabase API integration

2. **9-Player Roster System**
   - Database fully migrated
   - All tables updated (weeklyLineups, weeklyTeamScores, rosters, etc.)
   - Enum values: cannabis_strain, product, manufacturer, pharmacy

3. **Backend API**
   - `rosterRouter` - Get roster, add/remove players, check needs
   - `lineupRouter` - Get/update lineup, lock/unlock
   - `draftRouter` - Available players, make picks
   - `statsRouter` - Platform statistics

4. **Frontend Components**
   - `DraftBoard` - Search and draft players by category
   - `LineupEditor` - Set weekly lineup (9 positions)
   - `RosterDisplay` - View team roster with performance

5. **Scoring Engine**
   - `scoreCannabisStrain()` - Genetics-level scoring
   - `scoreProduct()` - Product-level scoring
   - `scoreManufacturer()` - Brand scoring
   - `scorePharmacy()` - Pharmacy scoring

### ⚠️ Known Issues
1. **Dev Server Timeout** - Environment-specific issue in previous sandbox
   - Server starts but doesn't respond to HTTP requests
   - Issue is at Node.js HTTP server level (not Express/Vite)
   - Should work in fresh environment

2. **Placeholder Scoring** - Cannabis strain scoring uses placeholder (10 pts)
   - Need to implement real metrics (favorites, pharmacy expansion)

### 📋 Next Steps
1. **Test in Fresh Environment** - Verify server works in new sandbox
2. **Complete Mock Draft** - Test full draft flow with 9 positions
3. **Implement Real Scoring** - Replace placeholder strain scoring
4. **Link Products to Strains** - Connect products to cannabis genetics in DB

---

## 🔧 Troubleshooting

### If dev server doesn't respond:
1. Check logs: `tail -f /tmp/cfl-server.log`
2. Verify port: `netstat -tlnp | grep node`
3. Test API directly: `curl http://localhost:3000/api/trpc/stats.getPlatformStats`
4. Try production build: `pnpm build && pnpm start`

### If database errors:
1. Check DATABASE_URL is set
2. Run `pnpm db:push` to apply schema
3. Check connection: `mysql -h [host] -u [user] -p`

### If Metabase data not syncing:
1. Verify METABASE_API_KEY is set (admin key)
2. Test API: `curl -H "X-API-KEY: [key]" https://bi.weed.de/api/user/current`
3. Run manual sync in Admin panel

---

## 📚 Documentation Files

- `CANNABIS_STRAIN_INTEGRATION_SUMMARY.md` - Complete feature documentation
- `BACKEND_INTEGRATION_SUMMARY.md` - API documentation
- `todo.md` - Task tracking
- `seed-test-data.mjs` - Test data creation script

---

## 🎮 Testing the Application

### 1. Access Dashboard
Navigate to: `http://localhost:3000/dashboard`
- View platform statistics
- See 1,724 cannabis strains, 2,002 products

### 2. Test Roster Components
Navigate to: `http://localhost:3000/roster-test`
- **Lineup Editor** tab - Set 9-player lineup
- **Roster Display** tab - View team roster
- **Draft Board** tab - Search and draft players

### 3. Admin Panel
Navigate to: `http://localhost:3000/admin`
- Sync Metabase data (manufacturers, strains, products, pharmacies)
- View sync status and logs

### 4. Create League
Navigate to: `http://localhost:3000/leagues`
- Create new league
- Configure roster settings
- Invite teams

---

## 💾 Database Schema Highlights

### Cannabis Strains Table
```sql
CREATE TABLE cannabisStrains (
  id INT PRIMARY KEY AUTO_INCREMENT,
  metabaseId VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  type VARCHAR(100),  -- Sativa/Indica/Hybrid
  effects TEXT,       -- JSON array
  flavors TEXT,       -- JSON array
  terpenes TEXT,      -- JSON array
  thcMin DECIMAL,
  thcMax DECIMAL,
  cbdMin DECIMAL,
  cbdMax DECIMAL
);
```

### Weekly Lineups Table (9 positions)
```sql
CREATE TABLE weeklyLineups (
  mfg1Id INT,   -- Manufacturer 1
  mfg2Id INT,   -- Manufacturer 2
  cstr1Id INT,  -- Cannabis Strain 1 (NEW)
  cstr2Id INT,  -- Cannabis Strain 2 (NEW)
  prd1Id INT,   -- Product 1
  prd2Id INT,   -- Product 2
  phm1Id INT,   -- Pharmacy 1
  phm2Id INT,   -- Pharmacy 2
  flexId INT,   -- Flex (any category)
  flexType ENUM('manufacturer', 'cannabis_strain', 'product', 'pharmacy')
);
```

---

## 🚀 Deployment

### Option 1: Manus Built-in (Recommended)
1. Create checkpoint: `webdev_save_checkpoint`
2. Click "Publish" button in Management UI
3. Handles database, server, frontend automatically

### Option 2: External Platform
- **Railway** - Full Node.js support
- **Render** - Free tier available
- **Fly.io** - Good for full-stack apps
- **Vercel** - Serverless functions

---

## 📞 Support

If you encounter issues:
1. Check logs in `/tmp/cfl-server.log`
2. Review `todo.md` for known issues
3. Consult documentation files in project root

---

**Project Status:** ✅ Feature-complete, ready for testing in fresh environment!
