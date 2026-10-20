import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

function ModaleBas({ open, onClose, title, children }: { open: boolean, onClose: () => void, title: string, children?: React.ReactNode }) {
  const [visible, setVisible] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setVisible(true)
      setClosing(false)
      return
    }

    if (visible) {
      setClosing(true)
      const timeout = setTimeout(() => {
        setVisible(false)
        setClosing(false)
      }, 400)
      return () => clearTimeout(timeout)
    }
  }, [open, visible])

  if (!visible) return null

  return (
    <div className='fixed inset-0 z-50 flex items-end justify-center'>
      <div onClick={onClose} className='absolute inset-0 bg-black/40' />
      <div className={`relative w-full max-w-250 bg-white rounded-t-3xl p-8 ${closing ? 'animate-slide-down' : 'animate-slide-up'}`}>
        <div className='flex items-center justify-between mb-6'>
          <h2 className='text-xl font-bold text-gray-800'>{title}</h2>
          <button onClick={onClose} className='text-gray-500 hover:text-gray-800'>
            <X className='h-6 w-6' />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default ModaleBas
