import { useRef, useState } from 'react'
import { ImagePlus, Link2, UploadCloud, X } from 'lucide-react'
import { supabase, uploadWithProgress } from '../../lib/supabase'
import { useToast } from './Toast'

/**
 * Selector de imagen para formularios de contenido.
 * Permite pegar una URL o subir un archivo al bucket "media" de Supabase Storage.
 * Con `allowUrl={false}` se oculta el campo de URL (p. ej. en guías, donde se
 * prefiere el enlace de YouTube en su propio campo).
 */
export default function ImageInput({ value, onChange, allowUrl = true, folder = '' }) {
  const { toast } = useToast()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  // Los móviles (sobre todo iPhone) envían fotos en HEIC, que la mayoría de
  // navegadores no saben mostrar. Si el archivo es HEIC/HEIF se convierte a
  // JPEG antes de subir; si el navegador no puede decodificarlo se sube tal cual.
  const normalizeImage = (file) =>
    new Promise((resolve) => {
      if (!/image\/(heic|heif)/i.test(file.type)) {
        resolve(file)
        return
      }
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d').drawImage(img, 0, 0)
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url)
            resolve(
              blob
                ? new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
                    type: 'image/jpeg',
                  })
                : file
            )
          },
          'image/jpeg',
          0.9
        )
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(file)
      }
      img.src = url
    })

  const upload = async (file) => {
    if (!file) return
    setUploading(true)
    setProgress(0)
    const normalized = await normalizeImage(file)
    const ext = normalized.name.split('.').pop() || 'png'
    // `folder` permite subir a la carpeta del usuario (p. ej. avatars/<uid>)
    // cumpliendo la política de storage "media_user_insert_own" (primer segmento = uid).
    const path = `${folder ? folder + '/' : ''}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    try {
      const data = await uploadWithProgress({
        bucket: 'media',
        path,
        file: normalized,
        onProgress: setProgress,
      })

      const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(data.path)
      onChange(publicUrl.publicUrl)
      toast('Imagen subida', 'success')
    } catch (err) {
      toast('Subida fallida: ' + err.message, 'error')
    }
    setUploading(false)
    setProgress(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="relative">
          {value ? (
            <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-edge">
              <img src={value} alt="Vista previa" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                aria-label="Quitar imagen"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-edge text-soft transition hover:border-primary hover:text-primary"
            >
              {uploading ? <UploadCloud size={18} className="animate-pulse" /> : <ImagePlus size={18} />}
              <span className="text-[10px] font-semibold">{uploading ? 'Subiendo' : 'Subir'}</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </div>

        <div className="flex-1">
          {allowUrl ? (
            <>
              <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-soft">
                <Link2 size={12} /> O pega la URL de la imagen
              </span>
              <input
                type="url"
                className="input text-base"
                placeholder="https://..."
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
              />
            </>
          ) : (
            value && (
              <span className="ml-1 flex items-center gap-1.5 text-xs font-medium text-soft">
                <Link2 size={12} /> Imagen subida desde tu dispositivo
              </span>
            )
          )}
        </div>
      </div>

      {uploading && (
        <div className="mt-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-edge">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] font-semibold text-soft">Subiendo imagen… {progress}%</p>
        </div>
      )}
    </div>
  )
}
