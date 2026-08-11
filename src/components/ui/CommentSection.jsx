import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, Pencil, Send, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from './Toast'
import { formatShortDate } from '../../lib/utils'
import Avatar, { RoleBadge } from './Avatar'
import EmptyState from './EmptyState'

/**
 * Sección de comentarios reutilizable (torneos, eventos, noticias).
 * Los miembros participan y pueden EDITAR sus propios comentarios.
 * El staff (admin/gestor) puede borrar cualquier comentario.
 */
export default function CommentSection({ parentType, parentId }) {
  const { user, profile, role } = useAuth()
  const { toast } = useToast()

  const [comments, setComments] = useState(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingText, setEditingText] = useState('')

  const isStaff = role === 'admin' || role === 'gestor'

  const loadComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*, author:profiles(username, role, avatar_url)')
      .eq('parent_type', parentType)
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false })
    if (!error) setComments(data || [])
  }

  useEffect(() => {
    loadComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentType, parentId])

  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    const { error } = await supabase.from('comments').insert({
      parent_type: parentType,
      parent_id: parentId,
      author_id: user.id,
      content: text.trim(),
    })
    setSending(false)
    if (error) {
      toast('No se pudo publicar el comentario', 'error')
      return
    }
    setText('')
    toast('Comentario publicado', 'success')
    loadComments()
  }

  const saveEdit = async (commentId) => {
    if (!editingText.trim()) return
    const { error } = await supabase
      .from('comments')
      .update({ content: editingText.trim() })
      .eq('id', commentId)
    if (error) {
      toast('No se pudo editar el comentario', 'error')
      return
    }
    setEditingId(null)
    toast('Comentario actualizado', 'success')
    loadComments()
  }

  const remove = async (commentId) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (error) {
      toast('No se pudo eliminar el comentario', 'error')
      return
    }
    toast('Comentario eliminado', 'info')
    loadComments()
  }

  return (
    <div className="mt-5 rounded-2xl border border-edge bg-background/60 p-4">
      <h4 className="mb-3 flex items-center gap-2 font-display font-bold text-text">
        <MessageCircle size={17} className="text-primary" />
        Comentarios / Inscripciones
        {comments && <span className="text-xs font-medium text-soft">({comments.length})</span>}
      </h4>

      {/* Formulario */}
      <form onSubmit={submit} className="mb-4 flex gap-2">
        <input
          className="input"
          placeholder="Escribe aquí tu inscripción o comentario..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={400}
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="btn-primary shrink-0 px-4"
          aria-label="Enviar comentario"
        >
          <Send size={17} />
        </button>
      </form>

      {/* Lista */}
      {!comments ? (
        <p className="py-4 text-center text-sm text-soft">Cargando comentarios...</p>
      ) : comments.length === 0 ? (
        <EmptyState title="Sin comentarios" hint="Sé el primero en inscribirte o comentar." icon={MessageCircle} />
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const mine = c.author_id === user?.id
            return (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-edge bg-elevated p-3"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <Avatar
                    name={c.author?.username}
                    src={c.author?.avatar_url}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-bold text-text">
                      {c.author?.username ?? 'Usuario'}
                      <RoleBadge role={c.author?.role} />
                    </p>
                    <p className="text-[11px] text-soft">{formatShortDate(c.created_at)}</p>
                  </div>
                  {mine && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingId(c.id)
                          setEditingText(c.content)
                        }}
                        title="Editar mi comentario"
                        className="rounded-lg p-1.5 text-soft transition hover:bg-secondary/10 hover:text-secondary"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => remove(c.id)}
                        title="Eliminar"
                        className="rounded-lg p-1.5 text-soft transition hover:bg-primary/10 hover:text-primary"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                  {isStaff && !mine && (
                    <button
                      onClick={() => remove(c.id)}
                      title="Moderar (eliminar)"
                      className="rounded-lg p-1.5 text-soft transition hover:bg-primary/10 hover:text-primary"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {editingId === c.id ? (
                  <div className="flex gap-2">
                    <input
                      className="input"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      maxLength={400}
                      autoFocus
                    />
                    <button onClick={() => saveEdit(c.id)} className="btn-primary shrink-0 px-4">
                      Guardar
                    </button>
                    <button onClick={() => setEditingId(null)} className="btn-ghost shrink-0 px-3">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
                    {c.content}
                  </p>
                )}
              </motion.li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
