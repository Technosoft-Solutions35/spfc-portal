import { useRef, useState } from 'react'
import { FileText, UploadCloud, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from './Toast'

// Solo tipos de documento (sin imagen/video): evita que iOS ofrezca
// "Tomar foto o video" en el selector (que pedía permisos de cámara/micrófono).
const ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt,.ods,.csv,.md,.zip,.rar,.7z,' +
  'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
  'application/zip,application/x-rar-compressed,application/x-7z-compressed,text/plain,text/csv'

/**
 * Selector de documentos adjuntos (cualquier tipo de archivo) para formularios.
 * Sube cada archivo al bucket "media" de Supabase Storage y guarda
 * una lista [{ name, url }] lista para almacenar en la columna jsonb.
 */
export default function DocumentsInput({ value = [], onChange }) {
  const { toast } = useToast()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [filesDone, setFilesDone] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)

  const upload = async (files) => {
    const list = Array.from(files || [])
    if (!list.length) return
    setUploading(true)
    setTotalFiles(list.length)
    setFilesDone(0)
    setProgress(0)

    const uploaded = []
    for (let idx = 0; idx < list.length; idx++) {
      const file = list[idx]
      setProgress(0)
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
      const path = `docs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { data, error } = await supabase.storage.from('media').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
        onUploadProgress: (e) => {
          if (e.total > 0) setProgress(Math.round((e.loaded / e.total) * 100))
        },
      })

      if (error) {
        toast(`No se pudo subir ${file.name}: ${error.message}`, 'error')
      } else {
        const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(data.path)
        uploaded.push({ name: file.name, url: publicUrl.publicUrl })
      }
      setFilesDone(idx + 1)
    }

    setUploading(false)
    setProgress(0)
    if (uploaded.length) {
      onChange([...(value || []), ...uploaded])
      toast(`${uploaded.length} documento(s) subido(s)`, 'success')
    }
  }

  const remove = (index) => {
    onChange((value || []).filter((_, i) => i !== index))
  }

  return (
    <div>
      <div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex h-16 w-28 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-edge text-soft transition hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {uploading ? (
            <UploadCloud size={18} className="animate-pulse" />
          ) : (
            <FileText size={18} />
          )}
          <span className="text-[10px] font-semibold">
            {uploading ? 'Subiendo...' : 'Subir archivos'}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            upload(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {uploading && (
        <div className="mt-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-edge">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] font-semibold text-soft">
            Subiendo archivo {filesDone + (progress === 100 ? 0 : 1)} de {totalFiles}… {progress}%
          </p>
        </div>
      )}

      {(value || []).length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {(value || []).map((doc, i) => (
            <li
              key={`${doc.name}-${i}`}
              className="flex items-center gap-2 rounded-xl border border-edge bg-background px-3 py-2 text-sm"
            >
              <FileText size={15} className="shrink-0 text-primary" />
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate font-medium text-text transition hover:text-primary"
              >
                {doc.name}
              </a>
              <button
                type="button"
                onClick={() => remove(i)}
                className="rounded-lg p-1 text-soft transition hover:text-primary"
                aria-label="Quitar documento"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
