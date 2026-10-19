import { useState } from 'react'
import { uid } from '../logic'
import type { EndMode, GameType } from '../types'
import { GAME_EMOJIS, NumberInput, Stepper } from '../ui'

export function blankGame(): GameType {
  return { id: uid(), name: '', emoji: '🎲', winMode: 'high', initialScore: 0, endMode: 'none', target: 100, maxRounds: 10, createdAt: Date.now() }
}

/** Formulaire de création / modification d'un jeu, avec explications pour chaque réglage. */
export default function GameForm({ initial, onSave, submitLabel }: { initial: GameType; onSave: (g: GameType) => void; submitLabel: string }) {
  const [g, setG] = useState(initial)
  const set = (patch: Partial<GameType>) => setG((cur) => ({ ...cur, ...patch }))
  const valid = g.name.trim().length > 0

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSave({ ...g, name: g.name.trim() })
      }}
    >
      <label className="field">
        <span>Nom du jeu</span>
        <input type="text" value={g.name} placeholder="Ex. : Skyjo, Tarot, Uno…" autoFocus={!initial.name} maxLength={40} onChange={(e) => set({ name: e.target.value })} />
      </label>

      <div className="field">
        <span>Icône</span>
        <div className="emoji-grid">
          {GAME_EMOJIS.map((e) => (
            <button type="button" key={e} className={e === g.emoji ? 'selected' : ''} aria-pressed={e === g.emoji} onClick={() => set({ emoji: e })}>
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Qui gagne ?</span>
        <div className="choice-2">
          <button type="button" className={g.winMode === 'high' ? 'selected' : ''} aria-pressed={g.winMode === 'high'} onClick={() => set({ winMode: 'high' })}>
            <b>📈 Le plus de points</b>
            <small>Tarot, Yams, Uno…</small>
          </button>
          <button type="button" className={g.winMode === 'low' ? 'selected' : ''} aria-pressed={g.winMode === 'low'} onClick={() => set({ winMode: 'low' })}>
            <b>📉 Le moins de points</b>
            <small>Skyjo, Golf, 6 qui prend…</small>
          </button>
        </div>
      </div>

      <div className="field">
        <span>Quand la partie se termine-t-elle ?</span>
        <div className="segmented">
          {(
            [
              ['none', 'Quand on veut'],
              ['target', 'Score à atteindre'],
              ['rounds', 'Nombre de manches'],
            ] as [EndMode, string][]
          ).map(([v, l]) => (
            <button type="button" key={v} className={g.endMode === v ? 'selected' : ''} aria-pressed={g.endMode === v} onClick={() => set({ endMode: v })}>
              {l}
            </button>
          ))}
        </div>
        {g.endMode === 'none' && <small className="muted">Vous terminez la partie vous-même avec le bouton « Terminer ».</small>}
        {g.endMode === 'target' && (
          <div className="inline-field">
            <small className="muted">Fin dès qu'un joueur atteint</small>
            <NumberInput value={g.target} onChange={(n) => set({ target: n })} label="Score à atteindre" />
            <small className="muted">points</small>
          </div>
        )}
        {g.endMode === 'rounds' && (
          <div className="inline-field">
            <small className="muted">Fin après</small>
            <Stepper value={g.maxRounds} min={1} onChange={(n) => set({ maxRounds: Math.max(1, Math.round(n)) })} label="Nombre de manches" />
            <small className="muted">manches</small>
          </div>
        )}
      </div>

      <div className="field">
        <span>Score de départ de chaque joueur</span>
        <Stepper value={g.initialScore} onChange={(n) => set({ initialScore: n })} label="Score de départ" />
        <small className="muted">Le plus souvent 0. Il reste modifiable joueur par joueur au lancement d'une partie.</small>
      </div>

      <button type="submit" className="btn primary big block" disabled={!valid}>
        {submitLabel}
      </button>
    </form>
  )
}
