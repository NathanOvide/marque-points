import { useState } from 'react'
import { KIND_LABELS, kindOf, uid } from '../logic'
import type { EndMode, GameKind, GameType } from '../types'
import { GAME_EMOJIS, NumberInput, Stepper } from '../ui'

export function blankGame(): GameType {
  return { id: uid(), name: '', emoji: '🎲', winMode: 'high', initialScore: 0, endMode: 'none', target: 100, maxRounds: 10, createdAt: Date.now() }
}

const KIND_EMOJIS: Record<GameKind, string> = { points: '🔢', wins: '🏆', sheet: '📋', coop: '🤝' }

/** Formulaire de création / modification d'un jeu, avec explications pour chaque réglage. */
export default function GameForm({ initial, onSave, submitLabel }: { initial: GameType; onSave: (g: GameType) => void; submitLabel: string }) {
  const [g, setG] = useState(initial)
  const set = (patch: Partial<GameType>) => setG((cur) => ({ ...cur, ...patch }))
  const kind = kindOf(g)
  const categories = g.categories ?? []
  const valid = g.name.trim().length > 0 && (kind !== 'sheet' || categories.some((c) => c.label.trim()))

  const setKind = (k: GameKind) => {
    const patch: Partial<GameType> = { kind: k }
    if (k === 'wins' || k === 'coop') patch.winMode = 'high'
    if (k === 'wins' && g.endMode === 'target' && g.target > 20) patch.target = 3
    if (k === 'sheet' && !categories.length) patch.categories = [{ id: uid(), label: '' }]
    set(patch)
  }
  const setCategory = (i: number, label: string) => set({ categories: categories.map((c, j) => (j === i ? { ...c, label } : c)) })

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        const cats = categories.filter((c) => c.label.trim()).map((c) => ({ ...c, label: c.label.trim() }))
        onSave({
          ...g,
          name: g.name.trim(),
          categories: kind === 'sheet' ? cats : undefined,
          scoreLabel: g.scoreLabel?.trim() || undefined,
          variantLabel: g.variantLabel?.trim() || undefined,
          rules: g.rules?.trim() || undefined,
          // un jeu du catalogue modifié à la main garde ses propres règles
          edited: g.catalogId ? true : undefined,
        })
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
        <span>Comment compte-t-on ?</span>
        <div className="choice-2">
          {(
            [
              ['points', 'Skyjo, Tarot, Uno…'],
              ['wins', 'Échecs, duels, jeux sans points'],
              ['sheet', '7 Wonders, Cascadia…'],
              ['coop', 'Unlock!, Pandemic…'],
            ] as [GameKind, string][]
          ).map(([k, ex]) => (
            <button type="button" key={k} className={kind === k ? 'selected' : ''} aria-pressed={kind === k} onClick={() => setKind(k)}>
              <b>{KIND_EMOJIS[k]} {KIND_LABELS[k]}</b>
              <small>{ex}</small>
            </button>
          ))}
        </div>
      </div>

      {kind === 'sheet' && (
        <div className="field">
          <span>Catégories de la feuille de score</span>
          <small className="muted">Dans l'ordre du décompte. L'app les fera compter une par une à la fin de la partie.</small>
          {categories.map((c, i) => (
            <div key={c.id} className="inline-field">
              <input type="text" className="grow-input" value={c.label} placeholder={`Catégorie ${i + 1}`} maxLength={40} aria-label={`Catégorie ${i + 1}`} onChange={(e) => setCategory(i, e.target.value)} />
              <button type="button" className="icon-btn small" aria-label={`Retirer la catégorie ${i + 1}`} onClick={() => set({ categories: categories.filter((_, j) => j !== i) })}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="btn dashed" onClick={() => set({ categories: [...categories, { id: uid(), label: '' }] })}>
            + Ajouter une catégorie
          </button>
        </div>
      )}

      {kind === 'coop' && (
        <>
          <label className="field">
            <span>
              Score à noter en cas de victoire <small className="muted">(facultatif)</small>
            </span>
            <input type="text" value={g.scoreLabel ?? ''} placeholder="Ex. : Étoiles, Temps restant…" maxLength={30} onChange={(e) => set({ scoreLabel: e.target.value })} />
          </label>
          <label className="field">
            <span>
              Scénario ou niveau à noter <small className="muted">(facultatif)</small>
            </span>
            <input type="text" value={g.variantLabel ?? ''} placeholder="Ex. : Scénario, Difficulté…" maxLength={30} onChange={(e) => set({ variantLabel: e.target.value })} />
          </label>
        </>
      )}

      {(kind === 'points' || kind === 'sheet') && (
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
      )}

      {kind === 'wins' && (
        <div className="field">
          <span>Combien de manches ?</span>
          <div className="segmented">
            {(
              [
                ['one', 'Une seule'],
                ['rounds', 'Un nombre fixe'],
                ['target', 'Jusqu\'à N victoires'],
                ['none', 'Quand on veut'],
              ] as const
            ).map(([v, l]) => {
              const current = g.endMode === 'rounds' && g.maxRounds === 1 ? 'one' : g.endMode
              return (
                <button
                  type="button"
                  key={v}
                  className={current === v ? 'selected' : ''}
                  aria-pressed={current === v}
                  onClick={() => set(v === 'one' ? { endMode: 'rounds', maxRounds: 1 } : { endMode: v, maxRounds: v === 'rounds' && g.maxRounds === 1 ? 3 : g.maxRounds })}
                >
                  {l}
                </button>
              )
            })}
          </div>
          {g.endMode === 'rounds' && g.maxRounds > 1 && (
            <div className="inline-field">
              <small className="muted">On joue</small>
              <Stepper value={g.maxRounds} min={2} onChange={(n) => set({ maxRounds: Math.max(2, Math.round(n)) })} label="Nombre de manches" />
              <small className="muted">manches, le plus de victoires gagne</small>
            </div>
          )}
          {g.endMode === 'target' && (
            <div className="inline-field">
              <small className="muted">Le premier à</small>
              <Stepper value={g.target} min={1} onChange={(n) => set({ target: Math.max(1, Math.round(n)) })} label="Victoires nécessaires" />
              <small className="muted">victoires gagne</small>
            </div>
          )}
        </div>
      )}

      {kind === 'points' && (
      <>
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
      </>
      )}

      <label className="field">
        <span>
          Rappel des règles <small className="muted">(facultatif)</small>
        </span>
        <textarea value={g.rules ?? ''} rows={3} maxLength={600} placeholder="Ex. : comment on compte, quand la partie s'arrête…" onChange={(e) => set({ rules: e.target.value })} />
        <small className="muted">Affiché en haut de l'écran pendant la partie.</small>
      </label>

      <button type="submit" className="btn primary big block" disabled={!valid}>
        {submitLabel}
      </button>
    </form>
  )
}
