"use client"

import { useState, type ReactNode } from "react"
import { isDisplayableImageUrl, normalizeImageUrl } from "@/lib/images"

type RemoteImageProps = {
  src: string
  alt: string
  className?: string
  fallback?: ReactNode
}

export function RemoteImage({ src, alt, className, fallback }: RemoteImageProps) {
  const [failed, setFailed] = useState(false)
  const normalized = normalizeImageUrl(src)

  if (!normalized || !isDisplayableImageUrl(normalized) || failed) {
    return fallback ? <>{fallback}</> : null
  }

  return (
    <img
      src={normalized}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
