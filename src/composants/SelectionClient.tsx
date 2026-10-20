import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import { Loader2, Plus, Search } from 'lucide-react'
import { collection, doc, onSnapshot, serverTimestamp, setDoc, type Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import ModaleBas from './ModaleBas'

type Client = {
  nomComplet: string
  telephone: string
  email: string
  entreprise: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

type ClientFirestore = Client & { id: string }

function SelectionClient({ clientId, onChange }: { clientId: string | null, onChange: (id: string) => void }) {
  const [clients, setClients] = useState<ClientFirestore[]>([])
  const [recherche, setRecherche] = useState('')
  const [ouvert, setOuvert] = useState(false)
  const [modaleAjoutOuverte, setModaleAjoutOuverte] = useState(false)
  const [nomComplet, setNomComplet] = useState('')
  const [telephone, setTelephone] = useState('')
  const [email, setEmail] = useState('')
  const [entreprise, setEntreprise] = useState('')
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false)
  const conteneurRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClients(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ClientFirestore)))
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const fermerSiExterieur = (e: MouseEvent) => {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false)
      }
    }
    document.addEventListener('mousedown', fermerSiExterieur)
    return () => document.removeEventListener('mousedown', fermerSiExterieur)
  }, [])

  const clientSelectionne = clients.find((c) => c.id === clientId)
  const resultats = clients.filter((c) => c.nomComplet.toLowerCase().includes(recherche.toLowerCase()))

  const ouvrirAjout = () => {
    setNomComplet(recherche)
    setTelephone('')
    setEmail('')
    setEntreprise('')
    setOuvert(false)
    setModaleAjoutOuverte(true)
  }

  const enregistrerClient = async (e: SubmitEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEnregistrementEnCours(true)
    try {
      const idClient = String(Date.now())
      await setDoc(doc(db, 'clients', idClient), {
        nomComplet,
        telephone,
        email,
        entreprise,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      onChange(idClient)
      setModaleAjoutOuverte(false)
    } finally {
      setEnregistrementEnCours(false)
    }
  }

  return (
    <div ref={conteneurRef} className='relative'>
      <div className='relative'>
        <Search strokeWidth={2} className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
        <input
          type='text'
          value={ouvert ? recherche : (clientSelectionne?.nomComplet ?? '')}
          onFocus={() => { setOuvert(true); setRecherche('') }}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder='Rechercher un client...'
          className='w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500'
        />
      </div>

      {ouvert && (
        <div className='absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto'>
          {resultats.map((client) => (
            <button
              key={client.id}
              type='button'
              onClick={() => { onChange(client.id); setOuvert(false) }}
              className='w-full text-left px-4 py-2 hover:bg-gray-50'
            >
              <p className='font-medium text-gray-800'>{client.nomComplet}</p>
              <p className='text-sm text-gray-500'>{client.telephone}</p>
            </button>
          ))}

          {resultats.length === 0 && (
            <p className='px-4 py-2 text-sm text-gray-500'>Aucun client trouvé.</p>
          )}

          <button
            type='button'
            onClick={ouvrirAjout}
            className='w-full flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 border-t border-gray-100'
          >
            <Plus strokeWidth={2} className='h-4 w-4' />
            Ajouter {recherche ? `"${recherche}"` : 'un nouveau client'}
          </button>
        </div>
      )}

      <ModaleBas
        open={modaleAjoutOuverte}
        onClose={() => setModaleAjoutOuverte(false)}
        title='Ajouter un client'
      >
        <form onSubmit={enregistrerClient} className='flex flex-col gap-5'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Nom complet</label>
            <input
              type='text'
              value={nomComplet}
              onChange={(e) => setNomComplet(e.target.value)}
              required
              className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Numéro de téléphone</label>
            <input
              type='tel'
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              required
              className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Adresse e-mail (optionnel)</label>
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Entreprise (optionnel)</label>
            <input
              type='text'
              value={entreprise}
              onChange={(e) => setEntreprise(e.target.value)}
              className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
            />
          </div>
          <button
            type='submit'
            disabled={enregistrementEnCours}
            className='flex items-center justify-center gap-2 rounded-full bg-blue-600 text-white font-medium px-4 py-3 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed'
          >
            {enregistrementEnCours && <Loader2 className='h-5 w-5 animate-spin' />}
            {enregistrementEnCours ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </ModaleBas>
    </div>
  )
}

export default SelectionClient
export type { ClientFirestore }
