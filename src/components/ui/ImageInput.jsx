import { useRef, useState } from 'react'
import { ImagePlus, Link2, UploadCloud, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from './Toast'

/**
 * Selector de imagen para formularios de contenido.
 * Permite pegar una URL o subir un archivo al bucket "media" de Supabase Storage.
 */
export default function ImageInput({ value, onChange }) {
  const { toast } = useToast()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const upload = async (file) => {
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop() || 'png'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { data, error } = await supabase.storage.from('media').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

    if (error) {
      toast('Subida fallida: ' + error.message, 'error')
      setUploading(false)
      return
    }

    const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(data.path)
    onChange(publicUrl.publicUrl)
    toast('Imagen subida', 'success')
    setUploading(false)
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
            className="hidden"
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </div>

        <div className="flex-1">
          <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-soft">
            <Link2 size={12} /> O pega la URL de la imagen
          </span>
          <input
            type="url"
            className="input text-sm"
            placeholder="https://..."
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
