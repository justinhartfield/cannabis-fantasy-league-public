# Cannabis Fantasy League - Quick Start Guide

## Running the Application

### Development Server

```bash
# Start the server
npx tsx server/_core/index.ts

# Server will start on port 3000 (or 3001 if 3000 is busy)
# Access at: http://localhost:3000
```

### Services Running

When the server starts, you'll see these confirmations:

```
[OAuth] Initialized with baseURL: http://localhost:3000
[EmailService] SendGrid initialized
[Vite] Vite server created successfully
Server running on http://localhost:3000/
[WebSocket] Server initialized
[ScoringScheduler] Started - will run every Monday at 00:00
```

## Preview URL

**Live Preview:** https://3001-iyvbiu2ym4ic9pjtu17go-b6ac284f.manusvm.computer

## Key Features

### 1. Dashboard
- View platform statistics
- See your leagues
- Create new leagues or challenges

### 2. League Management
- View league details
- Manage teams
- Invite friends
- Commissioner actions

### 3. Draft System
- Live draft board
- Real-time updates via WebSocket
- Draft timer with auto-pick
- Player search and filtering
- Roster progress tracking

### 4. Matchups & Standings
- Weekly matchups
- Season standings
- Playoff brackets

## Testing Accounts

**Current User:** Draft User 1  
**Leagues:** 
- End-to-End Test League
- Draft Test League (4 teams)

## Database

**Platform Data:**
- 151 Manufacturers
- 1730 Cannabis Strains
- 2014 Products
- 365 Pharmacies

## Recent Fixes (Nov 10, 2025)

✅ Fixed Vite path resolution for tsx execution  
✅ Updated routing to use singular /league paths  
✅ Fixed imports (wouter instead of react-router-dom)  
✅ Fixed Toaster import (sonner)  
✅ Fixed undefined teamName in Draft page  
✅ All pages now load correctly

## Next Steps for Production

1. Test multi-user draft with live timer
2. Verify SendGrid email sending
3. Test automatic scoring scheduler
4. Create production build
5. Performance testing
6. Add error monitoring

## Support

**Repository:** https://github.com/justinhartfield/cannabis-fantasy-league  
**Report:** See DEPLOYMENT_TEST_REPORT.md for detailed test results
