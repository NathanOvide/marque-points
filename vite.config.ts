import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// Thème optionnel : si theme/brand.json existe, il remplace la marque par défaut (src/brand/) :
// textes, couleurs (theme.css), images (logo, ornement) et icônes (theme/public/).
const brandDir = resolve(existsSync('theme/brand.json') ? 'theme' : 'src/brand')
const brand = JSON.parse(readFileSync(`${brandDir}/brand.json`, 'utf8'))
const images = ['logo', 'logoDark', 'ornament'].filter((k) => brand[k])

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function brandPlugin(): Plugin {
  return {
    name: 'brand',
    resolveId: (id) => (id === 'virtual:brand' ? '\0virtual:brand' : undefined),
    load(id) {
      if (id !== '\0virtual:brand') return
      const imports = images.map((k) => `import ${k} from ${JSON.stringify(`${brandDir}/${brand[k]}`)}`).join('\n')
      return `${imports}\nexport default { ...${JSON.stringify(brand)}, ${images.join(', ')} }`
    },
    transformIndexHtml: (html) =>
      html.replace(/%BRAND_(\w+)%/g, (_, key: string) => {
        const k = key.toLowerCase().replace(/_(\w)/g, (_m, c: string) => c.toUpperCase())
        return escapeHtml(String(brand[k] ?? ''))
      }),
  }
}

// Servi sur GitHub Pages sous /marque-points/
export default defineConfig({
  base: '/marque-points/',
  publicDir: existsSync(`${brandDir}/public`) ? `${brandDir}/public` : 'public',
  resolve: {
    alias: { '@brand': brandDir },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    brandPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png'],
      workbox: { globPatterns: ['**/*.{js,css,html}', '**/*-latin-*.woff2'] },
      manifest: {
        name: brand.fullName,
        short_name: brand.name,
        description: brand.description,
        lang: 'fr',
        theme_color: brand.themeColor,
        background_color: brand.backgroundColor,
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
