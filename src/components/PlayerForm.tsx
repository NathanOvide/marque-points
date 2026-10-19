import { useState } from 'react'
import { uid } from '../logic'
import type { Player } from '../types'
import { Avatar, COLOR_COUNT, COLOR_NAMES, PLAYER_EMOJIS } from '../ui'

/** Nouveau joueur avec la première couleur et le premier emoji encore libres. */
export function blankPlayer(existing: Player[]): Player {
  const usedColors = new Set(existing.map((p) => p.color))
  const usedEmojis = new Set(existing.map((p) => p.emoji))
  const color = [...Array(COLOR_COUNT).keys()].find((c) => !usedColors.has(c)) ?? existing.length % COLOR_COUNT
  const emoji = PLAYER_EMOJIS.find((e) => !usedEmojis.has(e)) ?? PLAYER_EMOJIS[existing.length % PLAYER_EMOJIS.length]
  return { id: uid(), name: '', emoji, color, createdAt: Date.now() }
}

export default function PlayerForm({ initial, others, onSave, submitLabel }: { initial: Player; others: Player[]; onSave: (p: Player) => void; submitLabel: string }) {
  const [p, setP] = useState(initial)
  const name = p.name.trim()
  const duplicate = others.some((o) => o.id !== p.id && o.name.trim().toLowerCase() === name.toLowerCase())
  const valid = name.length > 0 && !duplicate

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSave({ ...p, name })
      }}
    >
      <div className="player-preview">
        <Avatar emoji={p.emoji} color={p.color} size={64} />
      </div>
      <label className="field">
        <span>Prénom ou surnom</span>
        <input type="text" value={p.name} placeholder="Ex. : Camille" autoFocus={!initial.name} maxLength={20} onChange={(e) => setP({ ...p, name: e.target.value })} />
        {duplicate && <small className="error">Un joueur porte déjà ce nom.</small>}
      </label>
      <div className="field">
        <span>Couleur</span>
        <div className="color-row">
          {COLOR_NAMES.map((n, i) => (
            <button
              type="button"
              key={n}
              aria-label={n}
              aria-pressed={p.color === i}
              className={p.color === i ? 'swatch selected' : 'swatch'}
              style={{ background: `var(--p${i})` }}
              onClick={() => setP({ ...p, color: i })}
            />
          ))}
        </div>
      </div>
      <div className="field">
        <span>Emoji</span>
        <div className="emoji-grid">
          {PLAYER_EMOJIS.map((e) => (
            <button type="button" key={e} className={e === p.emoji ? 'selected' : ''} aria-pressed={e === p.emoji} onClick={() => setP({ ...p, emoji: e })}>
              {e}
            </button>
          ))}
        </div>
      </div>
      <button type="submit" className="btn primary big block" disabled={!valid}>
        {submitLabel}
      </button>
    </form>
  )
}
