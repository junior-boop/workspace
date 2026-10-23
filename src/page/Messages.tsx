import { Fragment, useEffect, useMemo, useRef, useState, type ChangeEvent, type SubmitEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, CheckCheck, ChevronLeft, ChevronRight, CircleUserRound, Download, ImagePlus, Loader2, Megaphone, Reply, SendHorizonal, Star, Trash2, Users, X } from 'lucide-react'
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { onValue, push, ref, remove, serverTimestamp as horodatageServeur, set, update } from 'firebase/database'
import { db, rtdb } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { ID_ANNONCES, ID_GROUPE, idConversationPrivee } from '../utils/conversation'
import { blobVersDataUrl, compresserImageEnJpeg } from '../utils/image'

const DELAI_FRAPPE_MS = 3000

const NOMS_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const NOMS_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

const memeJour = (a: number, b: number) => {
  const dateA = new Date(a)
  const dateB = new Date(b)
  return dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth() && dateA.getDate() === dateB.getDate()
}

const libelleJour = (timestamp: number) => {
  const date = new Date(timestamp)
  const maintenant = new Date()
  const debutJour = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffJours = Math.round((debutJour(maintenant) - debutJour(date)) / 86400000)

  if (diffJours === 0) return 'Aujourd\'hui'
  if (diffJours === 1) return 'Hier'
  if (diffJours === 2) return 'Il y a deux jours'
  if (diffJours > 2 && diffJours < 7) return `Il y a ${diffJours} jours`

  const jour = `${NOMS_JOURS[date.getDay()]} le ${date.getDate()}`
  if (date.getFullYear() !== maintenant.getFullYear()) return `${jour} ${NOMS_MOIS[date.getMonth()]} ${date.getFullYear()}`
  if (date.getMonth() !== maintenant.getMonth()) return `${jour} ${NOMS_MOIS[date.getMonth()]}`
  return jour
}

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
  reponseA?: {
    id: string
    texte: string
    expediteurId: string
    imageId?: string
  }
  supprime?: boolean
  imageIds?: string[]
}

