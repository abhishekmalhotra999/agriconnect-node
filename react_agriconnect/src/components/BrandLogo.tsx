import { useState } from 'react'
import agriconnectLogo from '../assets/agriconnect-logo.png'

type BrandLogoProps = {
  className?: string
  alt?: string
  mode?: 'light' | 'dark'
}

export default function BrandLogo({ className = '', alt = 'AgriConnect Liberia', mode = 'dark' }: BrandLogoProps) {
  const [loadFailed, setLoadFailed] = useState(false)

  if (loadFailed) {
    return (
      <span className={`brand-fallback ${mode === 'light' ? 'brand-fallback-light' : ''} ${className}`.trim()}>
        AgriConnect Liberia
      </span>
    )
  }

  return (
    <img
      src={agriconnectLogo}
      alt={alt}
      className={`brand-logo ${className}`.trim()}
      onError={() => setLoadFailed(true)}
      loading="eager"
      decoding="async"
    />
  )
}
