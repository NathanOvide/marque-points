import brand from 'virtual:brand'
import { isIOS, isStandalone, useInstallPrompt } from '../install'
import { Header } from '../ui'

export default function Help() {
  const install = useInstallPrompt()
  const ios = isIOS()

  return (
    <div className="page help">
      <Header title="Aide" back />

      <section className="card">
        <h2>📲 Installer l'app</h2>
        {isStandalone() ? (
          <p>✅ L'app est déjà installée sur cet appareil.</p>
        ) : (
          <>
            <p className="small">Une fois installée, {brand.name} s'ouvre depuis l'écran d'accueil comme une vraie app et fonctionne sans internet.</p>
            {install && (
              <button className="btn primary block" onClick={install}>
                Installer maintenant
              </button>
            )}
            <h3 className={ios ? '' : 'muted'}>Sur iPhone / iPad (Safari)</h3>
            <ol className="small">
              <li>
                Touchez le bouton <b>Partager</b> (carré avec une flèche ⬆️).
              </li>
              <li>
                Choisissez <b>« Sur l'écran d'accueil »</b>.
              </li>
              <li>
                Touchez <b>Ajouter</b>.
              </li>
            </ol>
            <h3 className={ios ? 'muted' : ''}>Sur Android (Chrome)</h3>
            <ol className="small">
              <li>
                Touchez le menu <b>⋮</b> en haut à droite.
              </li>
              <li>
                Choisissez <b>« Installer l'application »</b> ou <b>« Ajouter à l'écran d'accueil »</b>.
              </li>
            </ol>
            {ios && (
              <p className="small warn">
                ⚠️ Sur iPhone, Safari peut effacer les données d'un site non installé après quelques semaines sans visite. Installez l'app pour garder vos parties.
              </p>
            )}
          </>
        )}
      </section>

      <section className="card">
        <h2>🎲 Comment ça marche ?</h2>
        <ol className="small">
          <li>
            <b>Nouvelle partie</b> : choisissez le jeu (ou créez-le en indiquant qui gagne et quand la partie s'arrête).
          </li>
          <li>
            <b>Joueurs</b> : touchez-les dans l'ordre du tour de table. Ils sont gardés pour les prochaines fois.
          </li>
          <li>
            <b>Départ</b> : indiquez qui distribue en premier et, si besoin, un score de départ différent pour un joueur.
          </li>
          <li>
            À la fin de chaque manche, touchez <b>« Saisir la manche »</b> et entrez les points de chacun. Touchez <b>+</b> pour passer un score en négatif.
          </li>
          <li>
            Une erreur ? Onglet <b>Manches</b> : touchez la ligne pour la corriger. Juste après la saisie, <b>Annuler</b> retire aussi la manche.
          </li>
          <li>Si vous avez fixé un score à atteindre ou un nombre de manches, l'app propose de terminer la partie au bon moment.</li>
        </ol>
      </section>

      <section className="card">
        <h2>🔒 Vos données</h2>
        <p className="small">
          Tout est enregistré <b>uniquement sur cet appareil</b> : rien n'est envoyé sur internet. Les parties restent même si vous fermez l'app, mais elles ne passent pas d'un téléphone à l'autre.
        </p>
      </section>

      <p className="muted small center">{brand.fullName} · version {__APP_VERSION__}</p>
    </div>
  )
}
