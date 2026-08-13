// Enlaces compartibles entre miembros.
//
// La app usa HashRouter: la ruta vive dentro del "#" (ej: #/noticias). Para que
// un enlace compartido abra exactamente el anuncio indicado, el id viaja como
// query dentro del hash: #/noticias?news=<id>.

/**
 * Construye el enlace de compartir de un anuncio.
 * @param {string} route  ruta de la sección, ej. '/noticias'
 * @param {string} param  nombre del parámetro, ej. 'news'
 * @param {string} id     id (uuid) del anuncio
 */
export function buildShareLink(route, param, id) {
  return `${window.location.origin}${window.location.pathname}#${route}?${param}=${id}`
}

/**
 * Lee del hash el anuncio solicitado vía enlace compartido.
 * Devuelve { param, id } o null si no hay deep link.
 * Ej: con "#/noticias?news=abc-123" devuelve { param: 'news', id: 'abc-123' }.
 */
export function readDeepLink() {
  const m = window.location.hash.match(/\?([\w-]+)=([\w-]+)/)
  return m ? { param: m[1], id: m[2] } : null
}
