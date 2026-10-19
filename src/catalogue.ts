import catalogue from 'virtual:catalogue'
import { rulesOf, uid } from './logic'
import type { GameType, Rules } from './types'

/** Un jeu du catalogue : règles de comptage prêtes à l'emploi. */
export interface CatalogGame extends Rules {
  id: string
  name: string
  aliases?: string[]
  emoji: string
  players?: string // « 2 à 8 »
  duration?: string // « 30 min »
}

export { catalogue }

/** Minuscules, sans accents ni ponctuation : « Time's Up ! » → « times up ». */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' et ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const compact = (s: string) => s.replace(/ /g, '')

/** Distance d'édition (fautes de frappe), arrêtée dès qu'elle dépasse max. */
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    if (Math.min(...cur) > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}

/** Pertinence d'un nom pour une recherche déjà normalisée (0 = ne correspond pas). */
function matchScore(name: string, q: string): number {
  const n = normalize(name)
  if (n === q) return 100
  if (n.startsWith(q)) return 90
  const words = n.split(' ')
  if (words.some((w) => w.startsWith(q))) return 80
  if (compact(n).startsWith(compact(q))) return 75
  if (n.includes(q) || compact(n).includes(compact(q))) return 60
  const qWords = q.split(' ')
  if (qWords.length > 1 && qWords.every((qw) => words.some((w) => w.startsWith(qw)))) return 50
  // fautes de frappe : on compare au début du nom, ou à chaque mot
  if (q.length >= 3) {
    const max = q.length >= 6 ? 2 : 1
    const cq = compact(q)
    if (distance(cq, compact(n).slice(0, cq.length), max) <= max) return 30
    if (words.some((w) => w.length >= 3 && distance(q, w.slice(0, q.length), max) <= max)) return 25
  }
  return 0
}

export interface SearchItem {
  name: string
  aliases?: string[]
}

/** Filtre et trie par pertinence ; sans recherche, ordre alphabétique. */
export function search<T extends SearchItem>(items: T[], query: string): T[] {
  const q = normalize(query)
  if (!q) return [...items].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  return items
    .map((item) => ({ item, score: Math.max(...[item.name, ...(item.aliases ?? [])].map((n) => matchScore(n, q))) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'fr'))
    .map((r) => r.item)
}

/** Crée ou met à jour (s'il n'a pas été modifié à la main) le jeu enregistré correspondant à une entrée du catalogue. */
export function gameFromCatalog(entry: CatalogGame, existing?: GameType): GameType {
  if (existing?.edited) return existing
  return {
    ...rulesOf(entry),
    id: existing?.id ?? uid(),
    name: entry.name,
    emoji: entry.emoji,
    catalogId: entry.id,
    createdAt: existing?.createdAt ?? Date.now(),
  }
}
