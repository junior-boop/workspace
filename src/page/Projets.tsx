import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FolderKanban, Loader2 } from 'lucide-react'
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore'
import { ref, set } from 'firebase/database'
import { db, rtdb } from '../firebase'
import { useAuth } from '../contexts/AuthContext'

type Projet = {
  titre: string
  clientId: string
  description: string
  montantAttendu: number
  montantVerse: number
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

type ProjetFirestore = Projet & { id: string }

type Client = {
  nomComplet: string
}

function Projets() {
  const { utilisateur } = useAuth()
  const [projets, setProjets] = useState<ProjetFirestore[]>([])
  const [chargementProjets, setChargementProjets] = useState(true)
  const [clients, setClients] = useState<Record<string, Client>>({})

  useEffect(() => {
    if (!utilisateur) return
    set(ref(rtdb, `vues/${utilisateur.id}/projets`), Date.now())
  }, [utilisateur])

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'projets'), orderBy('createdAt', 'desc')), (snapshot) => {
      setProjets(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ProjetFirestore)))
      setChargementProjets(false)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClients(Object.fromEntries(snapshot.docs.map((doc) => [doc.id, doc.data() as Client])))
    })
    return unsubscribe
  }, [])

  return (
    <div className='p-4 md:p-8'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <h1 className='text-2xl font-bold text-gray-800'>Les projets</h1>
        <Link
          to='/projet/new'
          className='flex items-center gap-2 rounded-full bg-blue-600 text-white font-medium px-4 py-2 hover:bg-blue-700 w-max'
        >
          <Plus strokeWidth={2} className='h-5 w-5' />
          Ajouter un projet
        </Link>
      </div>

      <div className='mt-6 flex flex-col gap-3'>
        {chargementProjets && (
          <div className='flex items-center gap-2 text-gray-500'>
            <Loader2 className='h-5 w-5 animate-spin' />
            Chargement des projets...
          </div>
        )}

        {!chargementProjets && projets.length === 0 && (
          <p className='text-gray-500'>Aucun projet pour le moment.</p>
        )}

        {projets.map((projet) => {
          const pourcentage = projet.montantAttendu > 0
            ? Math.min(100, Math.round((projet.montantVerse / projet.montantAttendu) * 100))
            : 0
          return (
            <Link
              key={projet.id}
              to={`/projet/${projet.id}`}
              className='flex items-center gap-4 rounded-2xl border border-gray-200 p-4 hover:bg-gray-50'
            >
              <div className='h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0'>
                <FolderKanban strokeWidth={2} className='h-5 w-5 text-blue-700' />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='font-medium text-gray-800'>{projet.titre}</p>
                <p className='text-sm text-gray-500 truncate'>{clients[projet.clientId]?.nomComplet}</p>
                <div className='mt-2 h-2 w-full rounded-full bg-gray-100 overflow-hidden'>
                  <div className='h-full rounded-full bg-green-600' style={{ width: `${pourcentage}%` }} />
                </div>
              </div>
              <div className='text-right shrink-0'>
                <p className='font-semibold text-gray-800'>
                  {projet.montantVerse.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {projet.montantAttendu.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA
                </p>
                <p className='text-sm text-gray-500'>{pourcentage}%</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default Projets
