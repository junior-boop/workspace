import { useState, type SubmitEvent } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { verifierMotDePasse } from '../utils/motDePasse'
import { useAuth } from '../contexts/AuthContext'
import logo from '../assets/logo.png'

function Login() {
  const { connecter } = useAuth()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false)
  const [erreur, setErreur] = useState('')
  const [connexionEnCours, setConnexionEnCours] = useState(false)

  const seConnecter = async (e: SubmitEvent) => {
    e.preventDefault()
    setErreur('')
    setConnexionEnCours(true)
    try {
      const resultats = await getDocs(query(collection(db, 'utilisateurs'), where('email', '==', email.trim().toLowerCase())))
      const utilisateurDoc = resultats.docs[0]
      const motDePasseValide = utilisateurDoc && await verifierMotDePasse(motDePasse, utilisateurDoc.data().motDePasse)
      if (!utilisateurDoc || !motDePasseValide) {
        setErreur('Email ou mot de passe incorrect.')
        return
      }
      connecter(utilisateurDoc.id)
    } finally {
      setConnexionEnCours(false)
    }
  }

  return (
    <div className='flex h-dvh w-dvw'>
      <div className='flex flex-1 items-center justify-center p-8'>
        <form onSubmit={seConnecter} className='w-full max-w-sm flex flex-col gap-5'>
          <div>
            <img src={logo} alt='Logo' className='h-10 mb-4' />
          </div>
          <div>
            <h1 className='text-2xl font-bold text-gray-800'>Connexion</h1>
            <p className='text-gray-500 mt-1'>Connectez-vous pour accéder à votre caisse.</p>
          </div>

          {erreur && (
            <p className='rounded-xl bg-red-50 text-red-700 text-sm px-4 py-2'>{erreur}</p>
          )}

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
            <label className='block text-sm font-medium text-gray-700 mb-2'>Mot de passe</label>
            <div className='relative'>
              <input
                type={afficherMotDePasse ? 'text' : 'password'}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                required
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

          <button
            type='submit'
            disabled={connexionEnCours}
            className='mt-2 flex items-center justify-center gap-2 rounded-full bg-blue-600 text-white font-medium px-4 py-3 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed'
          >
            {connexionEnCours && <Loader2 className='h-5 w-5 animate-spin' />}
            {connexionEnCours ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
