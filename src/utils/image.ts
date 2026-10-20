import encoderJpeg from '@jsquash/jpeg/encode'

const QUALITE_JPEG = 0.8

async function dessinerSurCanvas(fichier: File): Promise<ImageData> {
  const bitmap = await createImageBitmap(fichier)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const contexte = canvas.getContext('2d')
  if (!contexte) throw new Error('Impossible de créer le contexte 2D')
  contexte.drawImage(bitmap, 0, 0)
  return contexte.getImageData(0, 0, bitmap.width, bitmap.height)
}

export async function compresserImageEnJpeg(fichier: File): Promise<Blob> {
  const donneesImage = await dessinerSurCanvas(fichier)
  const tampon = await encoderJpeg(donneesImage, { quality: QUALITE_JPEG * 100 })
  return new Blob([tampon], { type: 'image/jpeg' })
}

export function blobVersDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader()
    lecteur.onload = () => resolve(lecteur.result as string)
    lecteur.onerror = reject
    lecteur.readAsDataURL(blob)
  })
}
