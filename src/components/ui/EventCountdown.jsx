import { useEffect, useState } from 'react'
import { Clock, PlayCircle } from 'lucide-react'

const pad = (n) => String(n).padStart(2, '0')

/**
 * Cuenta regresiva en vivo hasta la fecha de un evento.
 * Se calcula contra Date.now() (siempre en UTC internamente), por lo que es
 * correcto en cualquier zona horaria (LatAm, España, etc.) sin importar el
 * dispositivo del visitante. Cuando la hora ya pasó muestra "Comenzado".
 */
export default function EventCountdown({ date }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = new Date(date).getTime() - now

  if (diff <= 0) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold text-success">
        <PlayCircle size={12} />
        Comenzado
      </span>
    )
  }

  const totalSec = Math.floor(diff / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60

  const text =
    days > 0
      ? `En ${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `En ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-1 font-mono text-[11px] font-bold text-secondary">
      <Clock size={12} className="animate-pulse" />
      {text}
    </span>
  )
}
