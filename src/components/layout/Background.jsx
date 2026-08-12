/**
 * Fondo temático inmersivo del portal.
 * Usa la imagen del clan (public/images/background.png) con un overlay
 * oscuro. Si la imagen no existe, los degradados de la paleta hacen de fallback
 * y el portal sigue viéndose bien.
 */
export default function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Imagen de fondo del clan */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('images/background.png')" }}
      />

      {/* Overlay oscuro que garantiza legibilidad del contenido */}
      <div className="absolute inset-0 bg-background/85" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />

      {/* Resplandores decorativos con la paleta del clan.
          En móvil se usan blurs más suaves: los blurs enormes sobrecargan
          el compositor de iOS Safari y provocan saltos de escala/zoom. */}
      <div className="absolute -left-32 top-[-10%] h-96 w-96 rounded-full bg-primary/20 blur-[60px] lg:blur-[120px]" />
      <div className="absolute -right-32 bottom-[-10%] h-96 w-96 rounded-full bg-secondary/15 blur-[60px] lg:blur-[120px]" />
    </div>
  )
}
