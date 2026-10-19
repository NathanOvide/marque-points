import { useState } from 'react'
import ScoreChart from '../components/ScoreChart'
import { dealerFor, describeRules, endReason, standings, totals, uid, winners } from '../logic'
import { useStore } from '../store'
import type { Match, Round } from '../types'
import { Avatar, Confirm, Header, Hint, NumberInput, Sheet, fmtDate, go, haptic, signed, toast, useWakeLock } from '../ui'

type Tab = 'classement' | 'tableau' | 'graphique'
const MEDALS = ['🥇', '🥈', '🥉']

export default function MatchScreen({ match }: { match: Match }) {
  const { update } = useStore()
  const [tab, setTab] = useState<Tab>('classement')
  const [entry, setEntry] = useState<{ roundId: string | null } | null>(null)
  const [menu, setMenu] = useState(false)
  const [confirm, setConfirm] = useState<'finish' | 'delete' | null>(null)
  const [endPrompt, setEndPrompt] = useState<string | null>(null)

  const playing = match.status === 'playing'
  useWakeLock(playing)

  const rows = standings(match)
  const roundNo = match.rounds.length + 1
  const dealer = match.players[dealerFor(match, match.rounds.length)]

  const setMatch = (fn: (m: Match) => Match) => update((s) => ({ ...s, matches: s.matches.map((m) => (m.id === match.id ? fn(m) : m)) }))

  const finish = () => {
    setMatch((m) => ({ ...m, status: 'finished', finishedAt: Date.now() }))
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

      {playing && (
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

      <div className="tabs" role="tablist">
        {(
          [
            ['classement', '🏆 Classement'],
            ['tableau', '📋 Manches'],
            ['graphique', '📈 Graphique'],
          ] as [Tab, string][]
        ).map(([t, l]) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'classement' && (
        <div className="list">
          {match.rounds.length === 0 && playing && (
            <Hint>
              Jouez la première manche, puis touchez <b>« Saisir la manche 1 »</b> en bas de l'écran pour noter les points de chacun.
            </Hint>
          )}
          {rows.map((s) => {
            const pr = progress(s.total)
            const lastRound = match.rounds[match.rounds.length - 1]
            const delta = lastRound?.scores[s.player.id]
            return (
              <div key={s.player.id} className={`card standing ${s.rank === 1 && match.rounds.length ? 'leader' : ''}`}>
                <span className="rank">{match.rounds.length ? (MEDALS[s.rank - 1] ?? s.rank) : ''}</span>
                <Avatar emoji={s.player.emoji} color={s.player.color} size={44} />
                <span className="grow">
                  <b>{s.player.name}</b>
                  <span className="muted small">
                    {!match.rounds.length ? 'Prêt·e à jouer' : s.gap === 0 ? (rows.filter((r) => r.rank === 1).length > 1 ? 'Ex æquo en tête' : 'En tête') : `à ${s.gap} pt${s.gap > 1 ? 's' : ''} du 1er`}
                    {delta !== undefined && delta !== 0 && <span className={(delta > 0) === (match.winMode === 'high') ? 'delta up' : 'delta down'}> ({signed(delta)})</span>}
                  </span>
                  {pr !== null && (
                    <span className="bar" aria-hidden>
                      <span style={{ width: `${pr * 100}%`, background: `var(--p${s.player.color % 8})` }} />
                    </span>
                  )}
                </span>
                <span className="total">{s.total}</span>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'tableau' && <RoundsTable match={match} onEdit={(roundId) => setEntry({ roundId })} editable />}

      {tab === 'graphique' &&
        (match.rounds.length ? <ScoreChart match={match} /> : <Hint>Le graphique apparaîtra après la première manche.</Hint>)}

      {playing && (
        <div className="sticky-bottom">
          <button className="btn primary big block" onClick={() => setEntry({ roundId: null })}>
            ✏️ Saisir la manche {roundNo}
          </button>
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

      {entry && (
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
                setMatch((m) => ({ ...m, status: 'playing', finishedAt: undefined }))
                setMenu(false)
                toast('Partie reprise')
              }}
            >
              ▶️ Reprendre la partie (ajouter des manches)
            </button>
          )}
          {match.rounds.length > 0 && (
            <button
              className="menu-item"
              onClick={() => {
                setMenu(false)
                setTab('tableau')
              }}
            >
              ✏️ Corriger une manche
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
        message={match.rounds.length ? `Vainqueur : ${winners(match).map((w) => w.name).join(' et ')}. Vous pourrez la reprendre plus tard si besoin.` : 'Aucune manche n\'a été jouée.'}
        confirmLabel="🏁 Terminer"
        onConfirm={finish}
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
        onConfirm={finish}
        onCancel={() => setEndPrompt(null)}
      />
    </div>
  )
}

function Podium({ match }: { match: Match }) {
  const w = winners(match)
  if (!match.rounds.length) return <Hint>Partie terminée sans manche jouée.</Hint>
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
        Partie terminée en {match.rounds.length} manche{match.rounds.length > 1 ? 's' : ''}
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
                  <td key={p.id}>{r.scores[p.id] ?? 0}</td>
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

/** Saisie (ou correction) des points d'une manche pour tous les joueurs. */
function RoundEntry({ match, round, onClose, onSave, onDelete }: {
  match: Match
  round: Round | null
  onClose: () => void
  onSave: (scores: Record<string, number>) => void
  onDelete?: () => void
}) {
  const [scores, setScores] = useState<Record<string, number>>(() => ({ ...(round?.scores ?? {}) }))
  // Signe « − » mémorisé par joueur : le pavé numérique de l'iPhone n'a pas de touche moins
  const [neg, setNeg] = useState<Record<string, boolean>>(() => Object.fromEntries(Object.entries(round?.scores ?? {}).map(([k, v]) => [k, v < 0])))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const index = round ? match.rounds.findIndex((r) => r.id === round.id) : match.rounds.length
  const before = totals(match, index)
  const dealerIdx = dealerFor(match, index)
  // On saisit dans l'ordre du tour, en partant du donneur
  const order = match.players.map((_, i) => match.players[(dealerIdx + i) % match.players.length])

  const focusNext = (i: number) => {
    const inputs = document.querySelectorAll<HTMLInputElement>('.entry-row input')
    if (inputs[i + 1]) inputs[i + 1].focus()
    else (document.activeElement as HTMLElement | null)?.blur()
  }

  return (
    <Sheet open onClose={onClose} title={round ? `Corriger la manche ${index + 1}` : `Points de la manche ${index + 1}`}>
      <p className="muted small">Entrez les points marqués par chaque joueur pendant cette manche (vide = 0). Touchez <b>+</b> pour passer un score en négatif.</p>
      <div className="entry">
        {order.map((p, i) => {
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
                autoFocus={i === 0 && !round}
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
      <button className="btn primary big block" onClick={() => onSave(Object.fromEntries(match.players.map((p) => [p.id, scores[p.id] ?? 0])))}>
        ✓ {round ? 'Enregistrer la correction' : 'Valider la manche'}
      </button>
      {onDelete && (
        <button className="btn danger-ghost block" onClick={() => setConfirmDelete(true)}>
          🗑️ Supprimer cette manche
        </button>
      )}
      <Confirm
        open={confirmDelete}
        title="Supprimer la manche ?"
        message="Les points de cette manche seront retirés des totaux."
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
