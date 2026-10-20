import { useEffect, useState, type SubmitEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import EditeurTexte from '../composants/EditeurTexte'
import SelectionClient from '../composants/SelectionClient'
import { useAuth } from '../contexts/AuthContext'

function ProjetFormulaire() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { utilisateur } = useAuth()
  const [titre, setTitre] = useState('')
  const [clientId, setClientId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [montantAttendu, setMontantAttendu] = useState('')
  const [auteurId, setAuteurId] = useState<string | null>(null)
  const [chargement, setChargement] = useState(!!id)
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'projets', id)).then((snap) => {
      const donnees = snap.data()
      if (donnees) {
        setTitre(donnees.titre)
        setClientId(donnees.clientId ?? null)
        setDescription(donnees.description)
        setMontantAttendu(String(donnees.montantAttendu))
        setAuteurId(donnees.auteurId ?? null)
      }
      setChargement(false)
    })
  }, [id])

  const enregistrerProjet = async (e: SubmitEvent) => {
    e.preventDefault()
    setEnregistrementEnCours(true)
    try {
      if (!clientId || !utilisateur) return
      const idProjet = id ?? String(Date.now())
      await setDoc(doc(db, 'projets', idProjet), {
        titre,
        clientId,
        description,
        montantAttendu: Number(montantAttendu),
        auteurId: auteurId ?? utilisateur.id,
        ...(id ? {} : { montantVerse: 0, createdAt: serverTimestamp() }),
        updatedAt: serverTimestamp(),
      }, { merge: true })
      navigate(`/projet/${idProjet}`)
    } finally {
      setEnregistrementEnCours(false)
    }
  }

  if (chargement) {
    return (
      <div className='p-8 flex items-center gap-2 text-gray-500'>
        <Loader2 className='h-5 w-5 animate-spin' />
        Chargement du projet...
      </div>
    )
  }

  return (
    <div className='p-4 md:p-8'>
      <h1 className='text-2xl font-bold text-gray-800'>{id ? 'Modifier le projet' : 'Nouveau projet'}</h1>

      <form onSubmit={enregistrerProjet} className='mt-6  flex flex-col gap-5'>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>Titre</label>
          <input
            type='text'
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            required
            className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>Client</label>
          <SelectionClient clientId={clientId} onChange={setClientId} />
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>Description</label>
          <EditeurTexte valeurInitiale={description} onChange={setDescription} />
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>Montant attendu</label>
          <input
            type='number'
            value={montantAttendu}
            onChange={(e) => setMontantAttendu(e.target.value)}
            required
            min='0'
            step='0.01'
            className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
          />
        </div>

        <div className='flex items-center gap-3 mt-2'>
          <button
            type='submit'
            disabled={enregistrementEnCours}
            className='flex items-center justify-center gap-2 rounded-full bg-blue-600 text-white font-medium px-4 py-3 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed'
          >
            {enregistrementEnCours && <Loader2 className='h-5 w-5 animate-spin' />}
            {enregistrementEnCours ? 'Enregistrement...' : id ? 'Modifier' : 'Enregistrer'}
          </button>
          <Link
            to={id ? `/projet/${id}` : '/projets'}
            className='rounded-full border border-gray-300 text-gray-700 font-medium px-4 py-3 hover:bg-gray-50'
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}

export default ProjetFormulaire
