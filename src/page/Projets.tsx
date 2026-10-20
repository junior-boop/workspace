import { useEffect } from 'react'
import { ref, set } from 'firebase/database'
import { rtdb } from '../firebase'
import { useAuth } from '../contexts/AuthContext'

function Projets() {
  const { utilisateur } = useAuth()

  useEffect(() => {
    if (!utilisateur) return
    set(ref(rtdb, `vues/${utilisateur.id}/projets`), Date.now())
  }, [utilisateur])

  return (
    <div className='p-8'>
      <h1 className='text-2xl font-bold text-gray-800'>Les projets</h1>
    </div>
  )
}

export default Projets
