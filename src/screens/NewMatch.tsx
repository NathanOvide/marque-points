import { useMemo, useState } from 'react'
import GameForm, { blankGame } from '../components/GameForm'
import PlayerForm, { blankPlayer } from '../components/PlayerForm'
import { describeRules, newMatch } from '../logic'
import { useStore } from '../store'
import type { GameType, Player } from '../types'
import { Avatar, Hint, Sheet, Stepper, go, haptic, queryParam } from '../ui'

type Step = 0 | 1 | 2
const STEP_TITLES = ['Le jeu', 'Les joueurs', 'Le départ']

export default function NewMatch() {
  const { state, update } = useStore()

  // Pré-remplissage : « Rejouer » (jeu + joueurs) ou joueurs de la dernière partie
  const presetGame = queryParam('jeu')
  const presetPlayers = queryParam('joueurs')?.split(',')
  const lastMatch = [...state.matches].sort((a, b) => b.createdAt - a.createdAt)[0]
  const initialIds = (presetPlayers ?? lastMatch?.players.map((p) => p.id) ?? []).filter((id) => state.players.some((p) => p.id === id))

  const [gameId, setGameId] = useState<string | null>(state.gameTypes.some((g) => g.id === presetGame) ? presetGame : null)
  const [selected, setSelected] = useState<string[]>(initialIds)
  const [step, setStep] = useState<Step>(gameId && presetPlayers && initialIds.length ? 2 : 0)
  const [gameSheet, setGameSheet] = useState(false)
  const [playerSheet, setPlayerSheet] = useState(false)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [dealerId, setDealerId] = useState<string | null>(null)

  const game = state.gameTypes.find((g) => g.id === gameId)
  const players = selected.map((id) => state.players.find((p) => p.id === id)).filter(Boolean) as Player[]
  const firstDealer = Math.max(0, players.findIndex((p) => p.id === dealerId))

  // Jeux triés par dernière utilisation
  const sortedGames = useMemo(() => {
    const last = new Map<string, number>()
    for (const m of state.matches) last.set(m.gameTypeId, Math.max(last.get(m.gameTypeId) ?? 0, m.createdAt))
    return [...state.gameTypes].sort((a, b) => (last.get(b.id) ?? 0) - (last.get(a.id) ?? 0) || a.name.localeCompare(b.name))
  }, [state.gameTypes, state.matches])

  const pickGame = (g: GameType) => {
    haptic()
    setGameId(g.id)
    setScores({})
    setStep(1)
  }

  const togglePlayer = (id: string) => {
    haptic()
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  const move = (i: number, d: -1 | 1) => {
    setSelected((s) => {
      const j = i + d
      if (j < 0 || j >= s.length) return s
      const n = [...s]
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
  }

  const start = () => {
    if (!game || !players.length) return
    const initial: Record<string, number> = {}
    for (const p of players) initial[p.id] = scores[p.id] ?? game.initialScore
    const m = newMatch(game, players, initial, firstDealer)
    update((s) => ({ ...s, matches: [...s.matches, m], onboarded: true }))
    haptic(30)
    go(`partie/${m.id}`, true)
  }

  const back = () => (step === 0 ? (history.length > 1 ? history.back() : go('')) : setStep((step - 1) as Step))

  return (
    <div className="page wizard">
      <header className="topbar">
        <button className="icon-btn" aria-label="Retour" onClick={back}>
          ‹
        </button>
        <h1>Nouvelle partie</h1>
        <span className="topbar-spacer" />
      </header>

      <ol className="progress" aria-label="Étapes">
        {STEP_TITLES.map((t, i) => (
          <li key={t} className={i === step ? 'current' : i < step ? 'done' : ''}>
            <button disabled={i > step || (i === 2 && !players.length)} onClick={() => setStep(i as Step)}>
              <span className="dot">{i < step ? '✓' : i + 1}</span>
              {t}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section>
          <h2 className="step-title">À quoi jouez-vous ?</h2>
          {sortedGames.length === 0 ? (
            <Hint>Commencez par créer votre premier jeu. Vous le retrouverez ici la prochaine fois.</Hint>
          ) : (
            <div className="list">
              {sortedGames.map((g) => (
                <button key={g.id} className={`card list-item ${g.id === gameId ? 'selected' : ''}`} onClick={() => pickGame(g)}>
                  <span className="game-emoji">{g.emoji}</span>
                  <span className="grow">
                    <b>{g.name}</b>
                    <span className="muted small">{describeRules(g)}</span>
                  </span>
                  <span className="chev">›</span>
                </button>
              ))}
            </div>
          )}
          <button className="btn dashed block" onClick={() => setGameSheet(true)}>
            + Nouveau jeu
          </button>
        </section>
      )}

      {step === 1 && (
        <section>
          <h2 className="step-title">Qui joue ?</h2>
          <Hint>Touchez les joueurs dans l'ordre du tour de table. Les flèches permettent de changer l'ordre ensuite.</Hint>

          {players.length > 0 && (
            <div className="list">
              {players.map((p, i) => (
                <div key={p.id} className="card list-item selected">
                  <span className="order">{i + 1}</span>
                  <Avatar emoji={p.emoji} color={p.color} />
                  <b className="grow">{p.name}</b>
                  <button className="icon-btn small" aria-label={`Monter ${p.name}`} disabled={i === 0} onClick={() => move(i, -1)}>
                    ↑
                  </button>
                  <button className="icon-btn small" aria-label={`Descendre ${p.name}`} disabled={i === players.length - 1} onClick={() => move(i, 1)}>
                    ↓
                  </button>
                  <button className="icon-btn small" aria-label={`Retirer ${p.name}`} onClick={() => togglePlayer(p.id)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {state.players.some((p) => !selected.includes(p.id)) && (
            <>
              <h3 className="section-title">{players.length ? 'Ajouter' : 'Joueurs enregistrés'}</h3>
              <div className="chips">
                {state.players
                  .filter((p) => !selected.includes(p.id))
                  .map((p) => (
                    <button key={p.id} className="chip" onClick={() => togglePlayer(p.id)}>
                      <Avatar emoji={p.emoji} color={p.color} size={28} />
                      {p.name}
                    </button>
                  ))}
              </div>
            </>
          )}

          <button className="btn dashed block" onClick={() => setPlayerSheet(true)}>
            + Nouveau joueur
          </button>

          <div className="sticky-bottom">
            <button className="btn primary big block" disabled={!players.length} onClick={() => setStep(2)}>
              {players.length ? `Continuer avec ${players.length} joueur${players.length > 1 ? 's' : ''} ›` : 'Choisissez au moins un joueur'}
            </button>
          </div>
        </section>
      )}

      {step === 2 && game && (
        <section>
          <div className="card recap">
            <span className="game-emoji">{game.emoji}</span>
            <span className="grow">
              <b>{game.name}</b>
              <span className="muted small">{describeRules(game)}</span>
            </span>
            <button className="link" onClick={() => setStep(0)}>
              Changer
            </button>
          </div>

          <h2 className="step-title">Qui commence ?</h2>
          <Hint>L'app vous rappellera à chaque manche qui distribue ou commence, en suivant le tour de table.</Hint>
          <div className="chips">
            {players.map((p, i) => (
              <button key={p.id} className={`chip ${firstDealer === i ? 'selected' : ''}`} aria-pressed={firstDealer === i} onClick={() => setDealerId(p.id)}>
                <Avatar emoji={p.emoji} color={p.color} size={28} />
                {p.name}
              </button>
            ))}
            <button
              className="chip"
              onClick={() => {
                haptic(40)
                setDealerId(players[Math.floor(Math.random() * players.length)].id)
              }}
            >
              🎲 Au hasard
            </button>
          </div>

          <h2 className="step-title">Scores de départ</h2>
          <Hint>Par défaut {game.initialScore} point{Math.abs(game.initialScore) > 1 ? 's' : ''}. Donnez un bonus ou un handicap à un joueur si besoin.</Hint>
          <div className="list">
            {players.map((p) => (
              <div key={p.id} className="card list-item">
                <Avatar emoji={p.emoji} color={p.color} />
                <b className="grow">{p.name}</b>
                <Stepper value={scores[p.id] ?? game.initialScore} onChange={(n) => setScores((s) => ({ ...s, [p.id]: n }))} label={`Score de départ de ${p.name}`} />
              </div>
            ))}
          </div>

          <div className="sticky-bottom">
            <button className="btn primary big block" onClick={start}>
              🎲 Lancer la partie
            </button>
          </div>
        </section>
      )}

      <Sheet open={gameSheet} onClose={() => setGameSheet(false)} title="Nouveau jeu">
        <GameForm
          initial={blankGame()}
          submitLabel="Créer et choisir ce jeu"
          onSave={(g) => {
            update((s) => ({ ...s, gameTypes: [...s.gameTypes, g] }))
            setGameSheet(false)
            pickGame(g)
          }}
        />
      </Sheet>

      <Sheet open={playerSheet} onClose={() => setPlayerSheet(false)} title="Nouveau joueur">
        <PlayerForm
          initial={blankPlayer(state.players)}
          others={state.players}
          submitLabel="Ajouter à la partie"
          onSave={(p) => {
            update((s) => ({ ...s, players: [...s.players, p] }))
            setSelected((sel) => [...sel, p.id])
            setPlayerSheet(false)
          }}
        />
      </Sheet>
    </div>
  )
}
