import { useEffect, useState, type SubmitEvent } from 'react'
import { Loader2, SendHorizonal } from 'lucide-react'
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where, type Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import ModaleBas from './ModaleBas'

type Commentaire = {
  id: string
  projetId: string
  auteurId: string
  texte: string
  createdAt: Timestamp | null
}

type Utilisateur = {
  nom: string
  prenoms: string
}

function CommentairesProjet({ projetId, open, onClose }: { projetId: string, open: boolean, onClose: () => void }) {
  const { utilisateur } = useAuth()
  const [commentaires, setCommentaires] = useState<Commentaire[]>([])
  const [auteurs, setAuteurs] = useState<Record<string, Utilisateur>>({})
  const [texte, setTexte] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'commentairesProjets'), where('projetId', '==', projetId), orderBy('createdAt', 'asc')),
      (snapshot) => {
        setCommentaires(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Commentaire)))
      }
    )
    return unsubscribe
  }, [projetId])

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'utilisateurs'), (snapshot) => {
      setAuteurs(Object.fromEntries(snapshot.docs.map((d) => [d.id, d.data() as Utilisateur])))
    })
    return unsubscribe
  }, [])

  const nomAuteur = (id: string) => {
    if (utilisateur && id === utilisateur.id) return 'Vous'
    const auteur = auteurs[id]
    return auteur ? `${auteur.prenoms.split(' ')[0]} ${auteur.nom}` : 'Utilisateur'
  }

  const envoyerCommentaire = async (e: SubmitEvent) => {
    e.preventDefault()
    const texteEnvoye = texte.trim()
    if (!texteEnvoye || !utilisateur) return
    setEnvoiEnCours(true)
    try {
      await addDoc(collection(db, 'commentairesProjets'), {
        projetId,
        auteurId: utilisateur.id,
        texte: texteEnvoye,
        createdAt: serverTimestamp(),
      })
      setTexte('')
    } finally {
      setEnvoiEnCours(false)
    }
  }

  return (
    <ModaleBas open={open} onClose={onClose} title='Commentaires'>
      <div className='flex flex-col gap-3 max-h-[50vh] overflow-y-auto'>
        {commentaires.length === 0 && (
          <p className='text-gray-500 text-sm'>Aucun commentaire pour le moment.</p>
        )}
        {commentaires.map((commentaire) => (
          <div key={commentaire.id} className='rounded-xl bg-gray-50 px-4 py-3'>
            <p className='text-sm font-medium text-gray-800'>{nomAuteur(commentaire.auteurId)}</p>
            <p className='text-gray-700 mt-1'>{commentaire.texte}</p>
          </div>
        ))}
      </div>

      <form onSubmit={envoyerCommentaire} className='flex items-center gap-3 mt-4'>
        <input
          type='text'
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder='Écrire un commentaire...'
          className='flex-1 rounded-full border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
        />
        <button
          type='submit'
          disabled={!texte.trim() || envoiEnCours}
          className='flex items-center justify-center h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
        >
          {envoiEnCours ? <Loader2 className='h-4 w-4 animate-spin' /> : <SendHorizonal strokeWidth={2} className='h-4 w-4' />}
        </button>
      </form>
    </ModaleBas>
  )
}

export default CommentairesProjet
