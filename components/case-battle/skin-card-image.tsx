"use client"

import { Skin } from "@/lib/case-battle"
import { RemoteImage } from "./remote-image"
import { WeaponPlaceholder } from "./svg-placeholders"

export function SkinCardImage({
  skin,
  className = "h-full w-full",
  color,
}: {
  skin: Skin
  className?: string
  color?: string
}) {
  const placeholder = (
    <WeaponPlaceholder
      className={className}
      color={color}
      type={skin.weaponType}
    />
  )

  return (
    <RemoteImage
      src={skin.image}
      alt={skin.name}
      className={`object-contain ${className}`}
      fallback={placeholder}
    />
  )
}
