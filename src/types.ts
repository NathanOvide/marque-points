export type WinMode = 'high' | 'low'
export type EndMode = 'none' | 'target' | 'rounds'

/** Un joueur enregistré, réutilisable d'une partie à l'autre. */
export interface Player {
  id: string
  name: string
  emoji: string
  color: number // index dans la palette PLAYER_COLORS
  createdAt: number
}

/** Un jeu (modèle) : ses règles de comptage, réutilisées à chaque partie. */
export interface GameType {
  id: string
  name: string
  emoji: string
  winMode: WinMode
  initialScore: number
  endMode: EndMode
  target: number // score cible (endMode = 'target')
  maxRounds: number // nombre de manches (endMode = 'rounds')
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

export interface Match {
  id: string
  gameTypeId: string
  gameName: string
  gameEmoji: string
  winMode: WinMode
  endMode: EndMode
  target: number
  maxRounds: number
  players: MatchPlayer[] // dans l'ordre du tour de table
  firstDealer: number // index dans players du donneur de la 1re manche
  rounds: Round[]
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
