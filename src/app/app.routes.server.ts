import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Estrategia de renderizado por ruta.
 *
 * El modo de render es una decisión de SEO, no solo de rendimiento: determina
 * si el rastreador recibe HTML con contenido o un esqueleto vacío que depende
 * de JavaScript.
 *
 *   - `Prerender` → HTML generado en el build. Lo más rápido y lo más seguro
 *                   para SEO, pero solo sirve si el contenido es conocido de
 *                   antemano y cambia poco.
 *   - `Server`    → HTML generado por petición. Necesario cuando el contenido
 *                   depende de datos frescos o de la petición misma.
 *   - `Client`    → sin HTML. El buscador ve una página vacía hasta que
 *                   ejecuta el JS. Aceptable solo en rutas que NO deben
 *                   indexarse (paneles privados, por ejemplo).
 *
 * El orden importa menos que la especificidad: Angular resuelve primero la
 * ruta más concreta, y solo lo que no encaja en ninguna cae en el comodín.
 */
export const serverRoutes: ServerRoute[] = [
  // ---------------------------------------------------------------------
  // Páginas estáticas
  // ---------------------------------------------------------------------
  // Se declaran una a una en lugar de dejarlas caer en el `**`, porque ese
  // bloque marca las respuestas con 404. Además, su contenido no cambia entre
  // peticiones: pregenerarlas es gratis en tiempo de respuesta.
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'contact', renderMode: RenderMode.Prerender },
  { path: 'pricing', renderMode: RenderMode.Prerender },

  // ---------------------------------------------------------------------
  // Contenido dinámico
  // ---------------------------------------------------------------------
  {
    path: 'characters/page/:page',
    renderMode: RenderMode.Prerender,
    // Las páginas fuera de la lista pregenerada se renderizan en servidor bajo
    // demanda, con estado 200. Sin este fallback devolverían 404 y perderíamos
    // del índice todo el listado profundo.
    fallback: PrerenderFallback.Server,
    getPrerenderParams() {
      // Solo se pregeneran las primeras páginas: prerenderizar las 42 alargaría
      // el build sin beneficio real, porque las páginas profundas del listado
      // reciben muy poco tráfico orgánico.
      const pages = Array.from({ length: 5 }, (_, i) => ({ page: (i + 1).toString() }));
      return Promise.resolve(pages);
    },
  },
  {
    path: 'character/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    getPrerenderParams() {
      const ids = Array.from({ length: 5 }, (_, i) => ({ id: (i + 1).toString() }));
      return Promise.resolve(ids);
    }
  },

  // ---------------------------------------------------------------------
  // Comodín: URLs que no existen
  // ---------------------------------------------------------------------
  {
    /**
     * Devuelve un 404 real.
     *
     * Esta es la mitad servidor del arreglo del soft 404: el componente
     * `NotFound` pone `noindex`, y aquí se emite el código de estado que hace
     * que el rastreador descarte la URL en vez de indexarla.
     *
     * Las dos señales deben coincidir. Un 404 con contenido pero estado 200
     * sigue siendo un soft 404, y un 200 con `noindex` desperdicia rastreo.
     */
    path: '**',
    renderMode: RenderMode.Server,
    status: 404,
  }
]
