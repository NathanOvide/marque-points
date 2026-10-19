export type WinMode = 'high' | 'low'
export type EndMode = 'none' | 'target' | 'rounds'
/**
 * Façon de compter :
 * - points : points marqués à chaque manche (Skyjo, Tarot…)
 * - wins : on note seulement qui gagne chaque manche (duels, jeux sans points)
 * - sheet : un seul décompte final, catégorie par catégorie (7 Wonders…)
 * - coop : tout le monde gagne ou perd ensemble (Unlock!, Sky Team…)
 */
export type GameKind = 'points' | 'wins' | 'sheet' | 'coop'

/** Une ligne de la feuille de score (mode sheet). */
export interface Category {
  id: string
  label: string
  emoji?: string
  hint?: string
}

/** Réglages de comptage d'un jeu, communs au modèle (GameType), au catalogue et à la partie (Match). */
export interface Rules {
  kind?: GameKind // absent = 'points' (données d'avant les modes)
  winMode: WinMode
  initialScore: number
  endMode: EndMode
  target: number // score cible (endMode = 'target') ; en mode wins : nombre de victoires
  maxRounds: number // nombre de manches (endMode = 'rounds')
  categories?: Category[] // mode sheet
  scoreLabel?: string // mode coop : score facultatif à noter (« Étoiles », « Temps restant »…)
  variantLabel?: string // mode coop : scénario, niveau… (« Scénario », « Aéroport »…)
  rules?: string // rappel des règles, affiché pendant la partie
}

/** Un joueur enregistré, réutilisable d'une partie à l'autre. */
export interface Player {
  id: string
  name: string
  emoji: string
  color: number // index dans la palette PLAYER_COLORS
  createdAt: number
}

/** Un jeu (modèle) : ses règles de comptage, réutilisées à chaque partie. */
export interface GameType extends Rules {
  id: string
  name: string
  emoji: string
  catalogId?: string // créé depuis le catalogue : ses règles suivent le catalogue tant qu'il n'est pas modifié
  edited?: boolean
  createdAt: number
}

/** Copie figée d'un joueur au moment de la partie (l'historique survit à sa suppression). */
export interface MatchPlayer {
  id: string
  name: string
  emoji: string
  color: number
  initialScore: number
}

export interface Round {
  id: string
  scores: Record<string, number>
  at: number
}

/** Résultat d'une partie coopérative. */
export interface CoopResult {
  won: boolean
  score?: number
  variant?: string
}

export interface Match extends Rules {
  id: string
  gameTypeId: string
  gameName: string
  gameEmoji: string
  players: MatchPlayer[] // dans l'ordre du tour de table
  firstDealer: number // index dans players du donneur de la 1re manche
  rounds: Round[]
  sheet?: Record<string, Record<string, number>> // mode sheet : catégorie → joueur → points
  coop?: CoopResult // mode coop : renseigné à la fin
  status: 'playing' | 'finished'
  createdAt: number
  finishedAt?: number
}

export interface AppState {
  version: 1
  players: Player[]
  gameTypes: GameType[]
  matches: Match[]
  onboarded: boolean
}
