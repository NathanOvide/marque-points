import { useEffect, useState, type ReactNode } from 'react'

// ---------- Navigation (hash) : le bouton retour d'Android fonctionne ----------

export function useRoute(): string[] {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean)
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => {
      setRoute(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export function queryParam(name: string): string | null {
  const q = window.location.hash.split('?')[1]
  return q ? new URLSearchParams(q).get(name) : null
}

export function go(path: string, replace = false) {
  const url = '#/' + path.replace(/^\//, '')
  if (replace) {
    history.replaceState(null, '', url)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else window.location.hash = url
}

// ---------- Retour haptique (Android ; ignoré ailleurs) ----------

export function haptic(ms = 12) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* non supporté */
  }
}

// ---------- Empêche l'écran de s'éteindre pendant une partie ----------

export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) lock.release()
      } catch {
        /* refusé (batterie faible, onglet caché…) */
      }
    }
    const onVisible = () => document.visibilityState === 'visible' && request()
    request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [active])
}

// ---------- Composants ----------

export const PLAYER_EMOJIS = ['🦊', '🐻', '🐼', '🐸', '🐯', '🦁', '🐨', '🐵', '🦄', '🐙', '🐢', '🦉', '🐧', '🐝', '🦖', '🐳', '🌵', '🍀', '⭐', '🔥', '🚀', '👑', '🎩', '🍕']
export const GAME_EMOJIS = ['🎲', '🃏', '♟️', '🎯', '🧩', '🀄', '🎴', '🏆', '🗺️', '🐉', '🏰', '💎']
export const COLOR_COUNT = 8
export const COLOR_NAMES = ['Bleu', 'Orange', 'Turquoise', 'Jaune', 'Rose', 'Vert', 'Violet', 'Rouge']

export function Avatar({ emoji, color, size = 40 }: { emoji: string; color: number; size?: number }) {
  return (
    <span className="avatar" style={{ '--c': `var(--p${color % COLOR_COUNT})`, width: size, height: size, fontSize: size * 0.55 } as React.CSSProperties}>
      {emoji}
    </span>
  )
}

export function Header({ title, back, action }: { title: string; back?: boolean | string; action?: ReactNode }) {
  return (
    <header className="topbar">
      {back ? (
        <button className="icon-btn" aria-label="Retour" onClick={() => (typeof back === 'string' ? go(back) : history.length > 1 ? history.back() : go(''))}>
          ‹
        </button>
      ) : (
        <span className="topbar-spacer" />
      )}
      <h1>{title}</h1>
      {action ?? <span className="topbar-spacer" />}
    </header>
  )
}

export function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="hint">
      <span aria-hidden>💡</span> {children}
    </p>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Fermer" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}

/** Confirmation simple, sans fenêtre native (plus lisible sur mobile). */
export function Confirm({ open, title, message, confirmLabel, danger, onConfirm, onCancel }: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <p className="confirm-msg">{message}</p>
      <div className="row-actions">
        <button className="btn" onClick={onCancel}>
          Annuler
        </button>
        <button className={danger ? 'btn danger' : 'btn primary'} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}

let toastSetter: ((t: { msg: string; action?: { label: string; run: () => void } } | null) => void) | null = null
let toastTimer: number | undefined

export function toast(msg: string, action?: { label: string; run: () => void }) {
  window.clearTimeout(toastTimer)
  toastSetter?.({ msg, action })
  toastTimer = window.setTimeout(() => toastSetter?.(null), action ? 5000 : 2500)
}

export function ToastHost() {
  const [t, setT] = useState<{ msg: string; action?: { label: string; run: () => void } } | null>(null)
  useEffect(() => {
    toastSetter = setT
    return () => {
      toastSetter = null
    }
  }, [])
  if (!t) return null
  return (
    <div className="toast" role="status">
      <span>{t.msg}</span>
      {t.action && (
        <button
          onClick={() => {
            t.action!.run()
            setT(null)
          }}
        >
          {t.action.label}
        </button>
      )}
    </div>
  )
}

export function Stepper({ value, onChange, min = -Infinity, step = 1, label }: { value: number; onChange: (n: number) => void; min?: number; step?: number; label: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label="Moins" onClick={() => onChange(Math.max(min, value - step))}>
        −
      </button>
      <NumberInput value={value} onChange={onChange} label={label} />
      <button type="button" aria-label="Plus" onClick={() => onChange(value + step)}>
        +
      </button>
    </div>
  )
}

/**
 * Champ numérique qui accepte le signe moins même sur le clavier iPhone
 * (dont le pavé numérique n'a pas de touche « − »).
 */
export function NumberInput({ value, onChange, label, placeholder, autoFocus, onEnter, className }: {
  value: number | ''
  onChange: (n: number) => void
  label: string
  placeholder?: string
  autoFocus?: boolean
  onEnter?: () => void
  className?: string
}) {
  const [text, setText] = useState(value === '' ? '' : String(value))
  useEffect(() => {
    // resynchronise si la valeur change de l'extérieur
    setText((cur) => {
      const parsed = cur === '' || cur === '-' ? 0 : Number(cur)
      if (value === '') return cur === '-' ? cur : ''
      return parsed === value ? cur : String(value)
    })
  }, [value])
  return (
    <input
      className={className ?? 'num'}
      type="text"
      inputMode="decimal"
      pattern="-?[0-9]*"
      aria-label={label}
      placeholder={placeholder}
      autoFocus={autoFocus}
      value={text}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
      onChange={(e) => {
        const v = e.target.value.replace(',', '.').replace(/[^0-9.-]/g, '').replace(/(?!^)-/g, '')
        setText(v)
        const n = Number(v)
        if (v !== '' && v !== '-' && Number.isFinite(n)) onChange(n)
        else if (v === '' || v === '-') onChange(0)
      }}
    />
  )
}

export function fmtDate(t: number) {
  return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtTime(t: number) {
  return new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function signed(n: number) {
  return n > 0 ? `+${n}` : String(n)
}
