import { cn } from "@/lib/utils";
import { MolecularNode } from "./MolecularNode";
import { DraftPosition, CHALLENGE_DRAFT_ORDER, AssetType } from "./DraftFieldPlayer";

interface DraftedPlayer {
  id: number;
  name: string;
  imageUrl?: string | null;
  assetType: AssetType;
}

interface MolecularFieldProps {
  teamName: string;
  userName?: string | null;
  players: Partial<Record<DraftPosition, DraftedPlayer | null>>;
  currentDraftIndex?: number;
  isUserTeam?: boolean;
  isOnTheClock?: boolean;
  onPositionClick?: (position: DraftPosition) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MolecularField({
  teamName,
  userName,
  players,
  currentDraftIndex = -1,
  isUserTeam = false,
  isOnTheClock = false,
  onPositionClick,
  size = "md",
  className,
}: MolecularFieldProps) {
  const currentPosition = currentDraftIndex >= 0 && currentDraftIndex < CHALLENGE_DRAFT_ORDER.length
    ? CHALLENGE_DRAFT_ORDER[currentDraftIndex]
    : null;

  const filledCount = Object.values(players).filter(Boolean).length;

  const getPlayer = (position: DraftPosition) => {
    const player = players[position];
    if (!player) return null;
    return {
      id: player.id,
      name: player.name,
      imageUrl: player.imageUrl,
      assetType: player.assetType,
    };
  };

  const isPositionActive = (position: DraftPosition) => {
    return currentPosition === position;
  };

  // Layout Configuration (Coordinate System)
  // ViewBox 800x600
  const CX = 400;
  const CY = 300;
  const SPACING = 130; // Distance unit
  const Y_STRETCH = 1.1; // Vertical spacing multiplier

  const positions: Record<DraftPosition, { x: number; y: number }> = {
    // Center Nucleus
    GK: { x: CX, y: CY }, // Brand

    // Top (Manufacturers)
    ST1: { x: CX - SPACING * 0.8, y: CY - SPACING * Y_STRETCH },
    ST2: { x: CX + SPACING * 0.8, y: CY - SPACING * Y_STRETCH },

    // Bottom (Strains)
    CB1: { x: CX - SPACING * 0.8, y: CY + SPACING * Y_STRETCH },
    CB2: { x: CX + SPACING * 0.8, y: CY + SPACING * Y_STRETCH },

    // Left Branch (Product -> Pharmacy)
    CM1: { x: CX - SPACING * 1.5, y: CY }, // Product
    LW:  { x: CX - SPACING * 2.5, y: CY }, // Pharmacy

    // Right Branch (Product -> Pharmacy)
    CM2: { x: CX + SPACING * 1.5, y: CY }, // Product
    RW:  { x: CX + SPACING * 2.5, y: CY }, // Pharmacy

    // Top Flex
    FLEX: { x: CX, y: CY - SPACING * 2.2 * Y_STRETCH }
  };

  // Bonds definitions (connections between positions)
  const bonds: [DraftPosition, DraftPosition][] = [
    // Central Hub Connections
    ["GK", "ST1"], ["GK", "ST2"],
    ["GK", "CB1"], ["GK", "CB2"],
    ["GK", "CM1"], ["GK", "CM2"],
    
    // Outer Connections
    ["ST1", "ST2"], // Top link
    ["CB1", "CB2"], // Bottom link
    ["CM1", "LW"],  // Left chain
    ["CM2", "RW"],  // Right chain
    
    // Flex connections
    ["FLEX", "ST1"],
    ["FLEX", "ST2"],
  ];

  // Dimensions logic
  // We use a fixed viewBox but scale the container via CSS if needed, 
  // or we can adjust coordinates. 
  // Here we stick to fixed SVG coords and let the container handle responsive width.
  
  return (
    <div className={cn("flex flex-col w-full", className)}>
       {/* Team Header */}
       <div
        className={cn(
          "flex items-center justify-between px-4 py-3 rounded-t-xl border-b backdrop-blur-md z-10",
          isUserTeam
            ? "bg-gradient-to-r from-[#cfff4d]/20 via-[#1a1d29] to-[#cfff4d]/10 border-[#cfff4d]/30"
            : "bg-gradient-to-r from-[#ff6b6b]/20 via-[#1a1d29] to-[#ff6b6b]/10 border-[#ff6b6b]/30"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 shadow-[0_0_10px_rgba(0,0,0,0.5)]",
              isUserTeam
                ? "bg-[#cfff4d]/20 border-[#cfff4d] text-[#cfff4d]"
                : "bg-[#ff6b6b]/20 border-[#ff6b6b] text-[#ff6b6b]"
            )}
          >
            {teamName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-wide">{teamName}</div>
            {userName && (
              <div className="text-xs text-white/60 font-mono">@{userName}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-white/40 uppercase tracking-widest">Roster</span>
            <span className="text-lg font-bold text-white leading-none">
              {filledCount}<span className="text-white/30 text-sm">/10</span>
            </span>
          </div>
          {isOnTheClock && (
            <span className="ml-2 px-2 py-1 rounded-md bg-[#cfff4d] text-black text-[10px] font-bold uppercase animate-pulse shadow-[0_0_15px_rgba(207,255,77,0.6)]">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Molecular View Container */}
      <div className="relative bg-[#050508] rounded-b-xl overflow-hidden border-x border-b border-white/10 shadow-2xl">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1d29] via-[#0a0a0f] to-[#000000]" />
        <div className="absolute inset-0 opacity-20" 
             style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
        </div>
        
        {/* SVG Canvas */}
        <svg
          viewBox="0 0 800 750"
          className="w-full h-auto min-h-[500px]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
             <filter id="glow-line" x="-20%" y="-20%" width="140%" height="140%">
               <feGaussianBlur stdDeviation="2" result="blur" />
               <feComposite in="SourceGraphic" in2="blur" operator="over" />
             </filter>
          </defs>

          {/* Bonds (Lines) */}
          {bonds.map(([start, end], idx) => {
            const p1 = positions[start];
            const p2 = positions[end];
            return (
              <line
                key={`${start}-${end}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="animate-pulse"
                style={{ animationDuration: `${3 + idx % 2}s` }}
              />
            );
          })}

          {/* Active Connections Highlights (optional logic could go here) */}
          
          {/* Nodes */}
          {Object.entries(positions).map(([posKey, coords]) => {
            const pos = posKey as DraftPosition;
            const player = getPlayer(pos);
            const active = isPositionActive(pos);
            
            return (
              <MolecularNode
                key={pos}
                position={pos}
                player={player}
                isActive={active}
                isMyTurn={isOnTheClock}
                onClick={onPositionClick ? () => onPositionClick(pos) : undefined}
                x={coords.x}
                y={coords.y}
                size={size}
              />
            );
          })}
        </svg>

        {/* Overlay Vignette */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/50 via-transparent to-black/20" />
      </div>
    </div>
  );
}

