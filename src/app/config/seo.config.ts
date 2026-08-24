/**
 * Configuración central de SEO.
 *
 * Tener las constantes del sitio en un solo lugar evita el problema más común
 * del SEO técnico en SPAs: canonicals, Open Graph y sitemap apuntando a
 * dominios distintos (o a `localhost`) según dónde se generó cada uno.
 */

/**
 * Origen público del sitio, SIN barra final.
 *
 * Debe ser el dominio canónico real (el que quieres que Google indexe).
 * En un proyecto real esto viene de una variable de entorno por ambiente,
 * porque staging y producción NUNCA deben compartir canonical.
 */
export const SITE_URL = 'https://angular-ssr-practice.netlify.app';

export const SITE_NAME = 'Rick & Morty Explorer';

export const SITE_DESCRIPTION =
  'Explora los personajes del universo de Rick and Morty: biografía, especie, origen y estado de cada uno.';

/**
 * Imagen por defecto para Open Graph / Twitter Cards.
 *
 * Requisitos que Facebook, LinkedIn, WhatsApp y X esperan:
 * 1200x630 px, formato PNG o JPG, y URL ABSOLUTA (los crawlers sociales
 * no resuelven rutas relativas).
 *
 * NOTA DEL LABORATORIO: el archivo `public/og-default.png` todavía no existe.
 * Hasta que se añada, los enlaces compartidos no mostrarán imagen.
 */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

/** Idioma del contenido, en formato BCP 47. Debe coincidir con `<html lang>`. */
export const SITE_LOCALE = 'es_CO';

/**
 * Convierte una ruta interna en URL absoluta.
 *
 * Canonicals y Open Graph exigen URLs absolutas, así que centralizamos la
 * concatenación para no repetir el patrón (y no equivocarnos con las barras).
 */
export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Metadatos de las páginas estáticas.
 *
 * Reemplaza al antiguo `MetatagsGenerator`, que solo devolvía un título
 * mediante un `switch` sobre `Router.url`. Aquí cada página declara el paquete
 * SEO completo, y añadir una página nueva es añadir una entrada — no un `case`.
 */
export interface StaticPageSeo {
  readonly path: string;
  readonly title: string;
  readonly description: string;
}

export const PAGE_SEO = {
  about: {
    path: '/about',
    title: 'Sobre el proyecto',
    description:
      'Laboratorio de Angular con Server-Side Rendering construido para practicar SEO técnico: canonicals, robots, sitemaps y datos estructurados.',
  },
  contact: {
    path: '/contact',
    title: 'Contacto',
    description:
      'Ponte en contacto con el equipo detrás de este laboratorio de Angular SSR. Respondemos dudas sobre renderizado en servidor y SEO técnico.',
  },
  pricing: {
    path: '/pricing',
    title: 'Planes y precios',
    description:
      'Compara los planes disponibles del Rick & Morty Explorer y elige el que se ajusta a tu volumen de consultas.',
  },
} as const satisfies Record<string, StaticPageSeo>;
