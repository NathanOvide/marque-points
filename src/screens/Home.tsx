import { useState } from 'react'
import brand from 'virtual:brand'
import { isStandalone, useInstallPrompt } from '../install'
import { standings } from '../logic'
import { useStore } from '../store'
import { Avatar, fmtDate, go } from '../ui'

export default function Home() {
  const { state } = useStore()
  const install = useInstallPrompt()
  const [hideInstall, setHideInstall] = useState(() => {
    try {
      return localStorage.getItem('mp:hide-install') === '1'
    } catch {
      return false
    }
  })

  const playing = state.matches.filter((m) => m.status === 'playing').sort((a, b) => b.createdAt - a.createdAt)
  const lastDone = state.matches.filter((m) => m.status === 'finished').sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))[0]
  const firstTime = state.matches.length === 0

  return (
    <div className="page">
      <div className="hero">
        {brand.logo ? (
          <picture>
            {brand.logoDark && <source srcSet={brand.logoDark} media="(prefers-color-scheme: dark)" />}
            <img className="hero-logo" src={brand.logo} alt={brand.name} />
          </picture>
        ) : (
          <div className="hero-emoji" aria-hidden>
            🎲
          </div>
        )}
        <h1>Marque-Points</h1>
        <p>{brand.tagline}</p>
        {brand.ornament && <img className="ornament" src={brand.ornament} alt="" />}
      </div>

      {firstTime && (
        <section className="card welcome">
          <h2>{brand.welcome} 👋</h2>
          <ol className="steps">
            <li>
              <b>Choisissez le jeu</b> : Skyjo, Tarot, Yams… Vous indiquez une seule fois si c'est le plus haut ou le plus bas score qui gagne.
            </li>
            <li>
              <b>Ajoutez les joueurs</b> : ils sont gardés pour les prochaines parties.
            </li>
            <li>
              <b>Notez les points</b> à la fin de chaque manche. L'app fait les totaux et le classement.
            </li>
          </ol>
          <p className="muted small">Tout est enregistré sur ce téléphone. Vous pouvez fermer l'app : la partie vous attendra.</p>
        </section>
      )}

      <button className="btn primary big block" onClick={() => go('nouvelle')}>
        + Nouvelle partie
      </button>

      {playing.length > 0 && (
        <section>
          <h2 className="section-title">Partie{playing.length > 1 ? 's' : ''} en cours</h2>
          {playing.map((m) => {
            const lead = standings(m)[0]
            return (
              <button key={m.id} className="card match-card" onClick={() => go(`partie/${m.id}`)}>
                <span className="game-emoji">{m.gameEmoji}</span>
                <span className="grow">
                  <b>{m.gameName}</b>
                  <span className="muted small">
                    Manche {m.rounds.length + 1} · {m.players.length} joueurs
                    {lead && m.rounds.length > 0 && ` · ${lead.player.name} en tête`}
                  </span>
                </span>
                <span className="pill">Reprendre ›</span>
              </button>
            )
          })}
        </section>
      )}

      {lastDone && (
        <section>
          <h2 className="section-title">On remet ça ?</h2>
          <button
            className="card match-card"
            onClick={() => go(`nouvelle?jeu=${lastDone.gameTypeId}&joueurs=${lastDone.players.map((p) => p.id).join(',')}`)}
          >
            <span className="game-emoji">{lastDone.gameEmoji}</span>
            <span className="grow">
              <b>Rejouer à {lastDone.gameName}</b>
              <span className="avatars">
                {lastDone.players.map((p) => (
                  <Avatar key={p.id} emoji={p.emoji} color={p.color} size={24} />
                ))}
              </span>
              <span className="muted small">Mêmes joueurs · dernière partie le {fmtDate(lastDone.finishedAt ?? lastDone.createdAt)}</span>
            </span>
            <span className="pill">↻</span>
          </button>
        </section>
      )}

      {!isStandalone() && !hideInstall && (
        <section className="card install">
          <h2>📲 Installez l'app</h2>
          <p className="small">
            Ajoutez {brand.name} à l'écran d'accueil : elle s'ouvre comme une vraie app, marche sans internet et vos parties sont mieux protégées.
          </p>
          <div className="row-actions">
            <button
              className="btn"
              onClick={() => {
                setHideInstall(true)
                try {
                  localStorage.setItem('mp:hide-install', '1')
                } catch {
                  /* ignore */
                }
              }}
            >
              Plus tard
            </button>
            {install ? (
              <button className="btn primary" onClick={install}>
                Installer
              </button>
            ) : (
              <button className="btn primary" onClick={() => go('aide')}>
                Comment faire&nbsp;?
              </button>
            )}
          </div>
        </section>
      )}

      <footer className="footer">
        <button className="link" onClick={() => go('aide')}>
          ❓ Aide et installation
        </button>
        {brand.link && (
          <a className="link small" href={brand.link.url} target="_blank" rel="noopener">
            {brand.link.label} ↗
          </a>
        )}
        <span className="muted small">Version {__APP_VERSION__}</span>
      </footer>
    </div>
  )
}