type ImageConversation = {
  id: string
  messageId: string
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
  const [searchParams] = useSearchParams()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [chargementContacts, setChargementContacts] = useState(true)
  const [resumes, setResumes] = useState<Record<string, ResumeConversation>>({})
  const [presence, setPresence] = useState<Record<string, Presence>>({})
  const [lectures, setLectures] = useState<Record<string, Record<string, number>>>({})
  const [frappe, setFrappe] = useState<Record<string, Record<string, number>>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [texte, setTexte] = useState('')
  const [messageEnReponse, setMessageEnReponse] = useState<Message | null>(null)
  const [imagesCache, setImagesCache] = useState<Record<string, string>>({})
  const [envoiImageEnCours, setEnvoiImageEnCours] = useState(false)
  const [indexVisionneuse, setIndexVisionneuse] = useState<number | null>(null)
  const [messageActifId, setMessageActifId] = useState<string | null>(null)
  const finDesMessagesRef = useRef<HTMLDivElement>(null)
  const frappeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messagesRef = useRef<Record<string, HTMLDivElement | null>>({})
  const inputImageRef = useRef<HTMLInputElement>(null)
  const scrollVisionneuseRef = useRef<HTMLDivElement>(null)
  const minuteurAppuiLongRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const appuiLongDeclencheRef = useRef(false)

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
          .map(([id, message]) => ({ id, ...(message as Omit<Message, 'id'>) }))
          // Les clés push de Firebase sont chronologiques (heure serveur), contrairement à envoyeAt qui dépend de l'horloge de l'appareil
          .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      )
    })
    return unsubscribe
  }, [idConversationSelectionnee])

  useEffect(() => {
    setMessageEnReponse(null)
    setMessageActifId(null)
  }, [idConversationSelectionnee])

  useEffect(() => {
    const contactId = searchParams.get('contact')
    if (contactId) setSelectedId(contactId)
  }, [searchParams])

  useEffect(() => {
    const idsManquants = [...new Set(messages.flatMap((m) => m.imageIds ?? []))]
      .filter((id) => !(id in imagesCache))
    idsManquants.forEach(async (id) => {
      const snap = await getDoc(doc(db, 'messagesImages', id))
      const donnees = snap.data()?.data as string | undefined
      if (donnees) setImagesCache((prev) => ({ ...prev, [id]: donnees }))
    })
  }, [messages, imagesCache])

  useEffect(() => {
    finDesMessagesRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  useEffect(() => {
    if (!utilisateur || !idConversationSelectionnee) return
    set(ref(rtdb, `lectures/${idConversationSelectionnee}/${utilisateur.id}`), horodatageServeur())
  }, [utilisateur, idConversationSelectionnee, messages.length])

  const toutesLesImages: ImageConversation[] = useMemo(
    () => messages.flatMap((m) => (m.imageIds ?? []).map((id) => ({ id, messageId: m.id }))),
    [messages]
  )

  const contactsFavoris = useMemo(
    () => contacts.filter((contact) => (utilisateur?.favoris ?? []).includes(contact.id)),
    [contacts, utilisateur]
  )

  const contactsTries = useMemo(
    () => [...contacts].sort((a, b) => {
      if (!utilisateur) return 0
      const resumeA = resumes[idConversationPrivee(utilisateur.id, a.id)]
      const resumeB = resumes[idConversationPrivee(utilisateur.id, b.id)]
      if (resumeA?.dernierMessageAt && resumeB?.dernierMessageAt) return resumeB.dernierMessageAt - resumeA.dernierMessageAt
      if (resumeA?.dernierMessageAt) return -1
      if (resumeB?.dernierMessageAt) return 1
      return a.nom.localeCompare(b.nom)
    }),
    [contacts, resumes, utilisateur]
  )

  const autresParticipants = useMemo(
    () => selectedId === ID_ANNONCES || selectedId === ID_GROUPE
      ? contacts.map((contact) => contact.id)
      : selectedId
        ? [selectedId]
        : [],
    [selectedId, contacts]
  )

  useEffect(() => {
    if (indexVisionneuse === null) return
    const gererClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIndexVisionneuse(null)
      else if (e.key === 'ArrowLeft') setIndexVisionneuse((i) => (i !== null && i > 0 ? i - 1 : i))
      else if (e.key === 'ArrowRight') setIndexVisionneuse((i) => (i !== null ? Math.min(i + 1, Math.max(0, toutesLesImages.length - 1)) : i))
    }
    window.addEventListener('keydown', gererClavier)
    return () => window.removeEventListener('keydown', gererClavier)
  }, [indexVisionneuse, toutesLesImages.length])

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

  const estLuParTous = (conversationId: string, timestamp: number) =>
    autresParticipants.length > 0 && autresParticipants.every((id) => (lectures[conversationId]?.[id] ?? 0) >= timestamp)

  const nonLuPourMoi = (conversationId: string) => {
    const dernierMessageAt = resumes[conversationId]?.dernierMessageAt
    if (!dernierMessageAt) return false
    return (lectures[conversationId]?.[utilisateur.id] ?? 0) < dernierMessageAt
  }

  const nomExpediteur = (id: string) => {
    if (id === utilisateur.id) return 'Vous'
    const contact = contacts.find((c) => c.id === id)
    return contact ? `${contact.prenoms.split(' ')[0]} ${contact.nom}` : 'Utilisateur'
  }

  const basculerFavori = async (contactId: string) => {
    const estFavori = (utilisateur.favoris ?? []).includes(contactId)
    await updateDoc(doc(db, 'utilisateurs', utilisateur.id), {
      favoris: estFavori ? arrayRemove(contactId) : arrayUnion(contactId),
    })
  }

  const gererSaisie = (e: ChangeEvent<HTMLTextAreaElement>) => {
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

  const construireReponseA = (message: Message) => ({
    id: message.id,
    texte: message.texte || (message.imageIds?.length ? '📷 Photo' : ''),
    expediteurId: message.expediteurId,
    ...(message.imageIds?.[0] ? { imageId: message.imageIds[0] } : {}),
  })

  const envoyerMessage = async (e: SubmitEvent) => {
    e.preventDefault()
    const texteEnvoye = texte.trim()
    if (!texteEnvoye || !idConversationSelectionnee) return
    if (selectedId === ID_ANNONCES && !peutPublierAnnonce) return
    setTexte('')
    if (frappeTimeoutRef.current) clearTimeout(frappeTimeoutRef.current)
    remove(ref(rtdb, `frappe/${idConversationSelectionnee}/${utilisateur.id}`))
    const reponseA = messageEnReponse ? construireReponseA(messageEnReponse) : null
    setMessageEnReponse(null)
    await push(ref(rtdb, `messages/${idConversationSelectionnee}`), {
      expediteurId: utilisateur.id,
      texte: texteEnvoye,
      envoyeAt: horodatageServeur(),
      ...(reponseA ? { reponseA } : {}),
    })
    await update(ref(rtdb, `conversations/${idConversationSelectionnee}`), {
      dernierMessage: texteEnvoye,
      dernierMessageAt: horodatageServeur(),
    })
  }

  const envoyerImages = async (e: ChangeEvent<HTMLInputElement>) => {
    const fichiers = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (fichiers.length === 0 || !idConversationSelectionnee) return
    if (selectedId === ID_ANNONCES && !peutPublierAnnonce) return
    setEnvoiImageEnCours(true)
    try {
      const imageIds = await Promise.all(
        fichiers.map(async (fichier) => {
          const imageCompressee = await compresserImageEnJpeg(fichier)
          const imageBase64 = await blobVersDataUrl(imageCompressee)
          const documentImage = await addDoc(collection(db, 'messagesImages'), {
            data: imageBase64,
            expediteurId: utilisateur.id,
            createdAt: serverTimestamp(),
          })
          return documentImage.id
        })
      )
      const reponseA = messageEnReponse ? construireReponseA(messageEnReponse) : null
      setMessageEnReponse(null)
      await push(ref(rtdb, `messages/${idConversationSelectionnee}`), {
        expediteurId: utilisateur.id,
        texte: '',
        imageIds,
        envoyeAt: horodatageServeur(),
        ...(reponseA ? { reponseA } : {}),
      })
      await update(ref(rtdb, `conversations/${idConversationSelectionnee}`), {
        dernierMessage: imageIds.length > 1 ? `📷 ${imageIds.length} photos` : '📷 Photo',
        dernierMessageAt: horodatageServeur(),
      })
    } finally {
      setEnvoiImageEnCours(false)
    }
  }

  const telechargerImage = (id: string) => {
    const donnees = imagesCache[id]
    if (!donnees) return
    const lien = document.createElement('a')
    lien.href = donnees
    lien.download = `image-${id}.jpg`
    lien.click()
  }

  const allerAuMessage = (id: string) => {
    messagesRef.current[id]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  const demarrerAppuiLong = (id: string) => {
    minuteurAppuiLongRef.current = setTimeout(() => {
      appuiLongDeclencheRef.current = true
      setMessageActifId(id)
    }, 500)
  }

  const annulerAppuiLong = () => {
    if (minuteurAppuiLongRef.current) {
      clearTimeout(minuteurAppuiLongRef.current)
      minuteurAppuiLongRef.current = null
    }
  }

  const fermerMenuMessageSiNecessaire = () => {
    if (appuiLongDeclencheRef.current) {
      appuiLongDeclencheRef.current = false
      return
    }
    setMessageActifId(null)
  }

  const supprimerMessage = async (message: Message) => {
    if (!idConversationSelectionnee || message.expediteurId !== utilisateur.id) return
    if (!window.confirm('Supprimer ce message ?')) return
    await Promise.all((message.imageIds ?? []).map((id) => deleteDoc(doc(db, 'messagesImages', id))))
    await update(ref(rtdb, `messages/${idConversationSelectionnee}/${message.id}`), {
      texte: '',
      supprime: true,
      imageIds: null,
    })
    if (messages[messages.length - 1]?.id === message.id) {
      await update(ref(rtdb, `conversations/${idConversationSelectionnee}`), {
        dernierMessage: 'Message supprimé',
      })
    }
    if (messageEnReponse?.id === message.id) setMessageEnReponse(null)
  }

  const ouvrirVisionneuse = (id: string) => {
    const index = toutesLesImages.findIndex((image) => image.id === id)
    if (index !== -1) setIndexVisionneuse(index)
  }

  const gererScrollVisionneuse = () => {
    const conteneur = scrollVisionneuseRef.current
    if (!conteneur) return
    const index = Math.round(conteneur.scrollLeft / conteneur.clientWidth)
    if (index !== indexVisionneuse) setIndexVisionneuse(index)
  }

  useEffect(() => {
    const conteneur = scrollVisionneuseRef.current
    if (!conteneur || indexVisionneuse === null) return
    const cible = indexVisionneuse * conteneur.clientWidth
    if (Math.abs(conteneur.scrollLeft - cible) > 10) {
      conteneur.scrollTo({ left: cible, behavior: 'smooth' })
    }
  }, [indexVisionneuse])

  const contactSelectionne = selectedId && selectedId !== ID_ANNONCES && selectedId !== ID_GROUPE
    ? contacts.find((contact) => contact.id === selectedId)
    : null

  const sousTitreThread = idConversationSelectionnee && quiTape(idConversationSelectionnee).length > 0
    ? 'en train d\'écrire...'
    : contactSelectionne
      ? (estEnLigne(contactSelectionne.id) ? 'En ligne' : 'Hors ligne')
      : null

  const imageVisionneuse = indexVisionneuse !== null ? toutesLesImages[indexVisionneuse] : null

  const [zoomActif, setZoomActif] = useState(false)

  useEffect(() => {
    setZoomActif(false)
  }, [indexVisionneuse])

  const nonLuAnnonces = nonLuPourMoi(ID_ANNONCES)
  const nonLuGroupe = nonLuPourMoi(ID_GROUPE)

  const autoheightTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = '48px'
    textarea.style.height = `${textarea.scrollHeight}px`
  }


  return (
    <>
    <div className='h-full flex'>
      <div className={`w-full md:w-80 h-full flex-col border-r border-gray-200 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
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
            <div className='relative h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0'>
              <Megaphone strokeWidth={2} className='h-5 w-5 text-white' />
              {nonLuAnnonces && (
                <span className='absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white' />
              )}
            </div>
            <div className='flex-1 min-w-0'>
              <p className={`font-medium ${nonLuAnnonces ? 'text-red-600' : 'text-gray-800'}`}>
                Annonces
                {resumes[ID_ANNONCES]?.dernierMessageAt && (
                  <span className='text-xs text-gray-400'> - {new Date(resumes[ID_ANNONCES]!.dernierMessageAt!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </p>
              <p className='text-sm text-gray-500 truncate'>{texteApercu(ID_ANNONCES, resumes[ID_ANNONCES]?.dernierMessage, 'Annonces de la direction')}</p>
            </div>
          </button>

          <button
            type='button'
            onClick={() => setSelectedId(ID_GROUPE)}
            className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 text-left ${selectedId === ID_GROUPE ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
          >
            <div className='relative h-10 w-10 rounded-full bg-green-600 flex items-center justify-center shrink-0'>
              <Users strokeWidth={2} className='h-5 w-5 text-white' />
              {nonLuGroupe && (
                <span className='absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white' />
              )}
            </div>
            <div className='flex-1 min-w-0'>
              <p className={`font-medium ${nonLuGroupe ? 'text-red-600' : 'text-gray-800'}`}>
                Groupe
                {resumes[ID_GROUPE]?.dernierMessageAt && (
                  <span className='text-xs text-gray-400'> - {new Date(resumes[ID_GROUPE]!.dernierMessageAt!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </p>
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
            const nonLu = nonLuPourMoi(idConversationContact)
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
                    {nonLu && (
                      <span className='absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white' />
                    )}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className={`font-medium truncate ${nonLu ? 'text-red-600' : 'text-gray-800'}`}>
                      {contact.prenoms.split(' ')[0]} {contact.nom}
                      {resume?.dernierMessageAt && (
                        <span className='text-xs text-gray-400'> - {new Date(resume.dernierMessageAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </p>
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

      <div className={`flex-1 h-full flex-col ${selectedId ? 'flex' : 'hidden md:flex'}`}>
        {!selectedId && (
          <div className='flex-1 flex items-center justify-center text-gray-400'>
            Sélectionnez une conversation pour commencer à discuter.
          </div>
        )}

        {selectedId && (
          <>
            <div className='flex items-center gap-3 px-4 md:px-6 py-4 border-b border-gray-200'>
              <button
                type='button'
                onClick={() => setSelectedId(null)}
                className='md:hidden shrink-0 p-1 -ml-1 text-gray-500 hover:text-gray-800'
              >
                <ChevronLeft strokeWidth={2} className='h-6 w-6' />
              </button>
              {selectedId === ID_ANNONCES ? (
                <>
                  <div className='h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center'>
                    <Megaphone strokeWidth={2} className='h-5 w-5 text-white' />
                  </div>
                  <div>
                    <p className='font-medium text-gray-800'>Annonces</p>
                    {sousTitreThread && <p className='text-xs text-gray-500'>{sousTitreThread}</p>}
                  </div>
                </>
              ) : selectedId === ID_GROUPE ? (
                <>
                  <div className='h-10 w-10 rounded-full bg-green-600 flex items-center justify-center'>
                    <Users strokeWidth={2} className='h-5 w-5 text-white' />
                  </div>
                  <div>
                    <p className='font-medium text-gray-800'>Groupe</p>
                    {sousTitreThread && <p className='text-xs text-gray-500'>{sousTitreThread}</p>}
                  </div>
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

            <div className='flex-1 overflow-y-auto px-4 md:px-6 py-4 flex flex-col' onClick={fermerMenuMessageSiNecessaire}>
              {messages.map((message, index) => {
                const estMoi = message.expediteurId === utilisateur.id
                const estAnnonce = selectedId === ID_ANNONCES
                const expediteur = contacts.find((contact) => contact.id === message.expediteurId)
                const nouveauJour = index === 0 || !memeJour(messages[index - 1].envoyeAt, message.envoyeAt)
                const groupePrecedent = index > 0 && messages[index - 1].expediteurId === message.expediteurId && !nouveauJour
                const groupeSuivant = index < messages.length - 1 && messages[index + 1].expediteurId === message.expediteurId && memeJour(message.envoyeAt, messages[index + 1].envoyeAt)
                const arrondi = `${groupePrecedent ? 'rounded-t-[4px]' : 'rounded-t-xl'} ${groupeSuivant ? 'rounded-b-[4px]' : 'rounded-b-xl'}`
                const estImage = !!message.imageIds?.length && !message.supprime
                return (
                  <Fragment key={message.id}>
                    {nouveauJour && (
                      <div className={`flex justify-center ${index === 0 ? '' : 'mt-4'} mb-3`}>
                        <span className='text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-3 py-1'>{libelleJour(message.envoyeAt)}</span>
                      </div>
                    )}
                    <div
                      ref={(el) => { messagesRef.current[message.id] = el }}
                      className={`group relative flex items-center gap-1 ${estAnnonce ? 'justify-center' : estMoi ? 'justify-end' : 'justify-start'} ${nouveauJour ? '' : groupePrecedent ? 'mt-1' : 'mt-3'}`}
                      onTouchStart={() => demarrerAppuiLong(message.id)}
                      onTouchEnd={annulerAppuiLong}
                      onTouchMove={annulerAppuiLong}
                    >
                    {estMoi && !message.supprime && (
                      <div className={`flex absolute left-8 items-center transition-opacity ${messageActifId === message.id ? 'opacity-100' : 'opacity-0'} md:group-hover:opacity-100`}>
                        <button
                          type='button'
                          onClick={() => supprimerMessage(message)}
                          className='p-1 text-gray-400 hover:text-red-500'
                          title='Supprimer'
                        >
                          <Trash2 strokeWidth={2} className='h-4 w-4' />
                        </button>
                        <button
                          type='button'
                          onClick={() => setMessageEnReponse(message)}
                          className='p-1 text-gray-400 hover:text-gray-600'
                          title='Répondre'
                        >
                          <Reply strokeWidth={2} className='h-4 w-4' />
                        </button>
                      </div>
                    )}
                    <div className={`${estImage ? 'w-[75%] md:w-[55%]' : estAnnonce ? 'w-[70%]' : 'max-w-[75%]'} ${arrondi} overflow-hidden ${estMoi ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      {estAnnonce && !groupePrecedent && (
                        <p className='text-[11px] font-medium opacity-70 px-4 pt-2'>
                          {estMoi ? `${utilisateur.prenoms.split(' ')[0]} ${utilisateur.nom}` : `${expediteur?.prenoms.split(' ')[0]} ${expediteur?.nom}`}
                        </p>
                      )}
                      {selectedId === ID_GROUPE && !estMoi && !groupePrecedent && (
                        <p className='text-xs font-medium mb-1 opacity-70 px-4 pt-2'>{expediteur?.prenoms.split(' ')[0]} {expediteur?.nom}</p>
                      )}
                      {message.supprime ? (
                        <p className={`px-4 py-2 italic text-sm ${estMoi ? 'text-blue-100' : 'text-gray-400'}`}>Message supprimé</p>
                      ) : (
                        <>
                          {message.reponseA && (
                            <button
                              type='button'
                              onClick={() => allerAuMessage(message.reponseA!.id)}
                              className={`flex items-center gap-2 w-full text-left mb-1 px-2 py-2 border-l-3 ${estMoi ? 'bg-blue-700/40 border-blue-200' : 'bg-gray-200 border-gray-400'}`}
                            >
                              {message.reponseA.imageId && (
                                imagesCache[message.reponseA.imageId] ? (
                                  <img src={imagesCache[message.reponseA.imageId]} alt='' className='h-10 w-10 rounded object-cover shrink-0' />
                                ) : (
                                  <div className='h-10 w-10 rounded bg-black/10 shrink-0 flex items-center justify-center'>
                                    <Loader2 className='h-4 w-4 animate-spin opacity-70' />
                                  </div>
                                )
                              )}
                              <div className='min-w-0'>
                                <p className={`text-xs font-medium ${estMoi ? 'text-blue-100' : 'text-gray-600'}`}>{nomExpediteur(message.reponseA.expediteurId)}</p>
                                <p className={`whitespace-pre-wrap wrap-break-word text-xs truncate ${estMoi ? 'text-blue-50' : 'text-gray-500'}`}>{message.reponseA.texte}</p>
                              </div>
                            </button>
                          )}
                          {estImage ? (
                            <div className={message.imageIds!.length > 1 ? 'grid grid-cols-2 gap-0.5' : ''}>
                              {message.imageIds!.map((id) => (
                                <div key={id} className='relative group/image'>
                                  {imagesCache[id] ? (
                                    <button
                                      type='button'
                                      onClick={() => ouvrirVisionneuse(id)}
                                      className={`block w-full ${message.imageIds!.length > 1 ? 'aspect-square' : 'h-auto'}`}
                                    >
                                      <img
                                        src={imagesCache[id]}
                                        alt=''
                                        className={`w-full block ${message.imageIds!.length > 1 ? 'h-full object-cover' : 'h-auto'}`}
                                      />
                                    </button>
                                  ) : (
                                    <div className='flex items-center justify-center h-40'>
                                      <Loader2 className='h-6 w-6 animate-spin opacity-70' />
                                    </div>
                                  )}
                                  {imagesCache[id] && (
                                    <button
                                      type='button'
                                      onClick={() => telechargerImage(id)}
                                      className='absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover/image:opacity-100 transition-opacity'
                                      title='Télécharger'
                                    >
                                      <Download strokeWidth={2} className='h-3.5 w-3.5' />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className={`px-4 whitespace-pre-wrap wrap-break-word ${message.reponseA ? 'py-1' : 'py-2'}`}>{message.texte} - <span className={`text-xs mt-1 ${estMoi ? 'text-blue-100' : 'text-gray-400'}`}>
                              {new Date(message.envoyeAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                              {estMoi && idConversationSelectionnee && (
                                estLuParTous(idConversationSelectionnee, message.envoyeAt)
                                  ? <CheckCheck className='inline-block h-3.5 w-3.5 ml-1 text-blue-100' />
                                  : <Check className='inline-block h-3.5 w-3.5 ml-1 text-blue-100' />
                              )}
                            </p>
                          )}
                          {estImage && (
                            <p className={`px-2 py-1 text-xs flex justify-end items-center gap-1 ${estMoi ? 'text-blue-100' : 'text-gray-400'}`}>
                              {new Date(message.envoyeAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              {estMoi && idConversationSelectionnee && (
                                estLuParTous(idConversationSelectionnee, message.envoyeAt)
                                  ? <CheckCheck className='inline-block h-3.5 w-3.5 text-blue-100' />
                                  : <Check className='inline-block h-3.5 w-3.5 text-blue-100' />
                              )}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {!estMoi && !message.supprime && (
                      <button
                        type='button'
                        onClick={() => setMessageEnReponse(message)}
                        className={`transition-opacity ${messageActifId === message.id ? 'opacity-100' : 'opacity-0'} md:group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600`}
                        title='Répondre'
                      >
                        <Reply strokeWidth={2} className='h-4 w-4' />
                      </button>
                    )}
                    </div>
                  </Fragment>
                )
              })}
              <div ref={finDesMessagesRef} />
            </div>

            {selectedId === ID_ANNONCES && !peutPublierAnnonce ? (
              <div className='px-4 md:px-6 py-4 border-t border-gray-200 text-sm text-gray-500'>
                Seuls le fondateur et les responsables peuvent publier dans Annonces.
              </div>
            ) : (
              <div className='border-t border-gray-200'>
                {messageEnReponse && (
                  <div className='flex items-center justify-between gap-3 px-4 md:px-6 pt-3'>
                    <div className='flex-1 min-w-0 flex items-center gap-2 rounded-md bg-gray-100 border-l-2 border-blue-500 px-3 py-1.5'>
                      {messageEnReponse.imageIds?.[0] && (
                        imagesCache[messageEnReponse.imageIds[0]] ? (
                          <img src={imagesCache[messageEnReponse.imageIds[0]]} alt='' className='h-10 w-10 rounded object-cover shrink-0' />
                        ) : (
                          <div className='h-10 w-10 rounded bg-black/10 shrink-0 flex items-center justify-center'>
                            <Loader2 className='h-4 w-4 animate-spin opacity-70' />
                          </div>
                        )
                      )}
                      <div className='min-w-0'>
                        <p className='text-xs font-medium text-gray-600'>{nomExpediteur(messageEnReponse.expediteurId)}</p>
                        <p className='text-xs text-gray-500 truncate'>{messageEnReponse.texte}</p>
                      </div>
                    </div>
                    <button type='button' onClick={() => setMessageEnReponse(null)} className='shrink-0 p-1 text-gray-400 hover:text-gray-600'>
                      <X strokeWidth={2} className='h-4 w-4' />
                    </button>
                  </div>
                )}
                <form onSubmit={envoyerMessage} className='flex items-center gap-3 px-4 md:px-6 py-2'>
                  <textarea
                    cols={1}
                    value={texte}
                    onChange={gererSaisie}
                    onInput={(e) => autoheightTextarea(e.target as HTMLTextAreaElement)}
                    placeholder='Écrire un message...'
                    spellCheck={false}
                    className='flex-1 rounded-xl border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-2 focus:outline-blue-200 min-h-9 max-h-40 resize-none overflow-y-auto text-sm'
                  />
                  <input
                    ref={inputImageRef}
                    type='file'
                    accept='image/*'
                    multiple
                    onChange={envoyerImages}
                    className='hidden'
                  />
                  <button
                    type='button'
                    disabled={envoiImageEnCours}
                    onClick={() => inputImageRef.current?.click()}
                    className='flex items-center justify-center h-10 w-10 rounded-full text-blue-700 disabled:opacity-50 transition-colors ease-in-out duration-200'
                  >
                    {envoiImageEnCours ? <Loader2 strokeWidth={2} className='h-6 w-6 animate-spin' /> : <ImagePlus strokeWidth={2} className='h-7 w-7' />}
                  </button>
                  <button
                    type='submit'
                    disabled={!texte.trim()}
                    className='flex items-center justify-center h-10 w-10 rounded-full text-blue-700 disabled:opacity-50 transition-colors ease-in-out duration-200'
                  >
                    <SendHorizonal strokeWidth={2} className='h-7 w-7' />
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>

    {imageVisionneuse && (
      <div
        className='fixed inset-0 z-50 bg-black/90 flex flex-col'
        onClick={() => setIndexVisionneuse(null)}
      >
        <button
          type='button'
          onClick={() => setIndexVisionneuse(null)}
          className='absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20'
          title='Fermer'
        >
          <X strokeWidth={2} className='h-6 w-6' />
        </button>
        <button
          type='button'
          onClick={(e) => { e.stopPropagation(); telechargerImage(imageVisionneuse.id) }}
          className='absolute top-4 right-16 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20'
          title='Télécharger'
        >
          <Download strokeWidth={2} className='h-6 w-6' />
        </button>
        <div className='relative flex-1 min-h-0 flex items-center justify-center'>
          {indexVisionneuse !== null && indexVisionneuse > 0 && (
            <button
              type='button'
              onClick={(e) => { e.stopPropagation(); setIndexVisionneuse(indexVisionneuse - 1) }}
              className='hidden md:block absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20'
              title='Précédent'
            >
              <ChevronLeft strokeWidth={2} className='h-7 w-7' />
            </button>
          )}
          {indexVisionneuse !== null && indexVisionneuse < toutesLesImages.length - 1 && (
            <button
              type='button'
              onClick={(e) => { e.stopPropagation(); setIndexVisionneuse(indexVisionneuse + 1) }}
              className='hidden md:block absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20'
              title='Suivant'
            >
              <ChevronRight strokeWidth={2} className='h-7 w-7' />
            </button>
          )}
          <div
            ref={scrollVisionneuseRef}
            onScroll={gererScrollVisionneuse}
            className='flex md:hidden w-full h-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          >
            {toutesLesImages.map((image, i) => (
              <div
                key={image.id}
                onClick={(e) => e.stopPropagation()}
                className='w-full h-full shrink-0 snap-center flex items-center justify-center'
              >
                {imagesCache[image.id] ? (
                  <img
                    src={imagesCache[image.id]}
                    alt=''
                    onDoubleClick={(e) => { e.stopPropagation(); setZoomActif((z) => !z) }}
                    style={{ transform: zoomActif && i === indexVisionneuse ? 'scale(2)' : 'scale(1)' }}
                    className='w-full max-h-[65vh] object-contain transition-transform duration-200 cursor-zoom-in'
                  />
                ) : (
                  <Loader2 className='h-10 w-10 text-white animate-spin' />
                )}
              </div>
            ))}
          </div>
          <div onClick={(e) => e.stopPropagation()} className='hidden md:flex md:max-h-[90vh] md:max-w-[90vw] items-center justify-center overflow-hidden'>
            {imagesCache[imageVisionneuse.id] ? (
              <img
                src={imagesCache[imageVisionneuse.id]}
                alt=''
                onDoubleClick={() => setZoomActif((z) => !z)}
                style={{ transform: zoomActif ? 'scale(2)' : 'scale(1)' }}
                className='md:max-h-[90vh] md:max-w-[90vw] object-contain transition-transform duration-200 cursor-zoom-in'
              />
            ) : (
              <Loader2 className='h-10 w-10 text-white animate-spin' />
            )}
          </div>
        </div>
        {toutesLesImages.length > 1 && (
          <div onClick={(e) => e.stopPropagation()} className='shrink-0 flex items-center gap-2 overflow-x-auto px-4 py-3'>
            {toutesLesImages.map((image, i) => (
              <button
                key={image.id}
                type='button'
                onClick={() => setIndexVisionneuse(i)}
                className={`h-14 w-14 shrink-0 rounded-lg overflow-hidden border-2 ${i === indexVisionneuse ? 'border-white' : 'border-transparent opacity-60'}`}
              >
                {imagesCache[image.id] ? (
                  <img src={imagesCache[image.id]} alt='' className='h-full w-full object-cover' />
                ) : (
                  <div className='h-full w-full bg-white/10' />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    )}
    </>
  )
}

export default Messages
