import { useState } from 'react'
import { hasScores, kindOf, progressLabel, summaryLabel, winners } from '../logic'
import { useStore } from '../store'
import type { Match } from '../types'
import { Avatar, Header, Hint, fmtDate, fmtTime, go } from '../ui'

export default function History() {
  const { state } = useStore()
  const [filter, setFilter] = useState<string | null>(null)
  const all = [...state.matches].sort((a, b) => b.createdAt - a.createdAt)
  const games = [...new Map(all.map((m) => [m.gameTypeId, m])).values()]
  const list = filter ? all.filter((m) => m.gameTypeId === filter) : all
  const playing = list.filter((m) => m.status === 'playing')
  const done = list.filter((m) => m.status === 'finished')

  return (
    <div className="page">
      <Header title="Parties" />
      {all.length === 0 ? (
        <div className="empty">
          <p>📜</p>
          <p>Aucune partie pour l'instant. Toutes vos parties seront gardées ici, même si vous fermez l'app.</p>
          <button className="btn primary" onClick={() => go('nouvelle')}>
            + Lancer une partie
          </button>
        </div>
      ) : (
        <>
          {games.length > 1 && (
            <div className="chips scroll">
              <button className={`chip ${!filter ? 'selected' : ''}`} onClick={() => setFilter(null)}>
                Tous les jeux
              </button>
              {games.map((m) => (
                <button key={m.gameTypeId} className={`chip ${filter === m.gameTypeId ? 'selected' : ''}`} onClick={() => setFilter(m.gameTypeId)}>
                  {m.gameEmoji} {m.gameName}
                </button>
              ))}
            </div>
          )}
          {playing.length > 0 && (
            <>
              <h2 className="section-title">En cours</h2>
              {playing.map((m) => (
                <MatchRow key={m.id} m={m} />
              ))}
            </>
          )}
          {done.length > 0 && (
            <>
              <h2 className="section-title">Terminées</h2>
              {done.map((m) => (
                <MatchRow key={m.id} m={m} />
              ))}
            </>
          )}
          <Hint>Touchez une partie pour revoir le détail des manches, la reprendre ou la supprimer.</Hint>
        </>
      )}
    </div>
  )
}

function MatchRow({ m }: { m: Match }) {
  const w = m.status === 'finished' && hasScores(m) && kindOf(m) !== 'coop' ? winners(m) : []
  return (
    <button className="card match-card" onClick={() => go(`partie/${m.id}`)}>
      <span className="game-emoji">{m.gameEmoji}</span>
      <span className="grow">
        <b>{m.gameName}</b>
        <span className="avatars">
          {m.players.map((p) => (
            <Avatar key={p.id} emoji={p.emoji} color={p.color} size={22} />
          ))}
        </span>
        <span className="muted small">
          {fmtDate(m.createdAt)} à {fmtTime(m.createdAt)} · {m.status === 'playing' ? progressLabel(m) : summaryLabel(m)}
        </span>
        {w.length > 0 && <span className="small">🏆 {w.map((p) => p.name).join(' et ')}</span>}
      </span>
      {m.status === 'playing' ? <span className="pill">Reprendre ›</span> : <span className="chev">›</span>}
    </button>
  )
}
