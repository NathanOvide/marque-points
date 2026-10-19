/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string

/** Marque de l'app : src/brand/ par défaut, ou le thème du dossier theme/ s'il existe (voir vite.config.ts). */
declare module 'virtual:brand' {
  const brand: {
    name: string
    fullName: string
    description: string
    tagline: string
    welcome: string
    link: { label: string; url: string } | null
    logo?: string
    logoDark?: string
    ornament?: string
  }
  export default brand
}
