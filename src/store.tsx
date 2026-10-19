import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AppState } from './types'

const KEY = 'marque-points:v1'

const EMPTY: AppState = { version: 1, players: [], gameTypes: [], matches: [], onboarded: false }

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...EMPTY, ...JSON.parse(raw) }
  } catch {
    /* stockage indisponible : on démarre vide */
  }
  return EMPTY
}

function saveState(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* stockage plein ou bloqué */
  }
}

type Updater = (fn: (s: AppState) => AppState) => void
const Ctx = createContext<{ state: AppState; update: Updater } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)

  useEffect(() => saveState(state), [state])

  useEffect(() => {
    // Demande au navigateur de ne pas effacer nos données
    navigator.storage?.persist?.().catch(() => {})
    // Synchronise si l'app est ouverte dans deux onglets
    const onStorage = (e: StorageEvent) => e.key === KEY && setState(loadState())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const update = useCallback<Updater>((fn) => setState(fn), [])
  return <Ctx.Provider value={{ state, update }}>{children}</Ctx.Provider>
}

export function useStore() {
  const c = useContext(Ctx)
  if (!c) throw new Error('StoreProvider manquant')
  return c
}
