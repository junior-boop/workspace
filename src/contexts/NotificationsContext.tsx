import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { collection, onSnapshot, type Timestamp } from 'firebase/firestore'
import { onValue, ref } from 'firebase/database'
import { db, rtdb } from '../firebase'
import { useAuth } from './AuthContext'
import { ID_ANNONCES, ID_GROUPE, idConversationPrivee } from '../utils/conversation'

type ResumeConversation = {
  dernierMessageAt?: number
}

type DocumentHorodate = {
  createdAt?: Timestamp
}

type NotificationsContextValeur = {
  messagesNonLus: number
  mouvementsNonLus: number
  projetsNonLus: number
}

const NotificationsContext = createContext<NotificationsContextValeur | null>(null)

function useCompteurFirestore(nomCollection: string, vueAt: number) {
  const [compteur, setCompteur] = useState(0)

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, nomCollection), (snapshot) => {
      setCompteur(
        snapshot.docs.filter((d) => {
          const createdAt = (d.data() as DocumentHorodate).createdAt
          return !!createdAt && createdAt.toMillis() > vueAt
        }).length
      )
    })
    return unsubscribe
  }, [nomCollection, vueAt])

  return compteur
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { utilisateur } = useAuth()
  const [idsContacts, setIdsContacts] = useState<string[]>([])
  const [conversations, setConversations] = useState<Record<string, ResumeConversation>>({})
  const [lectures, setLectures] = useState<Record<string, Record<string, number>>>({})
  const [vues, setVues] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!utilisateur) return
    const unsubscribe = onSnapshot(collection(db, 'utilisateurs'), (snapshot) => {
      setIdsContacts(snapshot.docs.map((d) => d.id).filter((id) => id !== utilisateur.id))
    })
    return unsubscribe
  }, [utilisateur])

  useEffect(() => {
    const unsubscribe = onValue(ref(rtdb, 'conversations'), (snapshot) => {
      setConversations(snapshot.val() ?? {})
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = onValue(ref(rtdb, 'lectures'), (snapshot) => {
      setLectures(snapshot.val() ?? {})
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!utilisateur) return
    const unsubscribe = onValue(ref(rtdb, `vues/${utilisateur.id}`), (snapshot) => {
      setVues(snapshot.val() ?? {})
    })
    return unsubscribe
  }, [utilisateur])

  const idsConversations = utilisateur
    ? [ID_ANNONCES, ID_GROUPE, ...idsContacts.map((id) => idConversationPrivee(utilisateur.id, id))]
    : []

  const messagesNonLus = utilisateur
    ? idsConversations.filter((id) => {
        const dernierMessageAt = conversations[id]?.dernierMessageAt
        return !!dernierMessageAt && dernierMessageAt > (lectures[id]?.[utilisateur.id] ?? 0)
      }).length
    : 0

  const mouvementsNonLus = useCompteurFirestore('mouvements', vues.mouvements ?? 0)
  const projetsNonLus = useCompteurFirestore('projets', vues.projets ?? 0)

  return (
    <NotificationsContext.Provider value={{ messagesNonLus, mouvementsNonLus, projetsNonLus }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const contexte = useContext(NotificationsContext)
  if (!contexte) throw new Error('useNotifications doit être utilisé dans un NotificationsProvider')
  return contexte
}
