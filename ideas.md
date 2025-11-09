# Cannabis Fantasy League - Design Concept

## Core Concept
A fantasy sports game for the German medical cannabis market, inspired by FotMob's clean, data-rich sports interface. Users draft teams of real manufacturers, strains, and pharmacies, then compete based on actual market performance from weed.de.

## Design Philosophy

### Visual Style (FotMob-Inspired)
- **Dark Theme First**: Professional dark background (#111827) with card-based layouts (#1F2937)
- **Cannabis Green Accent**: Emerald green (#10B981) as the primary brand color
- **Data-Rich Interface**: Charts, stats, and metrics prominently displayed
- **Card-Based Layout**: Clean separation of content with subtle shadows
- **Modern Typography**: Inter font family for clean readability

### Color Palette
```
Primary: #10B981 (Emerald Green)
Background: #111827 (Dark Gray)
Card Background: #1F2937 (Lighter Gray)
Text Primary: #F9FAFB (Off-White)
Text Secondary: #9CA3AF (Gray)
Success: #10B981 (Green)
Warning: #F59E0B (Amber)
Danger: #EF4444 (Red)
Gold Accent: #F59E0B (for Weekly Challenge mode)
```

### Layout Principles
1. **Three-Column Grid** (inspired by FotMob):
   - Left: Navigation sidebar (desktop only)
   - Center: Main content area
   - Right: Live scores, upcoming matchups, quick stats

2. **Mobile-First Responsive**:
   - Bottom tab navigation on mobile
   - Collapsible sidebar on tablet
   - Full three-column on desktop

3. **Card-Based Components**:
   - Player cards with stats
   - Matchup cards
   - League cards
   - Stat cards

### Key Pages

#### 1. Landing Page
- Hero section with gradient (emerald to dark gray)
- Two prominent CTAs: "Create Season League" and "Weekly Challenge"
- Feature cards highlighting real data, two modes, and competition

#### 2. Dashboard
- League overview cards
- Current matchup status
- Weekly challenge summary
- Quick action buttons

#### 3. Draft Room
- Split-screen layout
- Left: Draft board with completed picks
- Right: Available players with filters
- Bottom: My Team summary

#### 4. My Team (Roster)
- Position-grouped player cards
- Weekly points display
- Mini trend charts
- Lock indicator when lineup is set

#### 5. Matchup Page
- Head-to-head score comparison
- Position-by-position breakdown with horizontal bar charts
- Bonus/penalty section
- Live updates via WebSocket

### Data Visualization
- **Line Charts**: 7-day performance trends
- **Bar Charts**: Position-by-position matchup comparisons
- **Sparklines**: Mini trend indicators on player cards
- **Progress Bars**: Scoring progress, draft timer
- **Badges**: Achievements, bonuses, penalties

### Interactive Elements
- **Live Updates**: WebSocket for real-time score changes
- **Animations**: Smooth transitions, score counting animations
- **Hover States**: Detailed stats on hover
- **Drag & Drop**: Lineup management (future enhancement)

### Typography Hierarchy
```
H1: 2.5rem (40px) - Bold - Page titles
H2: 2rem (32px) - Bold - Section headers
H3: 1.5rem (24px) - Semibold - Card titles
Body: 1rem (16px) - Regular - Main content
Small: 0.875rem (14px) - Regular - Secondary info
Tiny: 0.75rem (12px) - Regular - Labels, timestamps
```

### Component Library (shadcn/ui)
- Button variants: default, outline, ghost, destructive
- Card with header, content, footer
- Dialog for modals
- Tabs for navigation
- Table for standings
- Badge for status indicators
- Toast for notifications

### Mobile Considerations
- Bottom navigation bar (5 tabs max)
- Swipeable cards
- Collapsible sections
- Touch-friendly buttons (min 44px height)
- Optimized charts for small screens

## Game Modes

### Season Mode
- Full 22-week season (18 regular + 4 playoffs)
- Snake draft system
- Weekly matchups
- Waiver wire & trading
- Championship bracket

### Weekly Challenge Mode
- Quick 3-5 round draft
- Single week competition
- Instant results
- Rematch option
- Lower commitment, faster gameplay

## Technical Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: TailwindCSS 4 + shadcn/ui
- **State**: TanStack Query + tRPC
- **Backend**: Express + tRPC
- **Database**: PostgreSQL (via Drizzle ORM)
- **Real-time**: WebSocket for live updates
- **Charts**: Recharts for data visualization

## Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode option
- Focus indicators

## Performance Targets
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Lighthouse Score > 90
- Bundle size < 500KB (gzipped)
