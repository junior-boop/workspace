import { useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import { Bold, Italic, List, ListOrdered, Underline as UnderlineIcon, Quote, Heading1, Heading2, Heading3, Image as ImageIcon } from 'lucide-react'
import { compresserImageEnJpeg, blobVersDataUrl } from '../utils/image'

const CLASSES_CONTENU = '[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_p]:my-1 [&_strong]:font-semibold [&_u]:underline [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-2 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_img]:rounded-lg [&_img]:max-w-full'

function EditeurTexte({ valeurInitiale, onChange, editable = true }: { valeurInitiale: string, onChange?: (html: string) => void, editable?: boolean }) {
  const entreeFichier = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [StarterKit, Underline, Image],
    content: valeurInitiale,
    editable,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  }, [editable])

  if (!editor) return null

  if (!editable) {
    return <EditorContent editor={editor} className={`text-gray-700 ${CLASSES_CONTENU}`} />
  }

  const ajouterImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    const blob = await compresserImageEnJpeg(fichier)
    const dataUrl = await blobVersDataUrl(blob)
    editor.chain().focus().setImage({ src: dataUrl }).run()
  }

  return (
    <div className='rounded-xl border border-gray-300 focus-within:border-blue-500 overflow-hidden'>
      <div className='flex flex-wrap items-center gap-1 border-b border-gray-200 px-2 py-1.5'>
        <button
          type='button'
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <Heading1 strokeWidth={2} className='h-4 w-4' />
        </button>
        <button
          type='button'
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <Heading2 strokeWidth={2} className='h-4 w-4' />
        </button>
        <button
          type='button'
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <Heading3 strokeWidth={2} className='h-4 w-4' />
        </button>
        <button
          type='button'
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded ${editor.isActive('bold') ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <Bold strokeWidth={2} className='h-4 w-4' />
        </button>
        <button
          type='button'
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded ${editor.isActive('italic') ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <Italic strokeWidth={2} className='h-4 w-4' />
        </button>
        <button
          type='button'
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded ${editor.isActive('underline') ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <UnderlineIcon strokeWidth={2} className='h-4 w-4' />
        </button>
        <button
          type='button'
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded ${editor.isActive('blockquote') ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <Quote strokeWidth={2} className='h-4 w-4' />
        </button>
        <button
          type='button'
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded ${editor.isActive('bulletList') ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <List strokeWidth={2} className='h-4 w-4' />
        </button>
        <button
          type='button'
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded ${editor.isActive('orderedList') ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <ListOrdered strokeWidth={2} className='h-4 w-4' />
        </button>
        <button
          type='button'
          onClick={() => entreeFichier.current?.click()}
          className='p-1.5 rounded text-gray-500 hover:bg-gray-100'
        >
          <ImageIcon strokeWidth={2} className='h-4 w-4' />
        </button>
        <input ref={entreeFichier} type='file' accept='image/*' onChange={ajouterImage} className='hidden' />
      </div>
      <EditorContent editor={editor} className={`px-4 py-2 min-h-25 [&_.ProseMirror]:outline-none ${CLASSES_CONTENU}`} />
    </div>
  )
}

export default EditeurTexte
