import { useStore } from './store'
import { ToastHost, go, useRoute } from './ui'
import Home from './screens/Home'
import NewMatch from './screens/NewMatch'
import MatchScreen from './screens/MatchScreen'
import History from './screens/History'
import Players from './screens/Players'
import Games from './screens/Games'
import Stats from './screens/Stats'
import Help from './screens/Help'

const TABS = [
  { path: '', icon: '🏠', label: 'Accueil' },
  { path: 'parties', icon: '📜', label: 'Parties' },
  { path: 'joueurs', icon: '👥', label: 'Joueurs' },
  { path: 'jeux', icon: '🎲', label: 'Jeux' },
  { path: 'stats', icon: '📊', label: 'Stats' },
]

export default function App() {
  const route = useRoute()
  const { state } = useStore()
  const [page, id] = route

  let screen
  switch (page) {
    case 'nouvelle':
      screen = <NewMatch key={window.location.hash} />
      break
    case 'partie': {
      const match = state.matches.find((m) => m.id === id)
      screen = match ? <MatchScreen match={match} /> : <Home />
      break
    }
    case 'parties':
      screen = <History />
      break
    case 'joueurs':
      screen = <Players />
      break
    case 'jeux':
      screen = <Games />
      break
    case 'stats':
      screen = <Stats />
      break
    case 'aide':
      screen = <Help />
      break
    default:
      screen = <Home />
  }

  const showTabs = page !== 'nouvelle' && page !== 'partie'
  const current = page ?? ''

  return (
    <>
      <main className={showTabs ? 'with-tabs' : ''}>{screen}</main>
      {showTabs && (
        <nav className="tabbar">
          {TABS.map((t) => (
            <button key={t.path} className={current === t.path ? 'active' : ''} aria-current={current === t.path ? 'page' : undefined} onClick={() => go(t.path)}>
              <span aria-hidden>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      )}
      <ToastHost />
    </>
  )
}
