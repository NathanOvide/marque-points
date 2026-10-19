import { useState } from 'react'
import GameForm, { blankGame } from '../components/GameForm'
import { describeRules } from '../logic'
import { useStore } from '../store'
import type { GameType } from '../types'
import { Confirm, Header, Hint, Sheet, go, toast } from '../ui'

export default function Games() {
  const { state, update } = useStore()
  const [editing, setEditing] = useState<GameType | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<GameType | null>(null)
  const games = [...state.gameTypes].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="page">
      <Header title="Jeux" />
      {games.length === 0 ? (
        <div className="empty">
          <p>🎲</p>
          <p>Enregistrez vos jeux avec leurs règles de score (qui gagne, quand la partie s'arrête…). Ils seront prêts pour les prochaines parties.</p>
        </div>
      ) : (
        <>
          <Hint>Touchez ▶ pour lancer une partie, ou le nom du jeu pour modifier ses règles.</Hint>
          <div className="list">
            {games.map((g) => (
              <div key={g.id} className="card list-item">
                <button className="grow row-btn" onClick={() => setEditing(g)}>
                  <span className="game-emoji">{g.emoji}</span>
                  <span className="grow">
                    <b>{g.name}</b>
                    <span className="muted small">{describeRules(g)}</span>
                  </span>
                </button>
                <button className="icon-btn play" aria-label={`Jouer à ${g.name}`} onClick={() => go(`nouvelle?jeu=${g.id}`)}>
                  ▶
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      <button className="btn primary big block" onClick={() => setCreating(true)}>
        + Ajouter un jeu
      </button>

      <Sheet open={creating} onClose={() => setCreating(false)} title="Nouveau jeu">
        <GameForm
          initial={blankGame()}
          submitLabel="Ajouter"
          onSave={(g) => {
            update((s) => ({ ...s, gameTypes: [...s.gameTypes, g] }))
            setCreating(false)
            toast(`${g.name} ajouté ✓`)
          }}
        />
      </Sheet>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Modifier le jeu">
        {editing && (
          <>
            <GameForm
              key={editing.id}
              initial={editing}
              submitLabel="Enregistrer"
              onSave={(g) => {
                update((s) => ({ ...s, gameTypes: s.gameTypes.map((x) => (x.id === g.id ? g : x)) }))
                setEditing(null)
                toast('Règles enregistrées. Elles s\'appliqueront aux prochaines parties.')
              }}
            />
            <button className="btn danger-ghost block" onClick={() => setDeleting(editing)}>
              🗑️ Supprimer ce jeu
            </button>
          </>
        )}
      </Sheet>

      <Confirm
        open={!!deleting}
        title={`Supprimer ${deleting?.name} ?`}
        message="Les parties déjà jouées restent dans l'historique."
        confirmLabel="Supprimer"
        danger
        onConfirm={() => {
          update((s) => ({ ...s, gameTypes: s.gameTypes.filter((x) => x.id !== deleting!.id) }))
          setDeleting(null)
          setEditing(null)
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
