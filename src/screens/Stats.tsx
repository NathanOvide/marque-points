import { useState } from 'react'
import { computeStats } from '../logic'
import { useStore } from '../store'
import { Avatar, COLOR_COUNT, Header, go } from '../ui'

export default function Stats() {
  const { state } = useStore()
  const [filter, setFilter] = useState<string | null>(null)
  const games = [...new Map(state.matches.filter((m) => m.status === 'finished').map((m) => [m.gameTypeId, m])).values()]
  const stats = computeStats(state.matches, filter ?? undefined)

  if (!computeStats(state.matches).total) {
    return (
      <div className="page">
        <Header title="Statistiques" />
        <div className="empty">
          <p>📊</p>
          <p>Les statistiques apparaîtront dès votre première partie terminée : victoires, jeux préférés, records…</p>
          <button className="btn primary" onClick={() => go('nouvelle')}>
            + Lancer une partie
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <Header title="Statistiques" />
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

      <div className="stat-tiles">
        <div className="card tile">
          <span className="tile-value">{stats.total}</span>
          <span className="muted small">partie{stats.total > 1 ? 's' : ''} terminée{stats.total > 1 ? 's' : ''}</span>
        </div>
        {stats.players[0] && (
          <div className="card tile">
            <span className="tile-value">
              {stats.players[0].emoji} {stats.players[0].name}
            </span>
            <span className="muted small">
              champion·ne avec {stats.players[0].wins} victoire{stats.players[0].wins > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <h2 className="section-title">Classement des joueurs</h2>
      <div className="list">
        {stats.players.map((p, i) => (
          <div key={p.id} className="card stat-player">
            <span className="rank">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
            <Avatar emoji={p.emoji} color={p.color} />
            <span className="grow">
              <b>{p.name}</b>
              <span className="muted small">
                {p.wins} victoire{p.wins > 1 ? 's' : ''} sur {p.played} partie{p.played > 1 ? 's' : ''}
              </span>
              <span className="bar" aria-hidden>
                <span style={{ width: `${p.winRate * 100}%`, background: `var(--p${p.color % COLOR_COUNT})` }} />
              </span>
              {!filter && p.favoriteGame && (
                <span className="muted small">
                  Joue surtout à {p.favoriteGame}
                  {p.bestGame && ` · imbattable à ${p.bestGame}`}
                </span>
              )}
            </span>
            <span className="total">{Math.round(p.winRate * 100)}%</span>
          </div>
        ))}
      </div>

      <h2 className="section-title">Par jeu</h2>
      <div className="list">
        {stats.games.map((g) => (
          <div key={g.name} className="card list-item">
            <span className="game-emoji">{g.emoji}</span>
            <span className="grow">
              <b>{g.name}</b>
              <span className="muted small">
                {g.played} partie{g.played > 1 ? 's' : ''}
                {g.topWinner && ` · 👑 ${g.topWinner}`}
              </span>
              {g.record && (
                <span className="muted small">
                  Record : {g.record.total} pts par {g.record.name} ({g.winMode === 'high' ? 'plus haut' : 'plus bas'} score)
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
