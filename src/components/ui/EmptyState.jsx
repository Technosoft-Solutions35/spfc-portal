import { Inbox } from 'lucide-react'

// Estado vacío reutilizable para listas
export default function EmptyState({ title = 'Sin contenido', hint, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="rounded-2xl bg-primary/10 p-4 text-primary">
        <Icon size={32} />
      </div>
      <p className="font-semibold text-text">{title}</p>
      {hint && <p className="max-w-sm text-sm text-soft">{hint}</p>}
    </div>
  )
}
