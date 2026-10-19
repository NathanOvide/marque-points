import type { GameType, Match, MatchPlayer, Player } from './types'

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/** Total courant de chaque joueur (score de départ + toutes les manches). */
export function totals(match: Match, uptoRound = match.rounds.length): Record<string, number> {
  const t: Record<string, number> = {}
  for (const p of match.players) t[p.id] = p.initialScore
  for (const r of match.rounds.slice(0, uptoRound)) {
    for (const p of match.players) t[p.id] += r.scores[p.id] ?? 0
  }
  return t
}

export interface Standing {
  player: MatchPlayer
  total: number
  rank: number // 1 = en tête ; ex aequo partagent le rang
  gap: number // écart avec le leader (toujours >= 0)
}

/** Classement, du meilleur au moins bon selon le sens de victoire. */
export function standings(match: Match): Standing[] {
  const t = totals(match)
  const better = (a: number, b: number) => (match.winMode === 'high' ? b - a : a - b)
  const sorted = [...match.players].sort((a, b) => better(t[a.id], t[b.id]))
  const best = sorted.length ? t[sorted[0].id] : 0
  return sorted.map((player) => {
    const total = t[player.id]
    const rank = 1 + sorted.filter((o) => better(t[o.id], total) < 0).length
    return { player, total, rank, gap: Math.abs(total - best) }
  })
}

/** Index (dans match.players) du donneur / premier joueur de la manche roundIndex (0-based). */
export function dealerFor(match: Match, roundIndex: number): number {
  const n = match.players.length
  if (!n) return 0
  return (((match.firstDealer + roundIndex) % n) + n) % n
}

/** Raison de fin de partie atteinte, ou null si la partie continue. */
export function endReason(match: Match): string | null {
  if (!match.rounds.length) return null
  if (match.endMode === 'rounds' && match.maxRounds > 0 && match.rounds.length >= match.maxRounds) {
    return `Les ${match.maxRounds} manches sont jouées.`
  }
  if (match.endMode === 'target' && match.target !== 0) {
    const t = totals(match)
    const hit = match.players.filter((p) =>
      match.target > 0 ? t[p.id] >= match.target : t[p.id] <= match.target,
    )
    if (hit.length) {
      const names = hit.map((p) => p.name).join(', ')
      return `${names} ${hit.length > 1 ? 'ont' : 'a'} atteint ${match.target} points.`
    }
  }
  return null
}

export function winners(match: Match): MatchPlayer[] {
  return standings(match)
    .filter((s) => s.rank === 1)
    .map((s) => s.player)
}

export function describeRules(g: Pick<GameType, 'winMode' | 'endMode' | 'target' | 'maxRounds'> & { initialScore?: number }): string {
  const parts = [g.winMode === 'high' ? 'Le plus de points gagne' : 'Le moins de points gagne']
  if (g.endMode === 'target') parts.push(`fin à ${g.target} pts`)
  if (g.endMode === 'rounds') parts.push(`${g.maxRounds} manches`)
  if (g.initialScore) parts.push(`départ à ${g.initialScore}`)
  return parts.join(' · ')
}

export function newMatch(game: GameType, players: Player[], initialScores: Record<string, number>, firstDealer: number): Match {
  return {
    id: uid(),
    gameTypeId: game.id,
    gameName: game.name,
    gameEmoji: game.emoji,
    winMode: game.winMode,
    endMode: game.endMode,
    target: game.target,
    maxRounds: game.maxRounds,
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      initialScore: initialScores[p.id] ?? game.initialScore,
    })),
    firstDealer,
    rounds: [],
    status: 'playing',
    createdAt: Date.now(),
  }
}

// ---------- Statistiques ----------

export interface PlayerStats {
  id: string
  name: string
  emoji: string
  color: number
  played: number
  wins: number
  winRate: number
  favoriteGame: string | null
  bestGame: string | null // jeu où il gagne le plus
}

export interface GameStats {
  name: string
  emoji: string
  played: number
  topWinner: string | null
  record: { name: string; total: number } | null
  winMode: 'high' | 'low'
}

function maxKey(counts: Map<string, number>): string | null {
  let best: string | null = null
  let n = 0
  for (const [k, v] of counts) if (v > n) [best, n] = [k, v]
  return best
}

export function computeStats(matches: Match[], gameFilter?: string) {
  const done = matches.filter((m) => m.status === 'finished' && (!gameFilter || m.gameTypeId === gameFilter))
  const players = new Map<string, PlayerStats & { games: Map<string, number>; winsBy: Map<string, number> }>()
  const games = new Map<string, GameStats & { winsBy: Map<string, number> }>()

  for (const m of done) {
    const win = new Set(winners(m).map((p) => p.id))
    const t = totals(m)
    let g = games.get(m.gameTypeId)
    if (!g) {
      g = { name: m.gameName, emoji: m.gameEmoji, played: 0, topWinner: null, record: null, winMode: m.winMode, winsBy: new Map() }
      games.set(m.gameTypeId, g)
    }
    g.played++
    for (const p of m.players) {
      let s = players.get(p.id)
      if (!s) {
        s = { id: p.id, name: p.name, emoji: p.emoji, color: p.color, played: 0, wins: 0, winRate: 0, favoriteGame: null, bestGame: null, games: new Map(), winsBy: new Map() }
        players.set(p.id, s)
      }
      // le nom le plus récent l'emporte
      Object.assign(s, { name: p.name, emoji: p.emoji, color: p.color })
      s.played++
      s.games.set(m.gameName, (s.games.get(m.gameName) ?? 0) + 1)
      if (win.has(p.id)) {
        s.wins++
        s.winsBy.set(m.gameName, (s.winsBy.get(m.gameName) ?? 0) + 1)
        g.winsBy.set(p.name, (g.winsBy.get(p.name) ?? 0) + 1)
      }
      const better = !g.record || (m.winMode === 'high' ? t[p.id] > g.record.total : t[p.id] < g.record.total)
      if (better) g.record = { name: p.name, total: t[p.id] }
    }
  }

  const playerList: PlayerStats[] = [...players.values()]
    .map(({ games: gm, winsBy, ...s }) => ({
      ...s,
      winRate: s.played ? s.wins / s.played : 0,
      favoriteGame: maxKey(gm),
      bestGame: maxKey(winsBy),
    }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || b.played - a.played)

  const gameList: GameStats[] = [...games.values()]
    .map(({ winsBy, ...g }) => ({ ...g, topWinner: maxKey(winsBy) }))
    .sort((a, b) => b.played - a.played)

  return { players: playerList, games: gameList, total: done.length }
}
