import { useEffect, useRef, useState, type ChangeEvent, type SubmitEvent } from 'react'
import { Check, CheckCheck, CircleUserRound, Loader2, Megaphone, Send, Star, Users } from 'lucide-react'
import { collection, doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { onValue, push, ref, remove, set, update } from 'firebase/database'
import { db, rtdb } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { ID_ANNONCES, ID_GROUPE, idConversationPrivee } from '../utils/conversation'

const DELAI_FRAPPE_MS = 3000

type Contact = {
  id: string
  nom: string
  prenoms: string
  photo: string | null
}

type Message = {
  id: string
  expediteurId: string
  texte: string
  envoyeAt: number
}

type ResumeConversation = {
  dernierMessage?: string
  dernierMessageAt?: number
}

type Presence = {
  enLigne?: boolean
  derniereActivite?: number
}

function Messages() {
  const { utilisateur } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [chargementContacts, setChargementContacts] = useState(true)
  const [resumes, setResumes] = useState<Record<string, ResumeConversation>>({})
  const [presence, setPresence] = useState<Record<string, Presence>>({})
  const [lectures, setLectures] = useState<Record<string, Record<string, number>>>({})
  const [frappe, setFrappe] = useState<Record<string, Record<string, number>>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [texte, setTexte] = useState('')
  const finDesMessagesRef = useRef<HTMLDivElement>(null)
  const frappeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!utilisateur) return
    const unsubscribe = onSnapshot(collection(db, 'utilisateurs'), (snapshot) => {
      setContacts(
        snapshot.docs
          .filter((d) => d.id !== utilisateur.id)
          .map((d) => ({ id: d.id, nom: d.data().nom, prenoms: d.data().prenoms, photo: d.data().photo ?? null }))
      )
      setChargementContacts(false)
    })
    return unsubscribe
  }, [utilisateur])

  useEffect(() => {
    const unsubscribe = onValue(ref(rtdb, 'conversations'), (snapshot) => {
      setResumes(snapshot.val() ?? {})
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = onValue(ref(rtdb, 'presence'), (snapshot) => {
      setPresence(snapshot.val() ?? {})
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
    const unsubscribe = onValue(ref(rtdb, 'frappe'), (snapshot) => {
      setFrappe(snapshot.val() ?? {})
    })
    return unsubscribe
  }, [])

  const idConversationSelectionnee = !utilisateur || !selectedId
    ? null
    : selectedId === ID_ANNONCES || selectedId === ID_GROUPE
      ? selectedId
      : idConversationPrivee(utilisateur.id, selectedId)

  useEffect(() => {
    if (!idConversationSelectionnee) {
      setMessages([])
      return
    }
    const unsubscribe = onValue(ref(rtdb, `messages/${idConversationSelectionnee}`), (snapshot) => {
      const valeur = snapshot.val() ?? {}
      setMessages(
        Object.entries(valeur)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id, message]) => ({ id, ...(message as Omit<Message, 'id'>) }))
      )
    })
    return unsubscribe
  }, [idConversationSelectionnee])

  useEffect(() => {
    finDesMessagesRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  useEffect(() => {
    if (!utilisateur || !idConversationSelectionnee) return
    set(ref(rtdb, `lectures/${idConversationSelectionnee}/${utilisateur.id}`), Date.now())
  }, [utilisateur, idConversationSelectionnee, messages.length])

  if (!utilisateur) return null

  const peutPublierAnnonce = utilisateur.role === 'fondateur' || utilisateur.role === 'responsable'

  const estEnLigne = (id: string) => presence[id]?.enLigne === true

  const quiTape = (conversationId: string) => {
    const maintenant = Date.now()
    return Object.entries(frappe[conversationId] ?? {})
      .filter(([id, horodatage]) => id !== utilisateur.id && maintenant - horodatage < DELAI_FRAPPE_MS + 2000)
      .map(([id]) => id)
  }

  const texteApercu = (conversationId: string, dernierMessage: string | undefined, defaut: string) => {
    const tapeurs = quiTape(conversationId)
    if (tapeurs.length > 0) return 'en train d\'écrire...'
    return dernierMessage ?? defaut
  }

  const autresParticipants = selectedId === ID_ANNONCES || selectedId === ID_GROUPE
    ? contacts.map((contact) => contact.id)
    : selectedId
      ? [selectedId]
      : []

  const estLuParTous = (conversationId: string, timestamp: number) =>
    autresParticipants.length > 0 && autresParticipants.every((id) => (lectures[conversationId]?.[id] ?? 0) >= timestamp)

  const basculerFavori = async (contactId: string) => {
    const estFavori = (utilisateur.favoris ?? []).includes(contactId)
    await updateDoc(doc(db, 'utilisateurs', utilisateur.id), {
      favoris: estFavori ? arrayRemove(contactId) : arrayUnion(contactId),
    })
  }

  const gererSaisie = (e: ChangeEvent<HTMLInputElement>) => {
    const valeur = e.target.value
    setTexte(valeur)
    if (!idConversationSelectionnee) return
    const frappeRef = ref(rtdb, `frappe/${idConversationSelectionnee}/${utilisateur.id}`)
    if (frappeTimeoutRef.current) clearTimeout(frappeTimeoutRef.current)
    if (valeur.trim()) {
      set(frappeRef, Date.now())
      frappeTimeoutRef.current = setTimeout(() => remove(frappeRef), DELAI_FRAPPE_MS)
    } else {
      remove(frappeRef)
    }
  }

  const envoyerMessage = async (e: SubmitEvent) => {
    e.preventDefault()
    const texteEnvoye = texte.trim()
    if (!texteEnvoye || !idConversationSelectionnee) return
    if (selectedId === ID_ANNONCES && !peutPublierAnnonce) return
    setTexte('')
    if (frappeTimeoutRef.current) clearTimeout(frappeTimeoutRef.current)
    remove(ref(rtdb, `frappe/${idConversationSelectionnee}/${utilisateur.id}`))
    await push(ref(rtdb, `messages/${idConversationSelectionnee}`), {
      expediteurId: utilisateur.id,
      texte: texteEnvoye,
      envoyeAt: Date.now(),
    })
    await update(ref(rtdb, `conversations/${idConversationSelectionnee}`), {
      dernierMessage: texteEnvoye,
      dernierMessageAt: Date.now(),
    })
  }

  const contactsFavoris = contacts.filter((contact) => (utilisateur.favoris ?? []).includes(contact.id))

  const contactsTries = [...contacts].sort((a, b) => {
    const resumeA = resumes[idConversationPrivee(utilisateur.id, a.id)]
    const resumeB = resumes[idConversationPrivee(utilisateur.id, b.id)]
    if (resumeA?.dernierMessageAt && resumeB?.dernierMessageAt) return resumeB.dernierMessageAt - resumeA.dernierMessageAt
    if (resumeA?.dernierMessageAt) return -1
    if (resumeB?.dernierMessageAt) return 1
    return a.nom.localeCompare(b.nom)
  })

  const contactSelectionne = selectedId && selectedId !== ID_ANNONCES && selectedId !== ID_GROUPE
    ? contacts.find((contact) => contact.id === selectedId)
    : null

  const sousTitreThread = idConversationSelectionnee && quiTape(idConversationSelectionnee).length > 0
    ? 'en train d\'écrire...'
    : contactSelectionne
      ? (estEnLigne(contactSelectionne.id) ? 'En ligne' : 'Hors ligne')
      : null

  return (
    <div className='h-full flex'>
      <div className='w-80 h-full flex flex-col border-r border-gray-200'>
        <div className='px-4 py-4 border-b border-gray-200'>
          <h1 className='text-xl font-bold text-gray-800'>Messages</h1>
        </div>

        {contactsFavoris.length > 0 && (
          <div className='px-4 py-3 border-b border-gray-200'>
            <p className='text-xs font-medium text-gray-500 mb-2'>Favoris</p>
            <div className='flex gap-3 overflow-x-auto pb-1'>
              {contactsFavoris.map((contact) => (
                <button
                  key={contact.id}
                  type='button'
                  onClick={() => setSelectedId(contact.id)}
                  className='flex flex-col items-center gap-1 shrink-0 w-14'
                >
                  <div className='relative'>
                    {contact.photo ? (
                      <img src={contact.photo} alt='' className='h-12 w-12 rounded-full object-cover object-top' />
                    ) : (
                      <CircleUserRound strokeWidth={2} className='h-12 w-12 text-gray-400' />
                    )}
                    {estEnLigne(contact.id) && (
                      <span className='absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white' />
                    )}
                  </div>
                  <span className='text-xs text-gray-700 truncate w-full text-center'>{contact.prenoms.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className='flex-1 overflow-y-auto'>
          <button
            type='button'
            onClick={() => setSelectedId(ID_ANNONCES)}
            className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 text-left ${selectedId === ID_ANNONCES ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
          >
            <div className='h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0'>
              <Megaphone strokeWidth={2} className='h-5 w-5 text-white' />
            </div>
            <div className='flex-1 min-w-0'>
              <p className='font-medium text-gray-800'>Annonces</p>
              <p className='text-sm text-gray-500 truncate'>{texteApercu(ID_ANNONCES, resumes[ID_ANNONCES]?.dernierMessage, 'Annonces de la direction')}</p>
            </div>
          </button>

          <button
            type='button'
            onClick={() => setSelectedId(ID_GROUPE)}
            className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 text-left ${selectedId === ID_GROUPE ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
          >
            <div className='h-10 w-10 rounded-full bg-green-600 flex items-center justify-center shrink-0'>
              <Users strokeWidth={2} className='h-5 w-5 text-white' />
            </div>
            <div className='flex-1 min-w-0'>
              <p className='font-medium text-gray-800'>Groupe</p>
              <p className='text-sm text-gray-500 truncate'>{texteApercu(ID_GROUPE, resumes[ID_GROUPE]?.dernierMessage, 'Discussion entre tous les membres')}</p>
            </div>
          </button>

          {chargementContacts && (
            <div className='flex items-center gap-2 text-gray-500 px-4 py-3'>
              <Loader2 className='h-4 w-4 animate-spin' />
              Chargement...
            </div>
          )}

          {contactsTries.map((contact) => {
            const idConversationContact = idConversationPrivee(utilisateur.id, contact.id)
            const resume = resumes[idConversationContact]
            const estFavori = (utilisateur.favoris ?? []).includes(contact.id)
            return (
              <div
                key={contact.id}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 ${selectedId === contact.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <button type='button' onClick={() => setSelectedId(contact.id)} className='flex-1 flex items-center gap-3 text-left min-w-0'>
                  <div className='relative shrink-0'>
                    {contact.photo ? (
                      <img src={contact.photo} alt='' className='h-10 w-10 rounded-full object-cover object-top' />
                    ) : (
                      <CircleUserRound strokeWidth={2} className='h-10 w-10 text-gray-400' />
                    )}
                    {estEnLigne(contact.id) && (
                      <span className='absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white' />
                    )}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='font-medium text-gray-800 truncate'>{contact.prenoms.split(' ')[0]} {contact.nom}</p>
                    <p className='text-sm text-gray-500 truncate'>{texteApercu(idConversationContact, resume?.dernierMessage, 'Aucun message')}</p>
                  </div>
                </button>
                <button type='button' onClick={() => basculerFavori(contact.id)} className='shrink-0 p-1'>
                  <Star strokeWidth={2} className={estFavori ? 'h-4 w-4 fill-yellow-400 text-yellow-400' : 'h-4 w-4 text-gray-300'} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className='flex-1 h-full flex flex-col'>
        {!selectedId && (
          <div className='flex-1 flex items-center justify-center text-gray-400'>
            Sélectionnez une conversation pour commencer à discuter.
          </div>
        )}

        {selectedId && (
          <>
            <div className='flex items-center gap-3 px-6 py-4 border-b border-gray-200'>
              {selectedId === ID_ANNONCES ? (
                <>
                  <div className='h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center'>
                    <Megaphone strokeWidth={2} className='h-5 w-5 text-white' />
                  </div>
                  <p className='font-medium text-gray-800'>Annonces</p>
                </>
              ) : selectedId === ID_GROUPE ? (
                <>
                  <div className='h-10 w-10 rounded-full bg-green-600 flex items-center justify-center'>
                    <Users strokeWidth={2} className='h-5 w-5 text-white' />
                  </div>
                  <p className='font-medium text-gray-800'>Groupe</p>
                </>
              ) : (
                <>
                  <div className='relative shrink-0'>
                    {contactSelectionne?.photo ? (
                      <img src={contactSelectionne.photo} alt='' className='h-10 w-10 rounded-full object-cover object-top' />
                    ) : (
                      <CircleUserRound strokeWidth={2} className='h-10 w-10 text-gray-400' />
                    )}
                    {contactSelectionne && estEnLigne(contactSelectionne.id) && (
                      <span className='absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white' />
                    )}
                  </div>
                  <div>
                    <p className='font-medium text-gray-800'>{contactSelectionne?.prenoms} {contactSelectionne?.nom}</p>
                    {sousTitreThread && <p className='text-xs text-gray-500'>{sousTitreThread}</p>}
                  </div>
                </>
              )}
            </div>

            <div className='flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3'>
              {messages.map((message) => {
                const estMoi = message.expediteurId === utilisateur.id
                const expediteur = contacts.find((contact) => contact.id === message.expediteurId)
                return (
                  <div key={message.id} className={`flex ${estMoi ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[60%] rounded-xl px-4 py-2 ${estMoi ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      {(selectedId === ID_ANNONCES || selectedId === ID_GROUPE) && !estMoi && (
                        <p className='text-xs font-medium mb-1 opacity-70'>{expediteur?.prenoms.split(' ')[0]} {expediteur?.nom}</p>
                      )}
                      <p>{message.texte} - <span className={`text-xs mt-1 ${estMoi ? 'text-blue-100' : 'text-gray-400'}`}>
                        {new Date(message.envoyeAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span></p>
                      
                    </div>
                  </div>
                )
              })}
              <div ref={finDesMessagesRef} />
            </div>

            {selectedId === ID_ANNONCES && !peutPublierAnnonce ? (
              <div className='px-6 py-4 border-t border-gray-200 text-sm text-gray-500'>
                Seuls le fondateur et les responsables peuvent publier dans Annonces.
              </div>
            ) : (
              <form onSubmit={envoyerMessage} className='flex items-center gap-3 px-6 py-4 border-t border-gray-200'>
                <input
                  type='text'
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  placeholder='Écrire un message...'
                  className='flex-1 rounded-full border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500'
                />
                <button
                  type='submit'
                  disabled={!texte.trim()}
                  className='flex items-center justify-center h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                >
                  <Send strokeWidth={2} className='h-5 w-5' />
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Messages
