/**
 * Generación del sitemap.xml.
 *
 * Un sitemap es una lista de las URLs que el dueño del sitio considera dignas
 * de indexar, con metadatos sobre cuándo cambiaron. NO es una orden: es una
 * sugerencia que ayuda al buscador a descubrir contenido que quizá no
 * encontraría siguiendo enlaces.
 *
 * ¿Cuándo importa de verdad?
 *   - Sitios grandes, donde el rastreo por enlaces es lento o incompleto.
 *   - Contenido nuevo o profundo, con pocos enlaces entrantes.
 *   - SPAs, donde la navegación puede depender de JavaScript.
 * En un sitio de 10 páginas bien enlazadas, el sitemap aporta poco.
 *
 * Se genera dinámicamente (en vez de mantener un XML a mano) porque el
 * catálogo de personajes vive en una API externa: un archivo estático quedaría
 * desactualizado en cuanto la fuente cambie, y un sitemap con URLs muertas
 * erosiona la confianza del rastreador.
 *
 * Límites del protocolo (https://www.sitemaps.org/protocol.html):
 *   - Máximo 50 000 URLs y 50 MB sin comprimir por archivo.
 *   - Al superarlos hay que partirlo y publicar un *sitemap index*.
 */

import { SITE_URL } from './app/config/seo.config';

const CHARACTERS_API = 'https://rickandmortyapi.com/api/character';

/** Vigencia del sitemap en memoria: 6 horas. */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Frecuencia de cambio declarada.
 *
 * Advertencia práctica: Google anunció que IGNORA `changefreq` y `priority`.
 * Solo usa `lastmod`, y únicamente si detecta que es fiable. Se mantienen aquí
 * porque otros buscadores (Bing, Yandex) sí los consideran y porque el
 * protocolo los define — pero no hay que esperar ningún efecto en Google.
 */
type ChangeFreq = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface SitemapEntry {
  path: string;
  changefreq: ChangeFreq;
  priority: number;
  lastmod?: string;
}

interface CachedSitemap {
  xml: string;
  generatedAt: number;
}

let cache: CachedSitemap | null = null;

/**
 * Escapa los cinco caracteres que XML reserva.
 *
 * Sin esto, el nombre de un personaje con `&` rompería el documento entero y
 * el buscador descartaría el sitemap completo, no solo la entrada afectada.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Rutas conocidas en tiempo de compilación. */
function staticEntries(): SitemapEntry[] {
  return [
    { path: '/about', changefreq: 'monthly', priority: 0.8 },
    { path: '/contact', changefreq: 'yearly', priority: 0.5 },
    { path: '/pricing', changefreq: 'monthly', priority: 0.7 },
  ];
}

/**
 * Consulta la API para saber cuántos personajes y páginas existen.
 *
 * Si la API falla devolvemos `null` y el sitemap se emite solo con las rutas
 * estáticas: es preferible un sitemap incompleto a una respuesta 500, porque
 * un error repetido hace que el buscador deje de pedir el archivo.
 */
async function fetchCatalogSize(): Promise<{ count: number; pages: number } | null> {
  try {
    const response = await fetch(`${CHARACTERS_API}?page=1`);
    if (!response.ok) return null;

    const data = (await response.json()) as { info: { count: number; pages: number } };
    return { count: data.info.count, pages: data.info.pages };
  } catch {
    return null;
  }
}

/**
 * Construye el XML completo.
 *
 * `lastmod` usa la fecha de generación porque la API no expone una fecha de
 * modificación por recurso. En un proyecto con base de datos propia debería
 * salir del `updated_at` de cada registro: un `lastmod` que cambia en cada
 * build sin que el contenido cambie le enseña al buscador a desconfiar de él.
 */
function buildXml(entries: SitemapEntry[]): string {
  const lastmod = new Date().toISOString().split('T')[0];

  const urls = entries
    .map((entry) => {
      const loc = escapeXml(`${SITE_URL}${entry.path}`);
      return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        `    <lastmod>${entry.lastmod ?? lastmod}</lastmod>`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority.toFixed(1)}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');
}

/**
 * Devuelve el sitemap, reutilizando la caché si sigue vigente.
 *
 * Sin caché, cada visita de un rastreador dispararía llamadas a la API
 * externa. Los bots piden el sitemap con frecuencia, así que es un punto
 * caliente clásico.
 */
export async function getSitemapXml(): Promise<string> {
  if (cache && Date.now() - cache.generatedAt < CACHE_TTL_MS) {
    return cache.xml;
  }

  const entries = staticEntries();
  const catalog = await fetchCatalogSize();

  if (catalog) {
    // Páginas del listado.
    for (let page = 1; page <= catalog.pages; page++) {
      entries.push({
        path: `/characters/page/${page}`,
        changefreq: 'weekly',
        // La primera página del listado es la más valiosa; las siguientes
        // pierden peso a medida que se alejan de la entrada.
        priority: page === 1 ? 0.9 : 0.6,
      });
    }

    // Fichas individuales.
    //
    // Se asume que los IDs son consecutivos de 1 a `count`, algo que la API de
    // Rick and Morty cumple. Con una fuente de datos propia habría que
    // recorrer los IDs reales: inventar URLs que devuelven 404 desperdicia
    // presupuesto de rastreo.
    for (let id = 1; id <= catalog.count; id++) {
      entries.push({
        path: `/character/${id}`,
        changefreq: 'monthly',
        priority: 0.7,
      });
    }
  }

  const xml = buildXml(entries);
  cache = { xml, generatedAt: Date.now() };

  return xml;
}
