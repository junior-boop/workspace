import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { doc, onSnapshot, Timestamp } from 'firebase/firestore'
import { onDisconnect, onValue, ref, serverTimestamp as rtdbServerTimestamp, set } from 'firebase/database'
import { db, rtdb } from '../firebase'

const CLE_SESSION = 'compte-caisse:utilisateurId'

type Role = 'fondateur' | 'responsable' | 'collaborateur'

export type UtilisateurConnecte = {
  id: string
  nom: string
  prenoms: string
  email: string
  emailSecondaire: string
  telephone: string
  telephoneSecondaire: string
  adresse: string
  role: Role
  photo: string | null
  favoris?: string[]
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

type AuthContextValeur = {
  utilisateur: UtilisateurConnecte | null
  chargement: boolean
  connecter: (id: string) => void
  deconnecter: () => void
}

const AuthContext = createContext<AuthContextValeur | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(() => localStorage.getItem(CLE_SESSION))
  const [utilisateur, setUtilisateur] = useState<UtilisateurConnecte | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    if (!id) {
      setUtilisateur(null)
      setChargement(false)
      return
    }
    setChargement(true)
    const unsubscribe = onSnapshot(doc(db, 'utilisateurs', id), (snapshot) => {
      if (snapshot.exists()) {
        const donnees = snapshot.data()
        const suspensionActive = donnees.statut === 'suspendu' && donnees.suspensionJusquA && donnees.suspensionJusquA.toMillis() > Date.now()
        if (donnees.statut === 'banni' || suspensionActive) {
          localStorage.removeItem(CLE_SESSION)
          setId(null)
          setUtilisateur(null)
          setChargement(false)
          return
        }
        setUtilisateur({ id: snapshot.id, ...donnees } as UtilisateurConnecte)
      } else {
        setUtilisateur(null)
        localStorage.removeItem(CLE_SESSION)
      }
      setChargement(false)
    })
    return unsubscribe
  }, [id])

  useEffect(() => {
    if (!id) return
    const presenceRef = ref(rtdb, `presence/${id}`)
    const unsubscribe = onValue(ref(rtdb, '.info/connected'), (snapshot) => {
      if (snapshot.val() !== true) return
      onDisconnect(presenceRef).set({ enLigne: false, derniereActivite: rtdbServerTimestamp() }).then(() => {
        set(presenceRef, { enLigne: true, derniereActivite: rtdbServerTimestamp() })
      })
    })
    return () => {
      unsubscribe()
      set(presenceRef, { enLigne: false, derniereActivite: rtdbServerTimestamp() })
    }
  }, [id])

  const connecter = useCallback((nouvelId: string) => {
    localStorage.setItem(CLE_SESSION, nouvelId)
    setId(nouvelId)
  }, [])

  const deconnecter = useCallback(() => {
    localStorage.removeItem(CLE_SESSION)
    setId(null)
  }, [])

  const valeur = useMemo(
    () => ({ utilisateur, chargement, connecter, deconnecter }),
    [utilisateur, chargement, connecter, deconnecter]
  )

  return (
    <AuthContext.Provider value={valeur}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const contexte = useContext(AuthContext)
  if (!contexte) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return contexte
}
