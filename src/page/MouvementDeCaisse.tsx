import { useEffect, useMemo, useState, type SubmitEvent } from 'react'
import { Plus, ArrowDownCircle, ArrowUpCircle, Loader2, Trash2 } from 'lucide-react'
import { collection, deleteDoc, doc, increment, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { ref, set } from 'firebase/database'
import { db, rtdb } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import SoldeCaisse from '../composants/SoldeCaisse'
import ModaleBas from '../composants/ModaleBas'
import SelectMultiple from '../composants/SelectMultiple'

const MOTIFS_SORTIE = ['Achat fournitures', 'Transport', 'Salaire', 'Entretien', 'Autre']
const MOTIFS_ENTREE = ['Cotisation des membres', 'Versement projet', 'Vente', 'Remboursement', 'Apport', 'Subvention', 'Autre']
const MOTIF_COTISATION = 'Cotisation des membres'
const NOMBRE_PAR_PAGE = 25

type Membre = {
  id: string
  nom: string
  prenoms: string
}

type Mouvement = {
  type: 'entree' | 'sortie'
  montant: number
  motifs: string[]
  membreId: string | null
  projetId?: string | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

type MouvementFirestore = Mouvement & { id: string }

function MouvementDeCaisse() {
  const { utilisateur } = useAuth()
  const [modaleOuverte, setModaleOuverte] = useState(false)
  const [type, setType] = useState<'entree' | 'sortie'>('entree')
  const [montant, setMontant] = useState('')
  const [motifs, setMotifs] = useState<string[]>([])
  const [membre, setMembre] = useState('')
  const [membres, setMembres] = useState<Membre[]>([])
  const [mouvements, setMouvements] = useState<MouvementFirestore[]>([])
  const [chargementMouvements, setChargementMouvements] = useState(true)
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false)
  const [suppressionEnCours, setSuppressionEnCours] = useState(false)
  const [idEnEdition, setIdEnEdition] = useState<string | null>(null)
  const [projetIdEnEdition, setProjetIdEnEdition] = useState<string | null>(null)
  const [nombreAffiche, setNombreAffiche] = useState(NOMBRE_PAR_PAGE)

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'utilisateurs'), (snapshot) => {
      setMembres(snapshot.docs.map((doc) => {
        const data = doc.data()
        return { id: doc.id, nom: data.nom, prenoms: data.prenoms }
      }))
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'mouvements'), orderBy('createdAt', 'desc')), (snapshot) => {
      setMouvements(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as MouvementFirestore)))
      setChargementMouvements(false)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!utilisateur) return
    set(ref(rtdb, `vues/${utilisateur.id}/mouvements`), Date.now())
  }, [utilisateur, mouvements.length])

  const choisirType = (nouveauType: 'entree' | 'sortie') => {
    setType(nouveauType)
    setMotifs([])
    setMembre('')
  }

  const reinitialiserFormulaire = () => {
    setIdEnEdition(null)
    setProjetIdEnEdition(null)
    setType('entree')
    setMontant('')
    setMotifs([])
    setMembre('')
  }

  const peutModifier = utilisateur?.role !== 'collaborateur'

  const ouvrirAjout = () => {
    if (!peutModifier) return
    reinitialiserFormulaire()
    setModaleOuverte(true)
  }

  const ouvrirEdition = (mouvement: MouvementFirestore) => {
    if (!peutModifier) return
    setIdEnEdition(mouvement.id)
    setProjetIdEnEdition(mouvement.projetId ?? null)
    setType(mouvement.type)
    setMontant(String(mouvement.montant))
    setMotifs(mouvement.motifs)
    setMembre(mouvement.membreId ?? '')
    setModaleOuverte(true)
  }

  const motifsDisponibles = type === 'sortie' ? MOTIFS_SORTIE : MOTIFS_ENTREE
  const cotisationSelectionnee = type === 'entree' && motifs.includes(MOTIF_COTISATION)

  const nomMembre = (membreId: string | null) => {
    const m = membres.find((m) => m.id === membreId)
    return m ? `${m.nom} ${m.prenoms}` : null
  }

  const solde = useMemo(
    () => mouvements.reduce((total, m) => total + (m.type === 'entree' ? m.montant : -m.montant), 0),
    [mouvements]
  )

  const mouvementsAffiches = useMemo(
    () => mouvements.slice(0, nombreAffiche),
    [mouvements, nombreAffiche]
  )

  const groupesParJour = useMemo(
    () => mouvementsAffiches.reduce((groupes, mouvement) => {
      const date = mouvement.createdAt ? mouvement.createdAt.toDate() : new Date()
      const jour = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      const jourCapitalise = jour.charAt(0).toUpperCase() + jour.slice(1)
      const liste = groupes.get(jourCapitalise) ?? []
      liste.push(mouvement)
      groupes.set(jourCapitalise, liste)
      return groupes
    }, new Map<string, MouvementFirestore[]>()),
    [mouvementsAffiches]
  )

  const enregistrerMouvement = async (e: SubmitEvent) => {
    e.preventDefault()
    if (!peutModifier) return
    setEnregistrementEnCours(true)
    try {
      if (idEnEdition) {
        await setDoc(doc(db, 'mouvements', idEnEdition), {
          type,
          montant: Number(montant),
          motifs,
          membreId: cotisationSelectionnee ? membre : null,
          updatedAt: serverTimestamp(),
        }, { merge: true })
      } else {
        await setDoc(doc(db, 'mouvements', String(Date.now())), {
          type,
          montant: Number(montant),
          motifs,
          membreId: cotisationSelectionnee ? membre : null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      reinitialiserFormulaire()
      setModaleOuverte(false)
    } finally {
      setEnregistrementEnCours(false)
    }
  }

  const supprimerMouvement = async () => {
    if (!peutModifier || !idEnEdition) return
    if (!window.confirm('Voulez-vous vraiment supprimer ce mouvement de caisse ?')) return
    setSuppressionEnCours(true)
    try {
      await deleteDoc(doc(db, 'mouvements', idEnEdition))
      if (projetIdEnEdition && type === 'entree') {
        await updateDoc(doc(db, 'projets', projetIdEnEdition), {
          montantVerse: increment(-Number(montant)),
          updatedAt: serverTimestamp(),
        })
      }
      reinitialiserFormulaire()
      setModaleOuverte(false)
    } finally {
      setSuppressionEnCours(false)
    }
  }

  return (
    <div className='p-4 md:p-8'>
      <div className='sticky top-0 -mx-4 md:-mx-8 -mt-4 md:-mt-8 z-10 bg-white px-4 md:px-8 pt-4 md:pt-8 pb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between' is-header>
        <h1 className='text-2xl font-bold text-gray-800'>Mouvements de caisse</h1>
        {peutModifier && (
          <button
            onClick={ouvrirAjout}
            className='flex items-center gap-2 rounded-full bg-blue-600 text-white font-medium px-4 py-2 hover:bg-blue-700 w-max'
          >
            <Plus strokeWidth={2} className='h-5 w-5' />
            Ajouter un mouvement de caisse
          </button>
        )}
      </div>
      <div className='mt-6'>
        <SoldeCaisse montant={solde} />
      </div>

      <div className='mt-6 flex flex-col gap-6'>
        {chargementMouvements && (
          <div className='flex items-center gap-2 text-gray-500'>
            <Loader2 className='h-5 w-5 animate-spin' />
            Chargement des mouvements...
          </div>
        )}

        {!chargementMouvements && mouvements.length === 0 && (
          <p className='text-gray-500'>Aucun mouvement pour le moment.</p>
        )}

        {[...groupesParJour.entries()].map(([jour, mouvementsDuJour]) => (
          <div key={jour}>
            <h2 className='text-sm font-semibold text-gray-500 mb-3'>{jour}</h2>
            <div className='flex flex-col gap-3'>
              {mouvementsDuJour.map((mouvement) => (
                <div
                  key={mouvement.id}
                  onClick={peutModifier ? () => ouvrirEdition(mouvement) : undefined}
                  className={`flex items-center gap-2 sm:gap-4 rounded-2xl border border-gray-200 p-4 ${peutModifier ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                >
                  {mouvement.type === 'entree' ? (
                    <ArrowUpCircle strokeWidth={2} className='h-10 w-10 text-green-600 shrink-0' />
                  ) : (
                    <ArrowDownCircle strokeWidth={2} className='h-10 w-10 text-red-600 shrink-0' />
                  )}
                  <div className='flex-1 min-w-0'>
                    <p className='font-medium text-gray-800 truncate'>{mouvement.motifs.join(', ') || 'Sans motif'}</p>
                    <p className='text-sm text-gray-500 truncate'>
                      {mouvement.createdAt ? mouvement.createdAt.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Envoi en cours...'}
                      {nomMembre(mouvement.membreId) && ` · ${nomMembre(mouvement.membreId)}`}
                    </p>
                  </div>
                  <span className={`shrink-0 font-semibold ${mouvement.type === 'entree' ? 'text-green-700' : 'text-red-700'}`}>
                    {mouvement.type === 'entree' ? '+' : '-'}{mouvement.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {mouvements.length > nombreAffiche && (
          <button
            type='button'
            onClick={() => setNombreAffiche((n) => n + NOMBRE_PAR_PAGE)}
            className='self-center rounded-full border border-gray-300 text-gray-700 font-medium px-4 py-2 hover:bg-gray-50'
          >
            Charger plus
          </button>
        )}
      </div>

      <ModaleBas
        open={modaleOuverte}
        onClose={() => { setModaleOuverte(false); reinitialiserFormulaire() }}
        title={idEnEdition ? 'Modifier le mouvement de caisse' : 'Ajouter un mouvement de caisse'}
      >
        <form onSubmit={enregistrerMouvement} className='flex flex-col gap-5'>
          <div className='flex gap-2'>
            <button
              type='button'
              onClick={() => choisirType('entree')}
              className={`w-25 px-4 py-2 rounded-lg font-medium border ${type === 'entree' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300'}`}
            >
              Entrée
            </button>
            <button
              type='button'
              onClick={() => choisirType('sortie')}
              className={`w-25 px-4 py-2 rounded-lg font-medium border ${type === 'sortie' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300'}`}
            >
              Sortie
            </button>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Montant</label>
            <input
              type='number'
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              required
              min='0'
              step='0.01'
              className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Motifs</label>
            <SelectMultiple options={motifsDisponibles} selected={motifs} onChange={setMotifs} />
          </div>

          {cotisationSelectionnee && (
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Membre</label>
              <select
                value={membre}
                onChange={(e) => setMembre(e.target.value)}
                className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
              >
                <option value=''></option>
                {membres.map((m) => (
                  <option key={m.id} value={m.id}>{m.nom} {m.prenoms}</option>
                ))}
              </select>
            </div>
          )}

          <div className='flex items-center gap-3 mt-2'>
            <button
              type='submit'
              disabled={enregistrementEnCours || suppressionEnCours}
              className='flex-1 flex items-center justify-center gap-2 rounded-full bg-blue-600 text-white font-medium px-4 py-3 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed'
            >
              {enregistrementEnCours && <Loader2 className='h-5 w-5 animate-spin' />}
              {enregistrementEnCours ? 'Enregistrement...' : idEnEdition ? 'Modifier' : 'Enregistrer'}
            </button>
            {idEnEdition && (
              <button
                type='button'
                onClick={supprimerMouvement}
                disabled={enregistrementEnCours || suppressionEnCours}
                className='flex items-center justify-center h-12 w-12 rounded-full text-red-500 hover:bg-red-50 disabled:opacity-50'
              >
                {suppressionEnCours ? <Loader2 className='h-5 w-5 animate-spin' /> : <Trash2 strokeWidth={2} className='h-5 w-5' />}
              </button>
            )}
          </div>
        </form>
      </ModaleBas>
    </div>
  )
}

export default MouvementDeCaisse
