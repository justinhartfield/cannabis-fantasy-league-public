import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { 
  DraftPosition, 
  AssetType, 
  POSITION_ASSET_MAP, 
  POSITION_COLORS, 
  POSITION_LABELS, 
  POSITION_CODES,
  ASSET_TYPE_LABELS 
} from "./DraftFieldPlayer";

interface MolecularNodeProps {
  position: DraftPosition;
  player?: {
    id: number;
    name: string;
    imageUrl?: string | null;
    assetType?: AssetType;
  } | null;
  isActive?: boolean;
  isMyTurn?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  x: number;
  y: number;
}

/**
 * MolecularNode - Hexagonal "atom" node for the molecular draft view
 */
export function MolecularNode({
  position,
  player,
  isActive = false,
  isMyTurn = false,
  onClick,
  size = "md",
  x,
  y,
}: MolecularNodeProps) {
  // Track if the image loaded successfully
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Preload image to check if it's valid
  useEffect(() => {
    if (!player?.imageUrl) {
      setImageLoaded(false);
      setImageError(false);
      return;
    }

    setImageLoaded(false);
    setImageError(false);

    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      setImageError(false);
    };
    img.onerror = () => {
      setImageLoaded(false);
      setImageError(true);
    };
    img.src = player.imageUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [player?.imageUrl]);

  // Determine asset type and colors
  const positionAssetType = POSITION_ASSET_MAP[position];
  const assetType = position === "FLEX" && player?.assetType 
    ? player.assetType 
    : positionAssetType;
  const colors = POSITION_COLORS[assetType as AssetType | "flex"];
  const positionCode = POSITION_CODES[position];
  
  // Role label
  const roleLabel = position === "FLEX" && player?.assetType 
    ? ASSET_TYPE_LABELS[player.assetType] 
    : ASSET_TYPE_LABELS[assetType as AssetType | "flex"];

  const showImage = player?.imageUrl && imageLoaded && !imageError;

  // Dimensions
  const nodeSize = size === "lg" ? 120 : size === "md" ? 100 : 80;
  const hexRadius = nodeSize / 2;
  
  // Hexagon path calculation (flat-topped)
  const hexPoints = [];
  for (let i = 0; i < 6; i++) {
    const angle_deg = 60 * i;
    const angle_rad = Math.PI / 180 * angle_deg;
    const px = hexRadius * Math.cos(angle_rad);
    const py = hexRadius * Math.sin(angle_rad);
    hexPoints.push(`${px},${py}`);
  }
  const hexPath = `M ${hexPoints.join(" L ")} Z`;

  return (
    <g 
      transform={`translate(${x}, ${y})`}
      className={cn(
        "transition-all duration-300",
        onClick && "cursor-pointer",
        isActive && isMyTurn && "animate-pulse"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {/* Outer Glow for active state */}
      {isActive && (
        <path
          d={hexPath}
          fill={colors.glow}
          className="blur-md opacity-60 animate-pulse"
          transform="scale(1.1)"
        />
      )}

      {/* Main Hexagon Background */}
      <path
        d={hexPath}
        fill={player ? "rgba(10, 10, 15, 0.9)" : "rgba(10, 10, 15, 0.6)"}
        stroke={isActive ? "#cfff4d" : colors.jersey}
        strokeWidth={isActive ? 3 : 2}
        className={cn(
          "transition-all duration-300",
          player && "drop-shadow-lg"
        )}
      />

      {/* Inner Fill / Image */}
      <defs>
        <clipPath id={`hex-clip-${position}`}>
          <path d={hexPath} transform="scale(0.9)" />
        </clipPath>
        <linearGradient id={`hex-gradient-${position}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors.jersey} stopOpacity="0.3" />
          <stop offset="100%" stopColor={colors.jersey} stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Inner Gradient Background */}
      <path 
        d={hexPath} 
        fill={`url(#hex-gradient-${position})`} 
        transform="scale(0.9)"
      />

      {/* Content Container */}
      {player ? (
        <>
          {showImage ? (
            <image
              href={player.imageUrl!}
              x={-hexRadius * 0.9}
              y={-hexRadius * 0.9}
              width={hexRadius * 1.8}
              height={hexRadius * 1.8}
              clipPath={`url(#hex-clip-${position})`}
              preserveAspectRatio="xMidYMid slice"
              className="opacity-90 hover:opacity-100 transition-opacity"
            />
          ) : (
            // Initials fallback
            <text
              x="0"
              y="5"
              textAnchor="middle"
              fontSize="24"
              fontWeight="bold"
              fill={colors.text}
              className="select-none pointer-events-none"
            >
              {player.name.slice(0, 2).toUpperCase()}
            </text>
          )}
          
          {/* Player Name Label (Bottom of Hex) */}
          <g transform={`translate(0, ${hexRadius + 20})`}>
             <rect 
               x="-50" 
               y="-14" 
               width="100" 
               height="18" 
               rx="9" 
               fill="rgba(0,0,0,0.8)" 
               stroke={colors.border}
               strokeWidth="1"
             />
             <text
               x="0"
               y="0"
               textAnchor="middle"
               fontSize="10"
               fill="white"
               className="font-semibold select-none pointer-events-none"
             >
               {player.name.length > 14 ? player.name.slice(0, 12) + ".." : player.name}
             </text>
          </g>
        </>
      ) : (
        // Empty State
        <>
          <text
            x="0"
            y="5"
            textAnchor="middle"
            fontSize="20"
            fontWeight="bold"
            fill={colors.jersey}
            opacity="0.8"
            className="select-none pointer-events-none"
          >
            {positionCode}
          </text>
          <text
            x="0"
            y="25"
            textAnchor="middle"
            fontSize="8"
            fill={colors.text}
            opacity="0.7"
            className="uppercase tracking-wider select-none pointer-events-none"
          >
            {roleLabel}
          </text>
        </>
      )}
    </g>
  );
}

