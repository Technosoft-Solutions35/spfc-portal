import { useState } from 'react'
import { ScrollText, Medal } from 'lucide-react'
import Modal from '../ui/Modal'

/**
 * Pie de página del portal (visible en todas las secciones y para todos los
 * roles). Da acceso rápido a las Reglas del clan y a los Rangos y ascensos,
 * cada uno abierto en una pestaña superpuesta (modal).
 */

const CLAN_RULES = [
  'No faltar el respeto ni insultar a los demás miembros del clan',
  'No spamear Stickers',
  'Respetar a todos los Administradores',
  'No publicar nada que tenga Contenido Sexual, Xenofobia, Gore, entre otros temas cuestionables',
]

const RANK_NOTES = [
  'Cada domingo se hará revisión de los rangos individualmente en consideración',
  'Puede haber cambios en las características de cada rango',
]

const RANK_TIERS = [
  {
    from: 'Entrenador',
    to: 'Superior',
    arrow: '▶️',
    requirements: [
      'Mostrar interés en las actividades y eventos del equipo.',
      'Ser activo en el clan, puede ser dentro del juego, WhatsApp o Discord.',
      'Conocimiento básico del juego.',
    ],
  },
  {
    from: 'Superior',
    to: 'Experto',
    arrow: '➡️',
    requirements: [
      'Apoyar a otros miembros del clan con sus dudas y/o preguntas.',
      'Participar en eventos y actividades del clan.',
      'Ser activo en el clan, puede ser dentro del juego, WhatsApp o Discord.',
      'Mostrar conocimiento en las mecánicas del juego, los cuales puede ser el pvp, farmeos, shiny hunting, buildeo, etc.',
      'Ser líder de Gym sube instantáneamente a este rango.',
    ],
  },
  {
    from: 'Experto',
    to: 'Elite',
    arrow: '➡️',
    requirements: [
      'Tener un conocimiento profundo de las mecánicas del juego, especialmente en lo que respecta a PvP.',
      'Haber participado activamente en la creación y organización de eventos y torneos dentro del equipo.',
      'Demostrar capacidad para liderar y apoyar a otros miembros del equipo.',
      'Llegado a este rango puede haber acceso temporal al grupo de administración del clan para el apoyo y organización de eventos y/o dinámicas, entre otras cosas.',
    ],
  },
  {
    from: 'Elite',
    to: 'Maestro',
    arrow: '➡️',
    requirements: [
      'Haber pasado por todos los rangos anteriores y demostrar una comprensión profunda de la estructura y funcionamiento del clan.',
      'Haber demostrado amplios conocimientos en las distintas mecánicas del juego.',
      'Haber demostrado una capacidad para tomar decisiones, además de apoyar a la administración constantemente.',
      'Haber ganado la confianza del Líder y demostrar una capacidad para trabajar en colaboración con los demás miembros del clan.',
      'Tener tu personaje principal dentro del clan.',
      'Contar con tiempo considerado dentro del clan.',
      'Este rango no se puede solicitar, este rango se te ofrece.',
    ],
  },
]

export default function FooterLinks() {
  const [showRules, setShowRules] = useState(false)
  const [showRanks, setShowRanks] = useState(false)

  return (
    <>
      <footer className="mt-auto border-t border-edge bg-surface/60 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6">
          <p className="text-xs text-soft">
            <span className="font-display font-extrabold text-text">
              SpFc<span className="text-primary">/Gd</span>
            </span>
            {' · '}Special Force · Portal del clan
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setShowRules(true)}
              className="flex items-center gap-2 rounded-xl border border-edge bg-background px-4 py-2.5 text-sm font-semibold text-text transition hover:border-primary/50 hover:text-primary active:scale-95"
            >
              <ScrollText size={16} className="text-primary" />
              Reglas del clan
            </button>
            <button
              onClick={() => setShowRanks(true)}
              className="flex items-center gap-2 rounded-xl border border-edge bg-background px-4 py-2.5 text-sm font-semibold text-text transition hover:border-secondary/50 hover:text-secondary active:scale-95"
            >
              <Medal size={16} className="text-secondary" />
              Rangos y ascensos
            </button>
          </div>
        </div>
      </footer>

      {/* Reglas del clan */}
      <Modal
        open={showRules}
        onClose={() => setShowRules(false)}
        title="📜 Reglas del clan"
        maxWidth="max-w-xl"
      >
        <ul className="space-y-3">
          {CLAN_RULES.map((rule, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl bg-background p-3 text-sm leading-relaxed text-text"
            >
              <span className="mt-0.5 shrink-0">✨</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </Modal>

      {/* Rangos y ascensos */}
      <Modal
        open={showRanks}
        onClose={() => setShowRanks(false)}
        title="🦁 Rangos del clan SpFc/Gd 🦁"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-3">
          {RANK_NOTES.map((note, i) => (
            <p key={i} className="text-sm text-soft">
              · {note}
            </p>
          ))}

          <div className="space-y-4 pt-2">
            {RANK_TIERS.map((tier, i) => (
              <div key={i} className="rounded-xl border border-edge bg-background p-4">
                <h4 className="flex flex-wrap items-center gap-2 font-display text-sm font-bold text-primary">
                  {tier.from}
                  <span className="text-secondary">{tier.arrow}</span>
                  {tier.to}
                </h4>
                <ul className="mt-3 space-y-2">
                  {tier.requirements.map((req, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-2 text-sm leading-relaxed text-text"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  )
}
