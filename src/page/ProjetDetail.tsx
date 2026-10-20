import { useEffect, useState, type SubmitEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, MessageCircle, MessageSquareText, Pencil, PlusCircle, Trash2 } from 'lucide-react'
import { addDoc, collection, deleteDoc, doc, increment, onSnapshot, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import EditeurTexte from '../composants/EditeurTexte'
import CommentairesProjet from '../composants/CommentairesProjet'
import ModaleBas from '../composants/ModaleBas'

type Projet = {
  titre: string
  clientId: string
  auteurId: string
  description: string
  montantAttendu: number
  montantVerse: number
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

type Client = {
  nomComplet: string
  telephone: string
  email: string
  entreprise: string
}

function ProjetDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { utilisateur } = useAuth()
  const [projet, setProjet] = useState<Projet | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [chargement, setChargement] = useState(true)
  const [modaleCommentairesOuverte, setModaleCommentairesOuverte] = useState(false)
  const [modaleVersementOuverte, setModaleVersementOuverte] = useState(false)
  const [montantVersement, setMontantVersement] = useState('')
  const [envoiVersementEnCours, setEnvoiVersementEnCours] = useState(false)
  const [suppressionEnCours, setSuppressionEnCours] = useState(false)

  useEffect(() => {
    if (!id) return
    const unsubscribe = onSnapshot(doc(db, 'projets', id), (snap) => {
      setProjet(snap.exists() ? (snap.data() as Projet) : null)
      setChargement(false)
    })
    return unsubscribe
  }, [id])

  useEffect(() => {
    if (!projet?.clientId) return
    const unsubscribe = onSnapshot(doc(db, 'clients', projet.clientId), (snap) => {
      setClient(snap.exists() ? (snap.data() as Client) : null)
    })
    return unsubscribe
  }, [projet?.clientId])

  if (chargement) {
    return (
      <div className='p-8 flex items-center gap-2 text-gray-500'>
        <Loader2 className='h-5 w-5 animate-spin' />
        Chargement du projet...
      </div>
    )
  }

  if (!projet) {
    return (
      <div className='p-8'>
        <p className='text-gray-500'>Ce projet n'existe pas ou a été supprimé.</p>
        <Link to='/projets' className='text-blue-600 hover:underline mt-2 inline-block'>Retour aux projets</Link>
      </div>
    )
  }

  const pourcentage = projet.montantAttendu > 0
    ? Math.min(100, Math.round((projet.montantVerse / projet.montantAttendu) * 100))
    : 0

  const supprimerProjet = async () => {
    if (!id) return
    if (!window.confirm('Voulez-vous vraiment supprimer ce projet ?')) return
    setSuppressionEnCours(true)
    try {
      await deleteDoc(doc(db, 'projets', id))
      navigate('/projets')
    } finally {
      setSuppressionEnCours(false)
    }
  }

  const ajouterVersement = async (e: SubmitEvent) => {
    e.preventDefault()
    const montant = Number(montantVersement)
    if (!id || !montant || montant <= 0) return
    setEnvoiVersementEnCours(true)
    try {
      await addDoc(collection(db, 'mouvements'), {
        type: 'entree',
        montant,
        motifs: ['Versement projet'],
        membreId: null,
        projetId: id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      await updateDoc(doc(db, 'projets', id), {
        montantVerse: increment(montant),
        updatedAt: serverTimestamp(),
      })
      setMontantVersement('')
      setModaleVersementOuverte(false)
    } finally {
      setEnvoiVersementEnCours(false)
    }
  }

  return (
    <div className='p-4 md:p-8'>
      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <Link to='/projets' className='flex items-center gap-2 text-gray-500 hover:text-gray-800'>
          <ArrowLeft strokeWidth={2} className='h-5 w-5' />
          Retour aux projets
        </Link>
        <div className='flex flex-wrap items-center gap-2 md:gap-3'>
          <button
            type='button'
            onClick={() => setModaleCommentairesOuverte(true)}
            className='flex items-center gap-2 rounded-full border border-gray-300 text-gray-700 font-medium px-4 py-2 hover:bg-gray-50'
          >
            <MessageSquareText strokeWidth={2} className='h-4 w-4' />
            Commentaires
          </button>
          {projet.auteurId && projet.auteurId !== utilisateur?.id && (
            <button
              type='button'
              onClick={() => navigate(`/messages?contact=${projet.auteurId}`)}
              className='flex items-center gap-2 rounded-full border border-gray-300 text-gray-700 font-medium px-4 py-2 hover:bg-gray-50'
            >
              <MessageCircle strokeWidth={2} className='h-4 w-4' />
              Message à l'auteur
            </button>
          )}
          <Link
            to={`/projet/${id}/modifier`}
            className='flex items-center gap-2 rounded-full bg-blue-600 text-white font-medium px-4 py-2 hover:bg-blue-700'
          >
            <Pencil strokeWidth={2} className='h-4 w-4' />
            Modifier
          </Link>
          <button
            type='button'
            onClick={supprimerProjet}
            disabled={suppressionEnCours}
            className='flex items-center justify-center h-9 w-9 rounded-full text-red-500 hover:bg-red-50 disabled:opacity-50'
          >
            {suppressionEnCours ? <Loader2 className='h-4 w-4 animate-spin' /> : <Trash2 strokeWidth={2} className='h-4 w-4' />}
          </button>
        </div>
      </div>

      <div className='mt-6 w-full max-w-150'>
        <h1 className='text-2xl font-bold text-gray-800'>{projet.titre}</h1>
        <p className='text-sm text-gray-500 mt-1'>Client : {client?.nomComplet}</p>

        <div className='mt-4'>
          <EditeurTexte valeurInitiale={projet.description} editable={false} />
        </div>

        <div className='mt-6 rounded-2xl bg-green-50 p-6'>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-gray-500 font-medium uppercase'>Montant versé</span>
            <button
              type='button'
              onClick={() => setModaleVersementOuverte(true)}
              className='flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-900'
            >
              <PlusCircle strokeWidth={2} className='h-4 w-4' />
              Ajouter un versement
            </button>
          </div>
          <p className='text-3xl font-bold text-green-900 mt-2'>
            {projet.montantVerse.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA
            <span className='text-base font-medium text-gray-500'> / {projet.montantAttendu.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA</span>
          </p>
          <div className='mt-3 h-2 w-full rounded-full bg-white overflow-hidden'>
            <div className='h-full rounded-full bg-green-600' style={{ width: `${pourcentage}%` }} />
          </div>
          <p className='text-sm text-gray-500 mt-1'>{pourcentage}% atteint</p>
        </div>
      </div>

      <CommentairesProjet
        projetId={id!}
        open={modaleCommentairesOuverte}
        onClose={() => setModaleCommentairesOuverte(false)}
      />

      <ModaleBas
        open={modaleVersementOuverte}
        onClose={() => setModaleVersementOuverte(false)}
        title='Ajouter un versement'
      >
        <form onSubmit={ajouterVersement} className='flex flex-col gap-5'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Montant versé</label>
            <input
              type='number'
              value={montantVersement}
              onChange={(e) => setMontantVersement(e.target.value)}
              required
              min='0'
              step='0.01'
              autoFocus
              className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
            />
            <p className='text-xs text-gray-500 mt-2'>Ce versement sera automatiquement enregistré comme un mouvement de caisse.</p>
          </div>
          <button
            type='submit'
            disabled={envoiVersementEnCours}
            className='flex items-center justify-center gap-2 rounded-full bg-blue-600 text-white font-medium px-4 py-3 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed'
          >
            {envoiVersementEnCours && <Loader2 className='h-5 w-5 animate-spin' />}
            {envoiVersementEnCours ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </ModaleBas>
    </div>
  )
}

export default ProjetDetail
