"use client"

// Case SVG placeholder - represents a stylized case/crate
export function CasePlaceholder({ className = "", color = "#ff9900" }: { className?: string; color?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background glow */}
      <defs>
        <radialGradient id="caseGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="caseTop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2a2d35" />
          <stop offset="100%" stopColor="#1a1d24" />
        </linearGradient>
        <linearGradient id="caseFront" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a1d24" />
          <stop offset="100%" stopColor="#12151a" />
        </linearGradient>
      </defs>
      
      {/* Glow circle */}
      <circle cx="50" cy="50" r="45" fill="url(#caseGlow)" />
      
      {/* Case top face - 3D effect */}
      <path 
        d="M15 30 L50 15 L85 30 L50 45 Z" 
        fill="url(#caseTop)" 
        stroke={color}
        strokeWidth="1"
        strokeOpacity="0.3"
      />
      
      {/* Case front face */}
      <path 
        d="M15 30 L15 65 L50 80 L50 45 Z" 
        fill="url(#caseFront)"
        stroke={color}
        strokeWidth="1"
        strokeOpacity="0.2"
      />
      
      {/* Case right face */}
      <path 
        d="M50 45 L50 80 L85 65 L85 30 Z" 
        fill="#0d0f13"
        stroke={color}
        strokeWidth="1"
        strokeOpacity="0.2"
      />
      
      {/* Lock/clasp detail */}
      <rect x="46" y="55" width="8" height="12" rx="1" fill={color} fillOpacity="0.8" />
      <circle cx="50" cy="61" r="2" fill="#0a0c10" />
      
      {/* Accent lines */}
      <line x1="20" y1="35" x2="45" y2="48" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      <line x1="55" y1="48" x2="80" y2="35" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      
      {/* Question marks for mystery */}
      <text x="50" y="28" textAnchor="middle" fill={color} fontSize="10" fontWeight="bold">?</text>
    </svg>
  )
}

// Weapon SVG placeholder - represents a stylized weapon silhouette
export function WeaponPlaceholder({ 
  className = "", 
  color = "#ff9900",
  type = "rifle" 
}: { 
  className?: string
  color?: string
  type?: "rifle" | "pistol" | "knife" | "awp"
}) {
  return (
    <svg 
      viewBox="0 0 120 80" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background glow */}
      <defs>
        <radialGradient id={`weaponGlow-${type}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`weaponBody-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3a3d45" />
          <stop offset="50%" stopColor="#2a2d35" />
          <stop offset="100%" stopColor="#1a1d24" />
        </linearGradient>
      </defs>
      
      {/* Glow ellipse */}
      <ellipse cx="60" cy="40" rx="55" ry="35" fill={`url(#weaponGlow-${type})`} />
      
      {type === "rifle" && (
        <>
          {/* AK-47 style rifle */}
          <path 
            d="M10 38 L75 38 L85 35 L100 35 L100 40 L85 40 L80 43 L70 43 L70 50 L60 55 L50 55 L50 48 L30 48 L25 55 L15 55 L15 48 L10 45 Z" 
            fill={`url(#weaponBody-${type})`}
            stroke={color}
            strokeWidth="1"
            strokeOpacity="0.5"
          />
          {/* Magazine */}
          <rect x="40" y="43" width="8" height="15" rx="1" fill="#1a1d24" stroke={color} strokeWidth="0.5" strokeOpacity="0.3" />
          {/* Barrel accent */}
          <line x1="85" y1="37" x2="98" y2="37" stroke={color} strokeWidth="1.5" strokeOpacity="0.6" />
        </>
      )}
      
      {type === "pistol" && (
        <>
          {/* Pistol shape */}
          <path 
            d="M30 35 L75 35 L80 32 L90 32 L90 38 L80 38 L75 41 L55 41 L55 55 L45 60 L40 60 L40 45 L30 45 Z" 
            fill={`url(#weaponBody-${type})`}
            stroke={color}
            strokeWidth="1"
            strokeOpacity="0.5"
          />
          {/* Trigger guard */}
          <path d="M48 45 L48 52 L42 52 L42 45" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.4" />
        </>
      )}
      
      {type === "knife" && (
        <>
          {/* Knife blade */}
          <path 
            d="M20 45 L90 30 L95 35 L85 40 L25 50 Z" 
            fill={`url(#weaponBody-${type})`}
            stroke={color}
            strokeWidth="1"
            strokeOpacity="0.6"
          />
          {/* Handle */}
          <path 
            d="M20 45 L25 50 L15 60 L10 55 Z" 
            fill="#1a1d24"
            stroke={color}
            strokeWidth="1"
            strokeOpacity="0.4"
          />
          {/* Edge shine */}
          <line x1="30" y1="43" x2="80" y2="34" stroke={color} strokeWidth="1" strokeOpacity="0.8" />
        </>
      )}
      
      {type === "awp" && (
        <>
          {/* AWP sniper rifle */}
          <path 
            d="M5 40 L80 40 L85 37 L110 37 L110 42 L85 42 L80 45 L70 45 L70 52 L60 57 L50 57 L50 50 L35 50 L30 58 L20 58 L20 48 L5 48 Z" 
            fill={`url(#weaponBody-${type})`}
            stroke={color}
            strokeWidth="1"
            strokeOpacity="0.5"
          />
          {/* Scope */}
          <ellipse cx="55" cy="33" rx="12" ry="5" fill="#1a1d24" stroke={color} strokeWidth="1" strokeOpacity="0.5" />
          <line x1="50" y1="38" x2="50" y2="40" stroke={color} strokeWidth="0.5" strokeOpacity="0.3" />
          <line x1="60" y1="38" x2="60" y2="40" stroke={color} strokeWidth="0.5" strokeOpacity="0.3" />
          {/* Barrel */}
          <line x1="90" y1="39" x2="108" y2="39" stroke={color} strokeWidth="2" strokeOpacity="0.6" />
        </>
      )}
    </svg>
  )
}

// Color palette based on CS2 rarity
export const rarityColors = {
  consumer: "#b0c3d9",
  industrial: "#5e98d9", 
  milspec: "#4b69ff",
  restricted: "#8847ff",
  classified: "#d32ce6",
  covert: "#eb4b4b",
  gold: "#ffd700",
}
