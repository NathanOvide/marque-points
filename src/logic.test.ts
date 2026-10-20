import { describe, expect, it } from 'vitest'
import { computeStats, dealerFor, describeRules, endReason, hasScores, kindOf, newMatch, sheetProgress, standings, totals, winners } from './logic'
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

describe('recherche dans le catalogue', async () => {
  const { search } = await import('./catalogue')
  const items = [{ name: 'Skyjo' }, { name: '6 qui prend !', aliases: ['six qui prend'] }, { name: "Time's Up!" }, { name: 'Les Aventuriers du Rail' }, { name: 'Sky Team' }]
  const names = (q: string) => search(items, q).map((i) => i.name)

  it('trouve par début de nom, de mot, ou alias, sans accents ni ponctuation', () => {
    expect(names('sky')).toEqual(['Sky Team', 'Skyjo'])
    expect(names('prend')[0]).toBe('6 qui prend !')
    expect(names('six')[0]).toBe('6 qui prend !')
    expect(names('times up')[0]).toBe("Time's Up!")
    expect(names('timesup')[0]).toBe("Time's Up!")
    expect(names('aventurier')[0]).toBe('Les Aventuriers du Rail')
  })

  it('tolère les fautes de frappe', () => {
    expect(names('skijo')[0]).toBe('Skyjo')
    expect(names('avanturiers')[0]).toBe('Les Aventuriers du Rail')
  })
})

describe('modes de jeu', () => {
  it('feuille de score : somme des catégories, fin quand tout est compté', () => {
    const cats = [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }]
    let m = newMatch(game({ kind: 'sheet', categories: cats }), players, {}, 0)
    expect(hasScores(m)).toBe(false)
    m = { ...m, sheet: { x: { a: 3, b: 5, c: -1 } } }
    expect(totals(m)).toEqual({ a: 3, b: 5, c: -1 })
    expect(sheetProgress(m)).toMatchObject({ done: 1, total: 2, next: cats[1] })
    expect(endReason(m)).toBeNull()
    m = { ...m, sheet: { ...m.sheet, y: { a: 4, b: 0, c: 0 } } }
    expect(endReason(m)).not.toBeNull()
    expect(winners(m).map((p) => p.id)).toEqual(['a'])
  })

  it('feuille à une seule ligne : décrite comme un score final', () => {
    const rules = game({ kind: 'sheet', categories: [{ id: 'f', label: 'Score final' }] })
    expect(describeRules(rules)).toBe('Score final · le plus de points gagne')
    expect(describeRules({ ...rules, categories: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }] })).toBe('Feuille de score · 2 catégories · le plus de points gagne')
  })

  it('manches gagnées : compte les victoires, fin au nombre de victoires visé', () => {
    const m = play(newMatch(game({ kind: 'wins', endMode: 'target', target: 2 }), players, {}, 0), [1, 0, 0], [0, 1, 0], [1, 0, 0])
    expect(totals(m)).toEqual({ a: 2, b: 1, c: 0 })
    expect(endReason(m)).toContain('2 victoires')
    const single = play(newMatch(game({ kind: 'wins', endMode: 'rounds', maxRounds: 1 }), players, {}, 0), [0, 1, 0])
    expect(endReason(single)).not.toBeNull()
  })

  it('coopératif : toute l\'équipe gagne ou perd', () => {
    const m = newMatch(game({ kind: 'coop' }), players, {}, 0)
    expect(winners(m)).toEqual([])
    expect(winners({ ...m, coop: { won: true } }).map((p) => p.id)).toEqual(['a', 'b', 'c'])
    expect(winners({ ...m, coop: { won: false } })).toEqual([])
    const stats = computeStats([{ ...m, status: 'finished', coop: { won: true } }])
    expect(stats.players.every((p) => p.wins === 1)).toBe(true)
    expect(stats.games[0].record).toBeNull()
  })

  it('les parties d\'avant les modes restent en mode points', () => {
    const m = newMatch(game(), players, {}, 0)
    delete m.kind
    expect(kindOf(m)).toBe('points')
  })
})
