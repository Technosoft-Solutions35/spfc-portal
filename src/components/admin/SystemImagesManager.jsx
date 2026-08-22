import { useEffect, useState } from 'react'
import { Image, Trash2, Upload } from 'lucide-react'
import { supabase, supabaseUrl } from '../../lib/supabase'
import { useToast } from '../ui/Toast'

const IMAGE_SLOTS = [
  { key: 'logo_clan', label: 'Logo del Clan', desc: 'Aparece en el sidebar, header y splash.' },
  { key: 'background', label: 'Imagen de Fondo', desc: 'Fondo del login y páginas de autenticación.' },
  { key: 'default_avatar', label: 'Avatar por Defecto', desc: 'Se muestra cuando un miembro no tiene foto de perfil.' },
]

export default function SystemImagesManager() {
  const { toast } = useToast()
  const [images, setImages] = useState({})
  const [uploading, setUploading] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data, error } = await supabase.from('site_settings').select('key, value')
      if (!error && mounted) {
        const map = {}
        ;(data || []).forEach((s) => { map[s.key] = s.value })
        setImages(map)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  async function uploadImage(slotKey, file) {
    if (!file) return
    setUploading(slotKey)

    const ext = file.name.split('.').pop()
    const path = `system/${slotKey}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('images')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (upErr) {
      toast('Error al subir: ' + upErr.message, 'error')
      setUploading(null)
      return
    }

    const { data: urlData } = supabase.storage.from('images').getPublicUrl(path)
    const publicUrl = urlData?.publicUrl

    if (publicUrl) {
      await supabase.from('site_settings').upsert(
        { key: slotKey, value: publicUrl },
        { onConflict: 'key' }
      )
      await supabase.rpc('log_admin_action', {
        p_action: 'image_uploaded',
        p_entity: 'system_image',
        p_entity_id: slotKey,
      })
      setImages((prev) => ({ ...prev, [slotKey]: publicUrl }))
      toast('Imagen actualizada', 'success')
    }

    setUploading(null)
  }

  async function removeImage(slotKey) {
    const { error } = await supabase.from('site_settings').delete().eq('key', slotKey)
    if (error) return toast('Error: ' + error.message, 'error')

    await supabase.rpc('log_admin_action', {
      p_action: 'image_deleted',
      p_entity: 'system_image',
      p_entity_id: slotKey,
    })
    setImages((prev) => { const n = { ...prev }; delete n[slotKey]; return n })
    toast('Imagen eliminada', 'success')
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-text">
          <Image size={20} className="text-primary" /> Imágenes del Sistema
        </h3>
        <p className="text-sm text-soft">Administra el logo, imagen de fondo y avatares por defecto del portal.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {IMAGE_SLOTS.map((slot) => {
          const url = images[slot.key]
          return (
            <div key={slot.key} className="rounded-2xl border border-edge bg-elevated p-5">
              <h4 className="font-display font-bold text-text">{slot.label}</h4>
              <p className="mt-1 text-xs text-soft">{slot.desc}</p>

              <div className="mt-4 flex h-32 items-center justify-center overflow-hidden rounded-xl border border-edge bg-surface">
                {url ? (
                  <img src={url} alt={slot.label} className="h-full w-full object-contain" />
                ) : (
                  <Image size={32} className="text-soft" />
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <label className="btn-secondary flex-1 cursor-pointer justify-center text-xs">
                  <Upload size={14} />
                  {uploading === slot.key ? 'Subiendo...' : 'Subir'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading === slot.key}
                    onChange={(e) => uploadImage(slot.key, e.target.files?.[0])}
                  />
                </label>
                {url && (
                  <button onClick={() => removeImage(slot.key)} className="btn-secondary text-xs text-primary">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
