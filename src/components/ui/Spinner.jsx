import { Loader2 } from 'lucide-react'

// Indicador de carga reutilizable
export default function Spinner({ label = 'Cargando...', full = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-soft ${
        full ? 'min-h-[50vh]' : 'py-10'
      }`}
    >
      <Loader2 size={28} className="animate-spin text-primary" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}
