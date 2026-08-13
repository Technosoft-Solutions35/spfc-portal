import { Heart, Share2 } from 'lucide-react'
import { useLike } from '../../hooks/useLike'
import { useToast } from './Toast'
import { buildShareLink } from '../../lib/share'

/**
 * Acciones de un anuncio: botón de Me gusta (con contador en vivo) y botón de
 * Compartir (Web Share en móvil, copia de enlace en escritorio).
 * El enlace compartido abre la sección concreta y, si el anuncio tiene modal,
 * lo abre directamente (deep link por hash).
 *
 * IMPORTANTE: los clics hacen stopPropagation para no disparar el onClick de
 * la tarjeta en la que van montados (las tarjetas son clicables enteras).
 */
export default function PostActions({
  parentType,
  parentId,
  shareRoute,
  shareParam,
  shareText = '',
  className = '',
}) {
  const { toast } = useToast()
  const { count, liked, toggle } = useLike(parentType, parentId)

  const like = (e) => {
    e.stopPropagation()
    toggle()
  }

  const share = (e) => {
    e.stopPropagation()
    const url = buildShareLink(shareRoute, shareParam, parentId)
    if (navigator.share) {
      navigator
        .share({ title: shareText, text: shareText, url })
        .catch(() => {
          // El usuario canceló el cuadro de compartir; no se muestra error
        })
      return
    }
    navigator.clipboard
      ?.writeText(url)
      .then(() => toast('Enlace copiado al portapapeles', 'success'))
      .catch(() => toast('No se pudo copiar el enlace', 'error'))
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={like}
        title={liked ? 'Quitar me gusta' : 'Me gusta'}
        aria-pressed={liked}
        className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-background px-3 py-1.5 text-sm font-semibold text-soft transition hover:border-primary/40 hover:text-primary"
      >
        <Heart size={15} className={liked ? 'fill-current text-primary' : ''} />
        <span className="tabular-nums">{count}</span>
      </button>

      <button
        type="button"
        onClick={share}
        title="Compartir"
        className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-background px-3 py-1.5 text-sm font-semibold text-soft transition hover:border-primary/40 hover:text-primary"
      >
        <Share2 size={15} />
        Compartir
      </button>
    </div>
  )
}
