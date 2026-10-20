import { useEffect, useRef, useState, type ChangeEvent, type SubmitEvent } from 'react'
import { Plus, CircleUserRound, Camera, Eye, EyeOff, Loader2, Pencil, Trash2 } from 'lucide-react'
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import ModaleBas from '../composants/ModaleBas'
import { hasherMotDePasse } from '../utils/motDePasse'
import { blobVersDataUrl, compresserImageEnJpeg } from '../utils/image'

type Role = 'fondateur' | 'responsable' | 'collaborateur'

const LABELS_ROLE: Record<Role, string> = {
  fondateur: 'Fondateur',
  responsable: 'Responsable',
  collaborateur: 'collaborateur',
}

type Utilisateur = {
  nom: string
  prenoms: string
  email: string
  emailSecondaire: string
  telephone: string
  telephoneSecondaire: string
  adresse: string
  motDePasse: string
  role: Role
  photo: string | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

type UtilisateurFirestore = Utilisateur & { id: string }

function Utilisateurs() {
  const [modaleOuverte, setModaleOuverte] = useState(false)
  const [utilisateurs, setUtilisateurs] = useState<UtilisateurFirestore[]>([])
  const [chargementUtilisateurs, setChargementUtilisateurs] = useState(true)

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'utilisateurs'), (snapshot) => {
      setUtilisateurs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as UtilisateurFirestore)))
      setChargementUtilisateurs(false)
    })
    return unsubscribe
  }, [])

  const [nom, setNom] = useState('')
  const [prenoms, setPrenoms] = useState('')
  const [email, setEmail] = useState('')
  const [emailSecondaire, setEmailSecondaire] = useState('')
  const [telephone, setTelephone] = useState('')
  const [telephoneSecondaire, setTelephoneSecondaire] = useState('')
  const [adresse, setAdresse] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('')
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false)
  const [afficherConfirmation, setAfficherConfirmation] = useState(false)
  const [role, setRole] = useState<Role>('collaborateur')
  const [photo, setPhoto] = useState<string | null>(null)
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false)
  const [idEnEdition, setIdEnEdition] = useState<string | null>(null)
  const [idEnSuppression, setIdEnSuppression] = useState<string | null>(null)
  const inputPhotoRef = useRef<HTMLInputElement>(null)

  const choisirPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    const imageCompressee = await compresserImageEnJpeg(fichier)
    setPhoto(await blobVersDataUrl(imageCompressee))
  }

  const reinitialiserFormulaire = () => {
    setIdEnEdition(null)
    setNom('')
    setPrenoms('')
    setEmail('')
    setEmailSecondaire('')
    setTelephone('')
    setTelephoneSecondaire('')
    setAdresse('')
    setMotDePasse('')
    setConfirmationMotDePasse('')
    setAfficherMotDePasse(false)
    setAfficherConfirmation(false)
    setRole('collaborateur')
    setPhoto(null)
  }

  const ouvrirAjout = () => {
    reinitialiserFormulaire()
    setModaleOuverte(true)
  }

  const ouvrirEdition = (utilisateur: UtilisateurFirestore) => {
    setIdEnEdition(utilisateur.id)
    setNom(utilisateur.nom)
    setPrenoms(utilisateur.prenoms)
    setEmail(utilisateur.email)
    setEmailSecondaire(utilisateur.emailSecondaire ?? '')
    setTelephone(utilisateur.telephone)
    setTelephoneSecondaire(utilisateur.telephoneSecondaire ?? '')
    setAdresse(utilisateur.adresse ?? '')
    setMotDePasse('')
    setConfirmationMotDePasse('')
    setRole(utilisateur.role)
    setPhoto(utilisateur.photo)
    setModaleOuverte(true)
  }

  const supprimerUtilisateur = async (utilisateur: UtilisateurFirestore) => {
    if (utilisateur.role === 'fondateur') {
      window.alert('Impossible de supprimer un fondateur.')
      return
    }
    if (!window.confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return
    setIdEnSuppression(utilisateur.id)
    try {
      await deleteDoc(doc(db, 'utilisateurs', utilisateur.id))
    } finally {
      setIdEnSuppression(null)
    }
  }

  const enregistrerUtilisateur = async (e: SubmitEvent) => {
    e.preventDefault()
    setEnregistrementEnCours(true)
    try {
      if (idEnEdition) {
        const donnees: Record<string, unknown> = {
          nom,
          prenoms,
          email: email.trim().toLowerCase(),
          emailSecondaire: emailSecondaire.trim().toLowerCase(),
          telephone,
          telephoneSecondaire,
          adresse,
          role,
          photo,
          updatedAt: serverTimestamp(),
        }
        if (motDePasse) {
          donnees.motDePasse = await hasherMotDePasse(motDePasse)
        }
        await setDoc(doc(db, 'utilisateurs', idEnEdition), donnees, { merge: true })
      } else {
        await setDoc(doc(db, 'utilisateurs', String(Date.now())), {
          nom,
          prenoms,
          email: email.trim().toLowerCase(),
          emailSecondaire: emailSecondaire.trim().toLowerCase(),
          telephone,
          telephoneSecondaire,
          adresse,
          motDePasse: await hasherMotDePasse(motDePasse),
          role,
          photo,
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

  return (
    <div className='p-4 md:p-8'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <h1 className='text-2xl font-bold text-gray-800'>Les utilisateurs</h1>
        <button
          onClick={ouvrirAjout}
          className='flex items-center gap-2 rounded-full bg-blue-600 text-white font-medium px-4 py-2 hover:bg-blue-700 w-max'
        >
          <Plus strokeWidth={2} className='h-5 w-5' />
          Ajouter un utilisateur
        </button>
      </div>

      <div className='mt-6 flex flex-col gap-3'>
        {chargementUtilisateurs && (
          <div className='flex items-center gap-2 text-gray-500'>
            <Loader2 className='h-5 w-5 animate-spin' />
            Chargement des utilisateurs...
          </div>
        )}

        {!chargementUtilisateurs && utilisateurs.length === 0 && (
          <p className='text-gray-500'>Aucun utilisateur pour le moment.</p>
        )}

        {utilisateurs.map((utilisateur) => (
          <div key={utilisateur.id} className='flex items-center gap-2 sm:gap-4 rounded-2xl border border-gray-200 p-4'>
            {utilisateur.photo ? (
              <img src={utilisateur.photo} alt='' className='h-10 w-10 rounded-full object-cover object-top shrink-0' />
            ) : (
              <CircleUserRound strokeWidth={2} className='h-10 w-10 text-gray-400 shrink-0' />
            )}
            <div className='flex-1 min-w-0'>
              <p className='font-medium text-gray-800 truncate'>{utilisateur.nom} {utilisateur.prenoms}</p>
              <p className='text-sm text-gray-500 truncate'>{utilisateur.email} · {utilisateur.telephone}</p>
            </div>
            <span className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium ${utilisateur.role === 'collaborateur' ? 'bg-gray-100 text-gray-700' : 'bg-blue-50 text-blue-700'}`}>
              {LABELS_ROLE[utilisateur.role]}
            </span>
            <button
              type='button'
              onClick={() => ouvrirEdition(utilisateur)}
              className='flex items-center justify-center h-9 w-9 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800'
            >
              <Pencil strokeWidth={2} className='h-4 w-4' />
            </button>
            {utilisateur.role !== 'fondateur' && (
              <button
                type='button'
                onClick={() => supprimerUtilisateur(utilisateur)}
                disabled={idEnSuppression === utilisateur.id}
                className='flex items-center justify-center h-9 w-9 rounded-full text-red-500 hover:bg-red-50 disabled:opacity-50'
              >
                {idEnSuppression === utilisateur.id ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Trash2 strokeWidth={2} className='h-4 w-4' />
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      <ModaleBas
        open={modaleOuverte}
        onClose={() => { setModaleOuverte(false); reinitialiserFormulaire() }}
        title={idEnEdition ? 'Modifier un utilisateur' : 'Ajouter un utilisateur'}
      >
        <form onSubmit={enregistrerUtilisateur} className='flex flex-col md:flex-row gap-6'>
          <div className='w-full md:w-[35%] flex flex-col items-center'>
            <div className='relative'>
              <div className='h-42 w-42 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center'>
                {photo ? (
                  <img src={photo} alt='Photo de profil' className='h-full w-full object-cover object-top' />
                ) : (
                  <CircleUserRound strokeWidth={2} className='h-16 w-16 text-gray-400' />
                )}
              </div>
              <button
                type='button'
                onClick={() => inputPhotoRef.current?.click()}
                className='absolute bottom-0 right-0 flex items-center justify-center h-9 w-9 rounded-full bg-blue-600 text-white hover:bg-blue-700'
              >
                <Camera strokeWidth={2} className='h-4 w-4' />
              </button>
              <input
                ref={inputPhotoRef}
                type='file'
                accept='image/*'
                onChange={choisirPhoto}
                className='hidden'
              />
            </div>
          </div>

          <div className='flex-1 flex flex-col gap-5'>
            <div className='flex flex-col sm:flex-row gap-4'>
              <div className='flex-1'>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Nom</label>
                <input
                  type='text'
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
                />
              </div>
              <div className='flex-1'>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Prénoms</label>
                <input
                  type='text'
                  value={prenoms}
                  onChange={(e) => setPrenoms(e.target.value)}
                  required
                  className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Adresse mail</label>
              <input
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
              />
            </div>

            {/* <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Deuxième adresse mail (optionnel)</label>
              <input
                type='email'
                value={emailSecondaire}
                onChange={(e) => setEmailSecondaire(e.target.value)}
                className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
              />
            </div> */}

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

            {/* <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Deuxième numéro de téléphone (optionnel)</label>
              <input
                type='tel'
                value={telephoneSecondaire}
                onChange={(e) => setTelephoneSecondaire(e.target.value)}
                className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
              />
            </div> */}

            {/* <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Adresse (optionnel)</label>
              <input
                type='text'
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
              />
            </div> */}

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Mot de passe{idEnEdition && ' (laisser vide pour ne pas changer)'}</label>
              <div className='relative'>
                <input
                  type={afficherMotDePasse ? 'text' : 'password'}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  required={!idEnEdition}
                  minLength={8}
                  title='8 caractères minimum'
                  className='w-full rounded-xl border border-gray-300 px-4 py-2 pr-11 focus:outline-none focus:border-blue-500'
                />
                <button
                  type='button'
                  onClick={() => setAfficherMotDePasse(!afficherMotDePasse)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800'
                >
                  {afficherMotDePasse ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
                </button>
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Confirmer le mot de passe</label>
              <div className='relative'>
                <input
                  type={afficherConfirmation ? 'text' : 'password'}
                  value={confirmationMotDePasse}
                  onChange={(e) => setConfirmationMotDePasse(e.target.value)}
                  required={!idEnEdition}
                  minLength={8}
                  title='8 caractères minimum'
                  className='w-full rounded-xl border border-gray-300 px-4 py-2 pr-11 focus:outline-none focus:border-blue-500'
                />
                <button
                  type='button'
                  onClick={() => setAfficherConfirmation(!afficherConfirmation)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800'
                >
                  {afficherConfirmation ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
                </button>
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Rôle</label>
              <div className='flex flex-wrap gap-2'>
                <button
                  type='button'
                  onClick={() => setRole('fondateur')}
                  className={`w-max px-4 py-2 rounded-lg font-medium border ${role === 'fondateur' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  Fondateur
                </button>
                <button
                  type='button'
                  onClick={() => setRole('responsable')}
                  className={`w-max px-4 py-2 rounded-lg font-medium border ${role === 'responsable' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  Responsable
                </button>
                <button
                  type='button'
                  onClick={() => setRole('collaborateur')}
                  className={`w-max px-4 py-2 rounded-lg font-medium border ${role === 'collaborateur' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  Collaborateur
                </button>
              </div>
            </div>

            <button
              type='submit'
              disabled={enregistrementEnCours}
              className='mt-2 flex items-center justify-center gap-2 rounded-full bg-blue-600 text-white font-medium px-4 py-3 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed'
            >
              {enregistrementEnCours && <Loader2 className='h-5 w-5 animate-spin' />}
              {enregistrementEnCours ? 'Enregistrement...' : idEnEdition ? 'Modifier' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </ModaleBas>
    </div>
  )
}

export default Utilisateurs
