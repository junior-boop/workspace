import { useRef, useState, type ChangeEvent, type SubmitEvent } from 'react'
import { CircleUserRound, LogOut, Camera, Eye, EyeOff, Loader2 } from 'lucide-react'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { hasherMotDePasse } from '../utils/motDePasse'

const LABELS_ROLE: Record<string, string> = {
  fondateur: 'Fondateur',
  responsable: 'Responsable',
  collaborateur: 'Collaborateur',
}

function Profil() {
  const { utilisateur, deconnecter } = useAuth()
  const [nom, setNom] = useState(() => utilisateur?.nom ?? '')
  const [prenoms, setPrenoms] = useState(() => utilisateur?.prenoms ?? '')
  const [email, setEmail] = useState(() => utilisateur?.email ?? '')
  const [emailSecondaire, setEmailSecondaire] = useState(() => utilisateur?.emailSecondaire ?? '')
  const [telephone, setTelephone] = useState(() => utilisateur?.telephone ?? '')
  const [telephoneSecondaire, setTelephoneSecondaire] = useState(() => utilisateur?.telephoneSecondaire ?? '')
  const [adresse, setAdresse] = useState(() => utilisateur?.adresse ?? '')
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('')
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false)
  const [afficherConfirmation, setAfficherConfirmation] = useState(false)
  const [photo, setPhoto] = useState<string | null>(() => utilisateur?.photo ?? null)
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false)
  const inputPhotoRef = useRef<HTMLInputElement>(null)

  if (!utilisateur) return null

  const choisirPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    const lecteur = new FileReader()
    lecteur.onload = () => setPhoto(lecteur.result as string)
    lecteur.readAsDataURL(fichier)
  }

  const enregistrerProfil = async (e: SubmitEvent) => {
    e.preventDefault()
    setEnregistrementEnCours(true)
    try {
      const donnees: Record<string, unknown> = {
        nom,
        prenoms,
        email: email.trim().toLowerCase(),
        emailSecondaire: emailSecondaire.trim().toLowerCase(),
        telephone,
        telephoneSecondaire,
        adresse,
        photo,
        updatedAt: serverTimestamp(),
      }
      if (motDePasse) {
        donnees.motDePasse = await hasherMotDePasse(motDePasse)
      }
      await setDoc(doc(db, 'utilisateurs', utilisateur.id), donnees, { merge: true })
      setMotDePasse('')
      setConfirmationMotDePasse('')
    } finally {
      setEnregistrementEnCours(false)
    }
  }

  return (
    <div className='p-8'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-gray-800'>Profil</h1>
        <span className='inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700'>
          {LABELS_ROLE[utilisateur.role]}
        </span>
      </div>

      <form onSubmit={enregistrerProfil} className='mt-6 flex gap-6'>
        <div className='w-[35%] flex flex-col items-center'>
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
          <div className='flex gap-4'>
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

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Deuxième adresse mail (optionnel)</label>
            <input
              type='email'
              value={emailSecondaire}
              onChange={(e) => setEmailSecondaire(e.target.value)}
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
            <label className='block text-sm font-medium text-gray-700 mb-2'>Deuxième numéro de téléphone (optionnel)</label>
            <input
              type='tel'
              value={telephoneSecondaire}
              onChange={(e) => setTelephoneSecondaire(e.target.value)}
              className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Adresse (optionnel)</label>
            <input
              type='text'
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Mot de passe (laisser vide pour ne pas changer)</label>
            <div className='relative'>
              <input
                type={afficherMotDePasse ? 'text' : 'password'}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
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

          <div className='flex items-center gap-3 mt-2'>
            <button
              type='submit'
              disabled={enregistrementEnCours}
              className='flex items-center justify-center gap-2 rounded-full bg-blue-600 text-white font-medium px-4 py-3 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed'
            >
              {enregistrementEnCours && <Loader2 className='h-5 w-5 animate-spin' />}
              {enregistrementEnCours ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>

            <button
              type='button'
              onClick={deconnecter}
              className='flex items-center gap-2 rounded-full border border-red-200 text-red-600 font-medium px-4 py-3 hover:bg-red-50'
            >
              <LogOut strokeWidth={2} className='h-5 w-5' />
              Déconnexion
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default Profil
