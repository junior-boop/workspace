import { Wallet, FolderKanban, Users, Settings, History, FileText, CircleUserRound, MessageSquare, Loader2 } from 'lucide-react'
import { Routes, Route, NavLink } from 'react-router-dom'
import './App.css'
import logo from './assets/logo.png'
import MouvementDeCaisse from './page/MouvementDeCaisse'
import Historique from './page/Historique'
import Projets from './page/Projets'
import Utilisateurs from './page/Utilisateurs'
import Parametres from './page/Parametres'
import Profil from './page/Profil'
import ConditionsUtilisation from './page/ConditionsUtilisation'
import Messages from './page/Messages'
import Login from './page/Login'
import Layout from './composants/Layout'
import { useAuth } from './contexts/AuthContext'

function Menu() {
  const { utilisateur } = useAuth()

  return (
    <div className='flex w-112.5 h-dvh flex-row justify-end '>
      <div className='w-[80%] h-full flex flex-col border-r border-gray-200 px-4'>
        <div className='px-4 py-2'>
          <div className='my-10'>
            <img src={logo} alt="Logo" className='h-10' />
          </div>
        </div>
        <div className='flex flex-1 flex-col justify-between pb-10'>
          <div>
            <div className='px-4 py-2'>
              <span className='text-sm text-gray-500 font-bold'>MENU</span>
            </div>
            <div className='space-y-1'>
              <NavButton to="/messages" icon={MessageSquare} label="Messages" />
              <NavButton to="/" icon={Wallet} label="Mouvements de caisse" />
              <NavButton to="/historique" icon={History} label="L'historique" />
              <NavButton to="/projets" icon={FolderKanban} label="Les projets" />
              <NavButton to="/utilisateurs" icon={Users} label="Les utilisateurs" />
              <NavButton to="/parametres" icon={Settings} label="Les paramètres" />
            </div>
          </div>
          <div className='space-y-1'>
            <NavButton to="/profil" icon={CircleUserRound} photo={utilisateur?.photo} label={utilisateur ? `${utilisateur.prenoms.split(' ')[0]} ${utilisateur.nom}` : 'Profil'} />
            <NavButton to="/conditions-utilisation" icon={FileText} label="Conditions d'utilisation" />
          </div>
        </div>
      </div>
    </div>
  )
}


function NavButton({ to, icon: Icon, photo, label }: { to: string, icon: React.ComponentType<React.SVGProps<SVGSVGElement>>, photo?: string | null, label: string }) {
  return (
    <NavLink
      to={to}
      end
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
          <span className='group-hover:text-green-900'>{label}</span>
        </>
      )}
    </NavLink>
  )
}


function App() {
  const { utilisateur, chargement } = useAuth()

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
    <div className='flex w-dvw h-dvh overflow-hidden border'>
      <Menu />
      <div className='flex-1 w-full h-full overflow-y-auto overflow-x-hidden'>
        <Layout>
          <Routes>
            <Route path="/" element={<MouvementDeCaisse />} />
            <Route path="/historique" element={<Historique />} />
            <Route path="/projets" element={<Projets />} />
            <Route path="/utilisateurs" element={<Utilisateurs />} />
            <Route path="/parametres" element={<Parametres />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/profil" element={<Profil />} />
            <Route path="/conditions-utilisation" element={<ConditionsUtilisation />} />
          </Routes>
        </Layout>
      </div>
    </div>
  )
}

export default App
