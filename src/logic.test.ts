import { describe, expect, it } from 'vitest'
import { computeStats, dealerFor, endReason, newMatch, standings, totals, winners } from './logic'
import type { GameType, Match, Player } from './types'

const game = (patch: Partial<GameType> = {}): GameType => ({
  id: 'g1', name: 'Skyjo', emoji: '🃏', winMode: 'high', initialScore: 0, endMode: 'none', target: 100, maxRounds: 3, createdAt: 0, ...patch,
})
const players: Player[] = ['a', 'b', 'c'].map((id, i) => ({ id, name: id.toUpperCase(), emoji: '🦊', color: i, createdAt: 0 }))
const play = (m: Match, ...rounds: number[][]): Match => ({
  ...m,
  rounds: rounds.map((r, i) => ({ id: String(i), at: 0, scores: { a: r[0], b: r[1], c: r[2] } })),
})

describe('scores', () => {
  it('additionne le score de départ et les manches', () => {
    const m = play(newMatch(game({ initialScore: 10 }), players, { b: 5 }, 0), [3, -2, 0], [1, 1, 1])
    expect(totals(m)).toEqual({ a: 14, b: 4, c: 11 })
    expect(totals(m, 1)).toEqual({ a: 13, b: 3, c: 10 })
  })

  it('classe selon le sens de victoire, avec ex aequo et écart au leader', () => {
    const m = play(newMatch(game(), players, {}, 0), [10, 10, 4])
    expect(standings(m).map((s) => [s.player.id, s.rank, s.gap])).toEqual([['a', 1, 0], ['b', 1, 0], ['c', 3, 6]])
    const low = { ...m, winMode: 'low' as const }
    expect(winners(low).map((p) => p.id)).toEqual(['c'])
  })
})

describe('donneur', () => {
  it('tourne à chaque manche à partir du premier donneur', () => {
    const m = newMatch(game(), players, {}, 2)
    expect([0, 1, 2, 3].map((i) => dealerFor(m, i))).toEqual([2, 0, 1, 2])
  })
})

describe('fin de partie', () => {
  it('détecte le score cible', () => {
    const m = newMatch(game({ endMode: 'target', target: 100 }), players, {}, 0)
    expect(endReason(play(m, [50, 99, 0]))).toBeNull()
    expect(endReason(play(m, [50, 101, 0]))).toContain('B a atteint 100')
  })
  it('détecte le nombre de manches', () => {
    const m = newMatch(game({ endMode: 'rounds', maxRounds: 2 }), players, {}, 0)
    expect(endReason(play(m, [1, 1, 1]))).toBeNull()
    expect(endReason(play(m, [1, 1, 1], [1, 1, 1]))).toContain('2 manches')
  })
  it('ne termine jamais en mode libre', () => {
    expect(endReason(play(newMatch(game(), players, {}, 0), [999, 0, 0]))).toBeNull()
  })
})

describe('statistiques', () => {
  it('compte victoires et parties terminées uniquement', () => {
    const base = newMatch(game(), players, {}, 0)
    const m1 = { ...play(base, [10, 0, 0]), id: 'm1', status: 'finished' as const }
    const m2 = { ...play(base, [0, 10, 0]), id: 'm2', status: 'finished' as const }
    const m3 = { ...play(base, [10, 0, 0]), id: 'm3' } // en cours : ignorée
    const s = computeStats([m1, m2, m3])
    expect(s.total).toBe(2)
    expect(s.players.find((p) => p.id === 'a')).toMatchObject({ wins: 1, played: 2, winRate: 0.5 })
    expect(s.games[0]).toMatchObject({ played: 2, record: { name: 'A', total: 10 } })
  })
})
