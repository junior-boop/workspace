import { useRef, useState } from 'react'
import { Wallet, FolderKanban, Users, Settings, History, FileText, CircleUserRound, MessageSquare, Loader2, Menu as MenuIcon, X } from 'lucide-react'
import { Routes, Route, NavLink } from 'react-router-dom'
import './App.css'
import logo from './assets/logo.png'
import MouvementDeCaisse from './page/MouvementDeCaisse'
import Historique from './page/Historique'
import Projets from './page/Projets'
import ProjetFormulaire from './page/ProjetFormulaire'
import ProjetDetail from './page/ProjetDetail'
import Utilisateurs from './page/Utilisateurs'
import Parametres from './page/Parametres'
import Profil from './page/Profil'
import ConditionsUtilisation from './page/ConditionsUtilisation'
import Messages from './page/Messages'
import Login from './page/Login'
import Layout from './composants/Layout'
import OnboardingPwa from './composants/OnboardingPwa'
import { useAuth } from './contexts/AuthContext'
import { NotificationsProvider, useNotifications } from './contexts/NotificationsContext'

function Menu({ open, onClose, origine }: { open: boolean, onClose: () => void, origine: { x: number, y: number } }) {
  const { utilisateur } = useAuth()
  const { messagesNonLus, mouvementsNonLus, projetsNonLus } = useNotifications()

  return (
    <>
      {open && (
        <div
          className='fixed inset-0 z-30 bg-black/40 md:hidden'
          onClick={onClose}
        />
      )}
      <div
        className='menu-mobile-clip fixed md:static inset-y-0 left-0 z-40 flex w-dvw md:w-112.5 h-dvh flex-row justify-start'
        style={{ '--rayon': open ? '150%' : '0%', '--origine-x': `${origine.x}px`, '--origine-y': `${origine.y}px` } as React.CSSProperties}
      >
        <div className='w-dvw lg:w-[80%] h-full flex flex-col overflow-y-auto md:overflow-visible border-r border-gray-200 px-4 bg-white'>
          <div className='px-4 py-2'>
            <div className='my-10 flex items-center justify-between'>
              <img src={logo} alt="Logo" className='h-10' />
              <button type='button' onClick={onClose} aria-label='Fermer le menu' className='md:hidden p-2 -mr-2 text-gray-500 hover:text-gray-800'>
                <X strokeWidth={2} className='h-6 w-6' />
              </button>
            </div>
          </div>
          <div className='flex flex-1 flex-col justify-between pb-10'>
            <div>
              <div className='px-4 py-2'>
                <span className='text-sm text-gray-500 font-bold'>MENU</span>
              </div>
              <div className='space-y-1'>
                <NavButton to="/messages" icon={MessageSquare} label="Messages" badge={messagesNonLus} onNavigate={onClose} />
                <NavButton to="/" icon={Wallet} label="Mouvements de caisse" badge={mouvementsNonLus} badgePoint onNavigate={onClose} />
                <NavButton to="/historique" icon={History} label="L'historique" onNavigate={onClose} />
                <NavButton to="/projets" icon={FolderKanban} label="Les projets" badge={projetsNonLus} onNavigate={onClose} />
                <NavButton to="/utilisateurs" icon={Users} label="Les utilisateurs" onNavigate={onClose} />
                <NavButton to="/parametres" icon={Settings} label="Les paramètres" onNavigate={onClose} />
              </div>
            </div>
            <div className='space-y-1'>
              <NavButton to="/profil" icon={CircleUserRound} photo={utilisateur?.photo} label={utilisateur ? `${utilisateur.prenoms.split(' ')[0]} ${utilisateur.nom}` : 'Profil'} onNavigate={onClose} />
              <NavButton to="/conditions-utilisation" icon={FileText} label="Conditions d'utilisation" onNavigate={onClose} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}


function NavButton({ to, icon: Icon, photo, label, badge, badgePoint, onNavigate }: { to: string, icon: React.ComponentType<React.SVGProps<SVGSVGElement>>, photo?: string | null, label: string, badge?: number, badgePoint?: boolean, onNavigate?: () => void }) {
  return (
    <NavLink
      to={to}
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        `group px-4 py-3 rounded-4xl inline-flex items-center gap-5 font-medium w-full ${isActive ? 'bg-green-50 text-green-900' : 'text-gray-700 hover:bg-green-50'}`
      }
    >
      {({ isActive }) => (
        <>
          {photo ? (
            <img src={photo} alt='' className='h-6 w-6 rounded-full object-cover object-top' />
          ) : (
            <Icon strokeWidth={2} className={`group-hover:text-green-900 ${isActive ? 'text-green-900' : 'text-[#444]'}`} />
          )}
          <span className='group-hover:text-green-900 flex-1'>{label}</span>
          {!!badge && (
            badgePoint ? (
              <span className='h-2.5 w-2.5 rounded-full bg-red-600' />
            ) : (
              <span className='flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold'>
                {badge > 99 ? '99+' : badge}
              </span>
            )
          )}
        </>
      )}
    </NavLink>
  )
}


function App() {
  const { utilisateur, chargement } = useAuth()
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [origineMenu, setOrigineMenu] = useState({ x: 0, y: 0 })
  const boutonMenuRef = useRef<HTMLButtonElement>(null)

  const ouvrirMenu = () => {
    const rect = boutonMenuRef.current?.getBoundingClientRect()
    if (rect) setOrigineMenu({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    setMenuOuvert(true)
  }

  if (chargement) {
    return (
      <div className='flex w-dvw h-dvh items-center justify-center text-gray-500'>
        <Loader2 className='h-6 w-6 animate-spin' />
      </div>
    )
  }

  if (!utilisateur) {
    return <Login />
  }

  return (
    <NotificationsProvider>
      <OnboardingPwa />
      <div className='flex w-dvw h-dvh overflow-hidden border'>
        <Menu open={menuOuvert} onClose={() => setMenuOuvert(false)} origine={origineMenu} />
        <div className='flex-1 w-full h-full flex flex-col overflow-hidden'>
          <div className='flex md:hidden items-center gap-6 p-4 border-b border-gray-200 shrink-0'>
            <button type='button' ref={boutonMenuRef} onClick={ouvrirMenu} aria-label='Ouvrir le menu'>
              <MenuIcon strokeWidth={2} className='h-6 w-6 text-gray-700' />
            </button>
            <img src={logo} alt="Logo" className='h-7' />
          </div>
          <div className='flex-1 w-full overflow-y-auto overflow-x-hidden'>
          <Layout>
            <Routes>
              <Route path="/" element={<MouvementDeCaisse />} />
              <Route path="/historique" element={<Historique />} />
              <Route path="/projets" element={<Projets />} />
              <Route path="/projet/new" element={<ProjetFormulaire />} />
              <Route path="/projet/:id" element={<ProjetDetail />} />
              <Route path="/projet/:id/modifier" element={<ProjetFormulaire />} />
              <Route path="/utilisateurs" element={<Utilisateurs />} />
              <Route path="/parametres" element={<Parametres />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/profil" element={<Profil />} />
              <Route path="/conditions-utilisation" element={<ConditionsUtilisation />} />
            </Routes>
          </Layout>
          </div>
        </div>
      </div>
    </NotificationsProvider>
  )
}

export default App
