// Génère les icônes de l'app à partir d'une image source.
//   node scripts/icons.mjs                                    → icônes par défaut (scripts/icon.svg → public/)
//   node scripts/icons.mjs <source> <dossier> [fond] [taille] → ex. pour un thème : theme/icon.png theme/public '#ffffff' 0.72
// « taille » = place occupée par l'image (1 = toute l'icône) ; l'icône « maskable » Android garde une marge.
import sharp from 'sharp'

const [src = 'scripts/icon.svg', out = 'public', bg = '#2a78d6', ratioArg = '1'] = process.argv.slice(2)
const ratio = Number(ratioArg)

const make = async (size, r, file) => {
  const img = await sharp(src, { density: 300 }).resize({ height: Math.round(size * r) }).toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: img, gravity: 'center' }])
    .png()
    .toFile(`${out}/${file}`)
}

await make(192, ratio, 'icon-192.png')
await make(512, ratio, 'icon-512.png')
await make(512, Math.min(ratio, 0.56), 'icon-maskable-512.png')
await make(180, ratio, 'apple-touch-icon.png')
await make(32, Math.min(1, ratio * 1.2), 'favicon-32.png')
