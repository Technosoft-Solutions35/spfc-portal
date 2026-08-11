// Encabezado de sección reutilizable dentro del portal
export default function PageHeader({ title, subtitle, icon: Icon, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Icon size={22} />
          </span>
        )}
        <div>
          <h2 className="font-display text-2xl font-extrabold text-text">{title}</h2>
          {subtitle && <p className="text-sm text-soft">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
