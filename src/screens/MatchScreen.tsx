import { useState, type ReactNode } from 'react'
import ScoreChart from '../components/ScoreChart'
import { dealerFor, describeRules, endReason, hasScores, kindOf, sheetProgress, standings, totals, uid, winners } from '../logic'
import { useStore } from '../store'
import type { Category, CoopResult, Match, MatchPlayer, Round } from '../types'
import { Avatar, Confirm, Header, Hint, NumberInput, Sheet, fmtDate, go, haptic, signed, toast, useWakeLock } from '../ui'

type Tab = 'classement' | 'tableau' | 'graphique'
const MEDALS = ['🥇', '🥈', '🥉']

/** Rappel des règles du jeu, ouvert tant que rien n'est noté. */
export function RulesCard({ rules, open }: { rules?: string; open?: boolean }) {
  if (!rules) return null
  return (
    <details className="card rules" open={open}>
      <summary>📖 Rappel des règles</summary>
      <p>{rules}</p>
    </details>
  )
}

export default function MatchScreen({ match }: { match: Match }) {
  const { update } = useStore()
  const [tab, setTab] = useState<Tab>('classement')
  const [entry, setEntry] = useState<{ roundId: string | null } | null>(null)
  const [catEntry, setCatEntry] = useState<Category | null>(null)
  const [coopEntry, setCoopEntry] = useState<boolean | null>(null)
  const [menu, setMenu] = useState(false)
  const [confirm, setConfirm] = useState<'finish' | 'delete' | null>(null)
  const [endPrompt, setEndPrompt] = useState<string | null>(null)

  const playing = match.status === 'playing'
  useWakeLock(playing)
  const kind = kindOf(match)
  const scored = hasScores(match)
  const sheet = sheetProgress(match)
  const unit = kind === 'wins' ? 'victoire' : 'pt'

  const rows = standings(match)
  const roundNo = match.rounds.length + 1
  const dealer = match.players[dealerFor(match, match.rounds.length)]

  const setMatch = (fn: (m: Match) => Match) => update((s) => ({ ...s, matches: s.matches.map((m) => (m.id === match.id ? fn(m) : m)) }))

  const finish = (coop?: CoopResult) => {
    setMatch((m) => ({ ...m, status: 'finished', finishedAt: Date.now(), ...(coop ? { coop } : {}) }))
    haptic(60)
    setConfirm(null)
    setEndPrompt(null)
    setTab('classement')
    window.scrollTo(0, 0)
  }

  const saveRound = (scores: Record<string, number>, roundId: string | null) => {
    if (roundId) {
      setMatch((m) => ({ ...m, rounds: m.rounds.map((r) => (r.id === roundId ? { ...r, scores } : r)) }))
      toast('Manche modifiée ✓')
    } else {
      const round: Round = { id: uid(), scores, at: Date.now() }
      const next = { ...match, rounds: [...match.rounds, round] }
      setMatch((m) => ({ ...m, rounds: [...m.rounds, round] }))
      toast(`Manche ${next.rounds.length} enregistrée ✓`, {
        label: 'Annuler',
        run: () => setMatch((m) => ({ ...m, rounds: m.rounds.filter((r) => r.id !== round.id) })),
      })
      const reason = endReason(next)
      if (reason) setEndPrompt(reason)
    }
    haptic(25)
    setEntry(null)
  }

  const saveCategory = (cat: Category, scores: Record<string, number>) => {
    const next = { ...match, sheet: { ...match.sheet, [cat.id]: scores } }
    const correction = match.sheet?.[cat.id] !== undefined
    setMatch((m) => ({ ...m, sheet: { ...m.sheet, [cat.id]: scores } }))
    haptic(25)
    const nextCat = sheetProgress(next).next
    setCatEntry(null)
    const reason = endReason(next)
    // pendant le décompte, on enchaîne directement sur la catégorie suivante
    if (correction) toast(`${cat.label} corrigé ✓`)
    else if (reason) setEndPrompt(reason)
    else if (nextCat) setTimeout(() => setCatEntry(nextCat), 250)
  }

  const deleteRound = (roundId: string) => {
    const removed = match.rounds.find((r) => r.id === roundId)
    const index = match.rounds.findIndex((r) => r.id === roundId)
    setMatch((m) => ({ ...m, rounds: m.rounds.filter((r) => r.id !== roundId) }))
    setEntry(null)
    if (removed)
      toast(`Manche ${index + 1} supprimée`, {
        label: 'Annuler',
        run: () =>
          setMatch((m) => {
            const rounds = [...m.rounds]
            rounds.splice(index, 0, removed)
            return { ...m, rounds }
          }),
      })
  }

  const progress = (total: number) => {
    if (match.endMode !== 'target' || !match.target) return null
    const start = Math.min(0, match.target)
    return Math.max(0, Math.min(1, (total - start) / (match.target - start)))
  }

  return (
    <div className={`page match ${playing ? 'has-cta' : ''}`}>
      <Header
        title={`${match.gameEmoji} ${match.gameName}`}
        back=""
        action={
          <button className="icon-btn" aria-label="Options de la partie" onClick={() => setMenu(true)}>
            ⋯
          </button>
        }
      />

      <p className="match-meta muted small center">
        {describeRules(match)} · {fmtDate(match.createdAt)}
      </p>

      {!playing && <Podium match={match} />}

      {playing && <RulesCard rules={match.rules} />}

      {playing && kind === 'coop' && (
        <div className="card team">
          <div className="avatars center">
            {match.players.map((p) => (
              <Avatar key={p.id} emoji={p.emoji} color={p.color} size={48} />
            ))}
          </div>
          <p className="center">
            <b>{match.players.map((p) => p.name).join(', ')}</b>
            <br />
            <span className="muted small">jouent ensemble. À la fin, indiquez si vous avez gagné ou perdu.</span>
          </p>
        </div>
      )}

      {playing && kind === 'sheet' && (
        <div className="round-banner">
          <span className="round-no">Décompte final</span>
          <span className="dealer">
            {sheet.done
              ? `${sheet.done} catégorie${sheet.done > 1 ? 's' : ''} sur ${sheet.total} comptée${sheet.done > 1 ? 's' : ''}`
              : 'Quand la partie est finie, touchez « Compter » en bas : l\'app vous guide catégorie par catégorie.'}
          </span>
        </div>
      )}

      {playing && (kind === 'points' || kind === 'wins') && (
        <div className="round-banner">
          <span className="round-no">Manche {roundNo}</span>
          {match.endMode === 'rounds' && <span className="muted small"> sur {match.maxRounds}</span>}
          {dealer && match.players.length > 1 && (
            <span className="dealer">
              <Avatar emoji={dealer.emoji} color={dealer.color} size={22} /> <b>{dealer.name}</b> distribue / commence
            </span>
          )}
        </div>
      )}

      {kind !== 'coop' && (
      <div className="tabs" role="tablist">
        {(
          [
            ['classement', '🏆 Classement'],
            ['tableau', kind === 'sheet' ? '📋 Feuille' : '📋 Manches'],
            ...(kind === 'points' ? [['graphique', '📈 Graphique']] : []),
          ] as [Tab, string][]
        ).map(([t, l]) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {l}
          </button>
        ))}
      </div>
      )}

      {tab === 'classement' && kind !== 'coop' && (
        <div className="list">
          {!scored && playing && kind !== 'sheet' && (
            <Hint>
              {kind === 'wins' ? (
                <>
                  Jouez la première manche, puis touchez le bouton en bas de l'écran pour indiquer <b>qui a gagné</b>.
                </>
              ) : (
                <>
                  Jouez la première manche, puis touchez <b>« Saisir la manche 1 »</b> en bas de l'écran pour noter les points de chacun.
                </>
              )}
            </Hint>
          )}
          {rows.map((s) => {
            const pr = progress(s.total)
            const lastRound = match.rounds[match.rounds.length - 1]
            const delta = kind === 'points' ? lastRound?.scores[s.player.id] : undefined
            return (
              <div key={s.player.id} className={`card standing ${s.rank === 1 && scored ? 'leader' : ''}`}>
                <span className="rank">{scored ? (MEDALS[s.rank - 1] ?? s.rank) : ''}</span>
                <Avatar emoji={s.player.emoji} color={s.player.color} size={44} />
                <span className="grow">
                  <b>{s.player.name}</b>
                  <span className="muted small">
                    {!scored ? 'Prêt·e à jouer' : s.gap === 0 ? (rows.filter((r) => r.rank === 1).length > 1 ? 'Ex æquo en tête' : 'En tête') : `à ${s.gap} ${unit}${s.gap > 1 ? 's' : ''} du 1er`}
                    {delta !== undefined && delta !== 0 && <span className={(delta > 0) === (match.winMode === 'high') ? 'delta up' : 'delta down'}> ({signed(delta)})</span>}
                  </span>
                  {pr !== null && (
                    <span className="bar" aria-hidden>
                      <span style={{ width: `${pr * 100}%`, background: `var(--p${s.player.color % 8})` }} />
                    </span>
                  )}
                </span>
                <span className="total">
                  {s.total}
                  {kind === 'wins' && <small className="total-unit">{s.total > 1 ? 'victoires' : 'victoire'}</small>}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'tableau' && kind === 'sheet' && <SheetTable match={match} onEdit={playing ? setCatEntry : undefined} />}
      {tab === 'tableau' && (kind === 'points' || kind === 'wins') && <RoundsTable match={match} onEdit={(roundId) => setEntry({ roundId })} editable />}

      {tab === 'graphique' &&
        (match.rounds.length ? <ScoreChart match={match} /> : <Hint>Le graphique apparaîtra après la première manche.</Hint>)}

      {playing && (
        <div className="sticky-bottom">
          {kind === 'points' && (
            <button className="btn primary big block" onClick={() => setEntry({ roundId: null })}>
              ✏️ Saisir la manche {roundNo}
            </button>
          )}
          {kind === 'wins' && (
            <button className="btn primary big block" onClick={() => setEntry({ roundId: null })}>
              🏆 {match.endMode === 'rounds' && match.maxRounds === 1 ? 'Qui a gagné ?' : `Qui a gagné la manche ${roundNo} ?`}
            </button>
          )}
          {kind === 'sheet' &&
            (sheet.next ? (
              <button className="btn primary big block" onClick={() => setCatEntry(sheet.next)}>
                ✏️ Compter : {sheet.next.emoji} {sheet.next.label}
              </button>
            ) : (
              <button className="btn primary big block" onClick={() => finish()}>
                🏁 Voir le vainqueur
              </button>
            ))}
          {kind === 'coop' && (
            <div className="row-actions">
              <button className="btn big" onClick={() => setCoopEntry(false)}>
                😞 Perdu
              </button>
              <button className="btn primary big" onClick={() => setCoopEntry(true)}>
                🎉 Gagné !
              </button>
            </div>
          )}
        </div>
      )}

      {!playing && (
        <div className="end-actions">
          <button className="btn primary big block" onClick={() => go(`nouvelle?jeu=${match.gameTypeId}&joueurs=${match.players.map((p) => p.id).join(',')}`)}>
            ↻ Rejouer avec les mêmes joueurs
          </button>
          <button className="btn block" onClick={() => go('nouvelle')}>
            + Autre jeu
          </button>
        </div>
      )}

      {entry && kind === 'wins' && (
        <WinEntry
          match={match}
          round={match.rounds.find((r) => r.id === entry.roundId) ?? null}
          onClose={() => setEntry(null)}
          onSave={(sc) => saveRound(sc, entry.roundId)}
          onDelete={entry.roundId ? () => deleteRound(entry.roundId!) : undefined}
        />
      )}

      {catEntry && (
        <ScoreEntry
          title={`${catEntry.emoji ?? ''} ${catEntry.label}`.trim()}
          help={catEntry.hint ?? 'Entrez les points de chaque joueur pour cette catégorie (vide = 0).'}
          players={match.players}
          initial={match.sheet?.[catEntry.id]}
          before={totals({ ...match, sheet: Object.fromEntries(Object.entries(match.sheet ?? {}).filter(([k]) => k !== catEntry.id)) })}
          submitLabel={match.sheet?.[catEntry.id] ? 'Enregistrer la correction' : sheet.done + 1 < sheet.total ? 'Valider et continuer' : 'Valider'}
          onClose={() => setCatEntry(null)}
          onSave={(sc) => saveCategory(catEntry, sc)}
        />
      )}

      {coopEntry !== null && (
        <CoopEntry
          match={match}
          won={coopEntry}
          onClose={() => setCoopEntry(null)}
          onSave={(r) => {
            setCoopEntry(null)
            finish(r)
          }}
        />
      )}

      {entry && kind === 'points' && (
        <RoundEntry
          match={match}
          round={match.rounds.find((r) => r.id === entry.roundId) ?? null}
          onClose={() => setEntry(null)}
          onSave={(sc) => saveRound(sc, entry.roundId)}
          onDelete={entry.roundId ? () => deleteRound(entry.roundId!) : undefined}
        />
      )}

      <Sheet open={menu} onClose={() => setMenu(false)} title="Options de la partie">
        <div className="menu">
          {playing ? (
            <button
              className="menu-item"
              onClick={() => {
                setMenu(false)
                setConfirm('finish')
              }}
            >
              🏁 Terminer la partie
            </button>
          ) : (
            <button
              className="menu-item"
              onClick={() => {
                setMatch((m) => ({ ...m, status: 'playing', finishedAt: undefined, coop: undefined }))
                setMenu(false)
                toast('Partie reprise')
              }}
            >
              ▶️ {kind === 'coop' ? 'Reprendre la partie (changer le résultat)' : kind === 'sheet' ? 'Reprendre la partie (corriger le décompte)' : 'Reprendre la partie (ajouter des manches)'}
            </button>
          )}
          {scored && kind !== 'coop' && (
            <button
              className="menu-item"
              onClick={() => {
                setMenu(false)
                setTab('tableau')
              }}
            >
              ✏️ {kind === 'sheet' ? 'Corriger une catégorie' : 'Corriger une manche'}
            </button>
          )}
          <button
            className="menu-item danger"
            onClick={() => {
              setMenu(false)
              setConfirm('delete')
            }}
          >
            🗑️ Supprimer la partie
          </button>
        </div>
      </Sheet>

      <Confirm
        open={confirm === 'finish'}
        title="Terminer la partie ?"
        message={
          kind === 'coop'
            ? 'Aucun résultat ne sera enregistré. Pour noter une victoire ou une défaite, utilisez plutôt les boutons en bas de l\'écran.'
            : scored
              ? `Vainqueur : ${winners(match).map((w) => w.name).join(' et ')}. Vous pourrez la reprendre plus tard si besoin.`
              : 'Aucun score n\'a été noté.'
        }
        confirmLabel="🏁 Terminer"
        onConfirm={() => finish()}
        onCancel={() => setConfirm(null)}
      />
      <Confirm
        open={confirm === 'delete'}
        title="Supprimer la partie ?"
        message="Elle disparaîtra de l'historique et des statistiques. C'est définitif."
        confirmLabel="Supprimer"
        danger
        onConfirm={() => {
          go('', true)
          update((s) => ({ ...s, matches: s.matches.filter((m) => m.id !== match.id) }))
          toast('Partie supprimée')
        }}
        onCancel={() => setConfirm(null)}
      />
      <Confirm
        open={endPrompt !== null}
        title="🏁 Fin de la partie ?"
        message={`${endPrompt} Selon les règles choisies, la partie est terminée.`}
        confirmLabel="Voir le vainqueur"
        onConfirm={() => finish()}
        onCancel={() => setEndPrompt(null)}
      />
    </div>
  )
}

function Podium({ match }: { match: Match }) {
  const w = winners(match)
  const kind = kindOf(match)
  if (kind === 'coop' && match.coop) {
    const { won, score, variant } = match.coop
    return (
      <div className="podium card">
        <div className="confetti" aria-hidden>
          {won ? '🎉' : '😞'}
        </div>
        <div className="avatars center">
          {match.players.map((p) => (
            <Avatar key={p.id} emoji={p.emoji} color={p.color} size={56} />
          ))}
        </div>
        <h2>{won ? 'Victoire de l\'équipe !' : 'Perdu… la revanche ?'}</h2>
        {(variant || score !== undefined) && (
          <p className="muted small">
            {variant && `${match.variantLabel ?? 'Scénario'} : ${variant}`}
            {variant && score !== undefined && ' · '}
            {score !== undefined && `${(match.scoreLabel ?? 'Score').replace(/\s*\(.*\)/, '')} : ${score}`}
          </p>
        )}
      </div>
    )
  }
  if (!hasScores(match)) return <Hint>Partie terminée sans score noté.</Hint>
  return (
    <div className="podium card">
      <div className="confetti" aria-hidden>
        🎉
      </div>
      <div className="avatars center">
        {w.map((p) => (
          <Avatar key={p.id} emoji={p.emoji} color={p.color} size={72} />
        ))}
      </div>
      <h2>
        {w.map((p) => p.name).join(' et ')} {w.length > 1 ? 'gagnent' : 'gagne'} !
      </h2>
      <p className="muted small">
        {kind === 'sheet'
          ? `${totals(match)[w[0].id]} points`
          : `Partie terminée en ${match.rounds.length} manche${match.rounds.length > 1 ? 's' : ''}`}
      </p>
    </div>
  )
}

export function RoundsTable({ match, onEdit, editable }: { match: Match; onEdit?: (roundId: string) => void; editable?: boolean }) {
  const t = totals(match)
  const hasInitial = match.players.some((p) => p.initialScore !== 0)
  if (!match.rounds.length && !hasInitial) return <Hint>Aucune manche pour l'instant. Elles s'afficheront ici, et vous pourrez toucher une ligne pour la corriger.</Hint>
  return (
    <>
      {editable && match.rounds.length > 0 && <Hint>Une erreur ? Touchez une manche pour la corriger ou la supprimer.</Hint>}
      <div className="table-wrap">
        <table className="rounds">
          <thead>
            <tr>
              <th scope="col">Manche</th>
              {match.players.map((p) => (
                <th key={p.id} scope="col">
                  <Avatar emoji={p.emoji} color={p.color} size={26} />
                  <span className="th-name">{p.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hasInitial && (
              <tr className="muted">
                <th scope="row">Départ</th>
                {match.players.map((p) => (
                  <td key={p.id}>{p.initialScore}</td>
                ))}
              </tr>
            )}
            {match.rounds.map((r, i) => (
              <tr key={r.id} className={editable ? 'clickable' : ''} onClick={() => editable && onEdit?.(r.id)}>
                <th scope="row">
                  {i + 1}
                  {editable && <span className="edit-ico"> ✎</span>}
                </th>
                {match.players.map((p) => (
                  <td key={p.id}>{kindOf(match) === 'wins' ? (r.scores[p.id] ? '🏆' : '') : (r.scores[p.id] ?? 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              {match.players.map((p) => (
                <td key={p.id}>{t[p.id]}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}

/** Feuille de score (mode sheet) : une ligne par catégorie, touchable pour corriger. */
function SheetTable({ match, onEdit }: { match: Match; onEdit?: (c: Category) => void }) {
  const t = totals(match)
  return (
    <>
      {onEdit && hasScores(match) && <Hint>Une erreur ? Touchez une catégorie pour la corriger.</Hint>}
      <div className="table-wrap">
        <table className="rounds">
          <thead>
            <tr>
              <th scope="col">Catégorie</th>
              {match.players.map((p) => (
                <th key={p.id} scope="col">
                  <Avatar emoji={p.emoji} color={p.color} size={26} />
                  <span className="th-name">{p.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(match.categories ?? []).map((c) => {
              const row = match.sheet?.[c.id]
              return (
                <tr key={c.id} className={onEdit ? 'clickable' : ''} onClick={() => onEdit?.(c)}>
                  <th scope="row" className="cat">
                    {c.emoji} {c.label}
                    {onEdit && <span className="edit-ico"> ✎</span>}
                  </th>
                  {match.players.map((p) => (
                    <td key={p.id} className={row ? '' : 'muted'}>
                      {row ? (row[p.id] ?? 0) : '·'}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              {match.players.map((p) => (
                <td key={p.id}>{t[p.id]}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}

/** Saisie d'un score pour chaque joueur (une manche, ou une catégorie de la feuille de score). */
function ScoreEntry({ title, help, players, initial, before, submitLabel, onClose, onSave, onDelete, deleteLabel }: {
  title: string
  help: ReactNode
  players: MatchPlayer[] // dans l'ordre de saisie
  initial?: Record<string, number>
  before: Record<string, number>
  submitLabel: string
  onClose: () => void
  onSave: (scores: Record<string, number>) => void
  onDelete?: () => void
  deleteLabel?: string
}) {
  const [scores, setScores] = useState<Record<string, number>>(() => ({ ...(initial ?? {}) }))
  // Signe « − » mémorisé par joueur : le pavé numérique de l'iPhone n'a pas de touche moins
  const [neg, setNeg] = useState<Record<string, boolean>>(() => Object.fromEntries(Object.entries(initial ?? {}).map(([k, v]) => [k, v < 0])))
  const [confirmDelete, setConfirmDelete] = useState(false)

  const focusNext = (i: number) => {
    const inputs = document.querySelectorAll<HTMLInputElement>('.entry-row input')
    if (inputs[i + 1]) inputs[i + 1].focus()
    else (document.activeElement as HTMLElement | null)?.blur()
  }

  return (
    <Sheet open onClose={onClose} title={title}>
      <p className="muted small">{help}</p>
      <div className="entry">
        {players.map((p, i) => {
          const v = scores[p.id]
          return (
            <div key={p.id} className="entry-row">
              <Avatar emoji={p.emoji} color={p.color} size={36} />
              <span className="grow">
                <b>{p.name}</b>
                <span className="muted small">
                  {before[p.id]} → <b>{before[p.id] + (v ?? 0)}</b>
                </span>
              </span>
              <button
                type="button"
                className={`sign ${neg[p.id] ? 'neg' : ''}`}
                aria-label={neg[p.id] ? `Points négatifs pour ${p.name} (toucher pour positif)` : `Points positifs pour ${p.name} (toucher pour négatif)`}
                aria-pressed={!!neg[p.id]}
                onClick={() => {
                  haptic()
                  setNeg((n) => ({ ...n, [p.id]: !n[p.id] }))
                  setScores((s) => ({ ...s, [p.id]: -(s[p.id] ?? 0) }))
                }}
              >
                {neg[p.id] ? '−' : '+'}
              </button>
              <NumberInput
                className="num big"
                value={v === undefined || v === 0 ? '' : v}
                placeholder="0"
                label={`Points de ${p.name}`}
                autoFocus={i === 0 && !initial}
                onEnter={() => focusNext(i)}
                onChange={(n) => {
                  if (n < 0) setNeg((x) => ({ ...x, [p.id]: true }))
                  setScores((s) => ({ ...s, [p.id]: neg[p.id] ? -Math.abs(n) : n }))
                }}
              />
            </div>
          )
        })}
      </div>
      <button className="btn primary big block" onClick={() => onSave(Object.fromEntries(players.map((p) => [p.id, scores[p.id] ?? 0])))}>
        ✓ {submitLabel}
      </button>
      {onDelete && (
        <button className="btn danger-ghost block" onClick={() => setConfirmDelete(true)}>
          🗑️ {deleteLabel}
        </button>
      )}
      <Confirm
        open={confirmDelete}
        title={`${deleteLabel} ?`}
        message="Les points correspondants seront retirés des totaux."
        confirmLabel="Supprimer"
        danger
        onConfirm={() => {
          setConfirmDelete(false)
          onDelete?.()
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Sheet>
  )
}

/** Saisie (ou correction) des points d'une manche pour tous les joueurs. */
function RoundEntry({ match, round, onClose, onSave, onDelete }: {
  match: Match
  round: Round | null
  onClose: () => void
  onSave: (scores: Record<string, number>) => void
  onDelete?: () => void
}) {
  const index = round ? match.rounds.findIndex((r) => r.id === round.id) : match.rounds.length
  const dealerIdx = dealerFor(match, index)
  // On saisit dans l'ordre du tour, en partant du donneur
  const order = match.players.map((_, i) => match.players[(dealerIdx + i) % match.players.length])
  return (
    <ScoreEntry
      title={round ? `Corriger la manche ${index + 1}` : `Points de la manche ${index + 1}`}
      help={
        <>
          Entrez les points marqués par chaque joueur pendant cette manche (vide = 0). Touchez <b>+</b> pour passer un score en négatif.
        </>
      }
      players={order}
      initial={round?.scores}
      before={totals(match, index)}
      submitLabel={round ? 'Enregistrer la correction' : 'Valider la manche'}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
      deleteLabel="Supprimer cette manche"
    />
  )
}

/** Mode « qui gagne chaque manche » : on touche le ou les gagnants. */
function WinEntry({ match, round, onClose, onSave, onDelete }: {
  match: Match
  round: Round | null
  onClose: () => void
  onSave: (scores: Record<string, number>) => void
  onDelete?: () => void
}) {
  const index = round ? match.rounds.findIndex((r) => r.id === round.id) : match.rounds.length
  const [picked, setPicked] = useState<string[]>(() => Object.keys(round?.scores ?? {}).filter((id) => round!.scores[id] > 0))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const single = match.endMode === 'rounds' && match.maxRounds === 1
  const save = (ids: string[]) => onSave(Object.fromEntries(match.players.map((p) => [p.id, ids.includes(p.id) ? 1 : 0])))

  return (
    <Sheet open onClose={onClose} title={single ? 'Qui a gagné ?' : round ? `Corriger la manche ${index + 1}` : `Qui a gagné la manche ${index + 1} ?`}>
      <p className="muted small">Touchez le gagnant. En cas d'égalité, touchez « Plusieurs gagnants ».</p>
      <div className="list">
        {match.players.map((p) => (
          <button
            key={p.id}
            className={`card list-item ${picked.includes(p.id) ? 'selected' : ''}`}
            aria-pressed={picked.includes(p.id)}
            onClick={() => {
              haptic()
              // nouvelle manche : un toucher suffit ; correction : on coche / décoche
              if (!round) save([p.id])
              else setPicked((x) => (x.includes(p.id) ? x.filter((i) => i !== p.id) : [...x, p.id]))
            }}
          >
            <Avatar emoji={p.emoji} color={p.color} size={44} />
            <b className="grow">{p.name}</b>
            <span aria-hidden>{picked.includes(p.id) ? '🏆' : ''}</span>
          </button>
        ))}
      </div>
      {round && (
        <button className="btn primary big block" disabled={!picked.length} onClick={() => save(picked)}>
          ✓ Enregistrer la correction
        </button>
      )}
      {!round && <MultiWinners players={match.players} onSave={save} />}
      {onDelete && (
        <button className="btn danger-ghost block" onClick={() => setConfirmDelete(true)}>
          🗑️ Supprimer cette manche
        </button>
      )}
      <Confirm
        open={confirmDelete}
        title="Supprimer la manche ?"
        message="La victoire de cette manche sera retirée."
        confirmLabel="Supprimer"
        danger
        onConfirm={() => {
          setConfirmDelete(false)
          onDelete?.()
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Sheet>
  )
}

/** Égalité : choisir plusieurs gagnants. */
function MultiWinners({ players, onSave }: { players: MatchPlayer[]; onSave: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const [ids, setIds] = useState<string[]>([])
  if (!open)
    return (
      <button className="btn block" onClick={() => setOpen(true)}>
        🤝 Plusieurs gagnants (égalité)
      </button>
    )
  return (
    <div className="field">
      <span>Gagnants à égalité</span>
      <div className="chips">
        {players.map((p) => (
          <button key={p.id} className={`chip ${ids.includes(p.id) ? 'selected' : ''}`} aria-pressed={ids.includes(p.id)} onClick={() => setIds((x) => (x.includes(p.id) ? x.filter((i) => i !== p.id) : [...x, p.id]))}>
            <Avatar emoji={p.emoji} color={p.color} size={28} />
            {p.name}
          </button>
        ))}
      </div>
      <button className="btn primary big block" disabled={ids.length < 2} onClick={() => onSave(ids)}>
        ✓ Valider l'égalité
      </button>
    </div>
  )
}

/** Résultat d'une partie coopérative, avec score et scénario facultatifs. */
function CoopEntry({ match, won, onClose, onSave }: { match: Match; won: boolean; onClose: () => void; onSave: (r: CoopResult) => void }) {
  const [score, setScore] = useState<number | null>(null)
  const [variant, setVariant] = useState('')
  return (
    <Sheet open onClose={onClose} title={won ? '🎉 Bravo l\'équipe !' : '😞 Dommage…'}>
      {match.variantLabel && (
        <label className="field">
          <span>
            {match.variantLabel} <small className="muted">(facultatif)</small>
          </span>
          <input type="text" value={variant} maxLength={60} placeholder="Ex. : la boîte ou le niveau joué" onChange={(e) => setVariant(e.target.value)} />
        </label>
      )}
      {match.scoreLabel && won && (
        <div className="field">
          <span>
            {match.scoreLabel} <small className="muted">(facultatif)</small>
          </span>
          <NumberInput className="num big" value={score ?? ''} placeholder="–" label={match.scoreLabel} onChange={(n) => setScore(n)} />
        </div>
      )}
      <button
        className="btn primary big block"
        onClick={() => onSave({ won, ...(score !== null && won ? { score } : {}), ...(variant.trim() ? { variant: variant.trim() } : {}) })}
      >
        ✓ {won ? 'Enregistrer la victoire' : 'Enregistrer la défaite'}
      </button>
    </Sheet>
  )
}
