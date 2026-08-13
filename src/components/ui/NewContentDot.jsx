/**
 * Punto luminoso rojo que indica contenido nuevo no visto en una sección.
 * Se muestra a la derecha del enlace del menú; desaparece al abrir la sección.
 */
export default function NewContentDot({ show }) {
  if (!show) return null
  return (
    <span
      aria-hidden
      className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full bg-primary shadow-glow animate-pulse-ring"
    />
  )
}
