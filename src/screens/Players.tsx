import { useState } from 'react'
import PlayerForm, { blankPlayer } from '../components/PlayerForm'
import { useStore } from '../store'
import type { Player } from '../types'
import { Avatar, Confirm, Header, Hint, Sheet, toast } from '../ui'

export default function Players() {
  const { state, update } = useStore()
  const [editing, setEditing] = useState<Player | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Player | null>(null)

  const played = (id: string) => state.matches.filter((m) => m.players.some((p) => p.id === id)).length

  return (
    <div className="page">
      <Header title="Joueurs" />
      {state.players.length === 0 ? (
        <div className="empty">
          <p>👥</p>
          <p>Ajoutez vos joueurs habituels une fois pour toutes : il suffira de les toucher pour lancer une partie.</p>
        </div>
      ) : (
        <>
          <Hint>Touchez un joueur pour changer son nom, sa couleur ou son emoji.</Hint>
          <div className="list">
            {state.players.map((p) => (
              <button key={p.id} className="card list-item" onClick={() => setEditing(p)}>
                <Avatar emoji={p.emoji} color={p.color} />
                <span className="grow">
                  <b>{p.name}</b>
                  <span className="muted small">
                    {played(p.id)} partie{played(p.id) > 1 ? 's' : ''}
                  </span>
                </span>
                <span className="chev">›</span>
              </button>
            ))}
          </div>
        </>
      )}
      <button className="btn primary big block" onClick={() => setCreating(true)}>
        + Ajouter un joueur
      </button>

      <Sheet open={creating} onClose={() => setCreating(false)} title="Nouveau joueur">
        <PlayerForm
          initial={blankPlayer(state.players)}
          others={state.players}
          submitLabel="Ajouter"
          onSave={(p) => {
            update((s) => ({ ...s, players: [...s.players, p] }))
            setCreating(false)
            toast(`${p.name} ajouté·e ✓`)
          }}
        />
      </Sheet>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Modifier le joueur">
        {editing && (
          <>
            <PlayerForm
              key={editing.id}
              initial={editing}
              others={state.players}
              submitLabel="Enregistrer"
              onSave={(p) => {
                update((s) => ({ ...s, players: s.players.map((x) => (x.id === p.id ? p : x)) }))
                setEditing(null)
              }}
            />
            <button className="btn danger-ghost block" onClick={() => setDeleting(editing)}>
              🗑️ Supprimer {editing.name}
            </button>
          </>
        )}
      </Sheet>

      <Confirm
        open={!!deleting}
        title={`Supprimer ${deleting?.name} ?`}
        message="Ses anciennes parties restent dans l'historique, mais il ne sera plus proposé pour les nouvelles."
        confirmLabel="Supprimer"
        danger
        onConfirm={() => {
          update((s) => ({ ...s, players: s.players.filter((x) => x.id !== deleting!.id) }))
          setDeleting(null)
          setEditing(null)
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
