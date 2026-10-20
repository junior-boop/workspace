import { useEffect, useState } from 'react'
import { Bell, Download, X, Check, Share } from 'lucide-react'

const CLE_STOCKAGE = 'onboarding-pwa-termine'

interface EvenementInstallation extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function estIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function estDejaInstallee() {
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true
}

function OnboardingPwa() {
  const [ouvert, setOuvert] = useState(false)
  const [evenementInstallation, setEvenementInstallation] = useState<EvenementInstallation | null>(null)
  const [permissionNotification, setPermissionNotification] = useState<NotificationPermission | null>(null)
  const [appInstallee, setAppInstallee] = useState(false)
  const [afficherInstructionsIOS, setAfficherInstructionsIOS] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(CLE_STOCKAGE)) return
    if ('Notification' in window) setPermissionNotification(Notification.permission)
    setAppInstallee(estDejaInstallee())

    const surInvitationInstallation = (e: Event) => {
      e.preventDefault()
      setEvenementInstallation(e as EvenementInstallation)
    }
    window.addEventListener('beforeinstallprompt', surInvitationInstallation)

    const surAppInstallee = () => setAppInstallee(true)
    window.addEventListener('appinstalled', surAppInstallee)

    const minuteur = setTimeout(() => setOuvert(true), 1000)

    return () => {
      window.removeEventListener('beforeinstallprompt', surInvitationInstallation)
      window.removeEventListener('appinstalled', surAppInstallee)
      clearTimeout(minuteur)
    }
  }, [])

  const fermer = () => {
    localStorage.setItem(CLE_STOCKAGE, '1')
    setOuvert(false)
  }

  const demanderNotifications = async () => {
    if (!('Notification' in window)) return
    const resultat = await Notification.requestPermission()
    setPermissionNotification(resultat)
  }

  const installerApp = async () => {
    if (estIOS()) {
      setAfficherInstructionsIOS(true)
      return
    }
    if (!evenementInstallation) return
    await evenementInstallation.prompt()
    const { outcome } = await evenementInstallation.userChoice
    if (outcome === 'accepted') setAppInstallee(true)
    setEvenementInstallation(null)
  }

  if (!ouvert) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
      <div className='relative w-full max-w-sm rounded-3xl bg-white p-6'>
        <button type='button' onClick={fermer} aria-label='Fermer' className='absolute top-4 right-4 text-gray-500 hover:text-gray-800'>
          <X className='h-5 w-5' />
        </button>

        <h2 className='text-xl font-bold text-gray-800 mb-1'>Bienvenue</h2>
        <p className='text-gray-500 text-sm mb-6'>Configurez l'application pour une meilleure expérience, surtout sur téléphone.</p>

        <div className='flex flex-col gap-4'>
          <div className='rounded-2xl bg-green-50 p-4'>
            <div className='flex items-center gap-3 mb-3'>
              <Bell className='h-5 w-5 text-green-900 shrink-0' />
              <p className='font-medium text-gray-800'>Notifications</p>
            </div>
            <p className='text-sm text-gray-600 mb-3'>Recevez une alerte pour les messages, mouvements et projets.</p>
            {permissionNotification === 'granted' ? (
              <p className='flex items-center gap-2 text-sm font-medium text-green-700'>
                <Check className='h-4 w-4' /> Activées
              </p>
            ) : (
              <button
                type='button'
                onClick={demanderNotifications}
                disabled={permissionNotification === 'denied'}
                className='rounded-full bg-green-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {permissionNotification === 'denied' ? 'Bloquées dans le navigateur' : 'Activer les notifications'}
              </button>
            )}
          </div>

          {!appInstallee && (
            <div className='rounded-2xl bg-blue-50 p-4'>
              <div className='flex items-center gap-3 mb-3'>
                <Download className='h-5 w-5 text-blue-700 shrink-0' />
                <p className='font-medium text-gray-800'>Installer l'application</p>
              </div>
              <p className='text-sm text-gray-600 mb-3'>Ajoutez l'app sur votre écran d'accueil pour y accéder comme une application normale, surtout utile sur téléphone.</p>

              {afficherInstructionsIOS ? (
                <p className='flex items-center gap-2 text-sm text-gray-700 bg-white rounded-xl px-3 py-2'>
                  Appuyez sur <Share className='h-4 w-4 inline' /> puis « Sur l'écran d'accueil »
                </p>
              ) : (
                <button
                  type='button'
                  onClick={installerApp}
                  className='rounded-full bg-blue-600 text-white text-sm font-medium px-4 py-2'
                >
                  Installer l'app
                </button>
              )}
            </div>
          )}
        </div>

        <button type='button' onClick={fermer} className='mt-6 w-full text-center text-sm text-gray-500 hover:text-gray-800'>
          Plus tard
        </button>
      </div>
    </div>
  )
}

export default OnboardingPwa
