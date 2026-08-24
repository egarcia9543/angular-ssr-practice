/**
 * Constructores de datos estructurados schema.org (formato JSON-LD).
 *
 * Los datos estructurados son un vocabulario compartido — definido en
 * https://schema.org y consumido por Google, Bing, Pinterest y Yandex — que
 * traduce el contenido visible de una página a entidades que una máquina puede
 * interpretar. El HTML dice "hay un h2 con el texto Rick Sanchez"; el JSON-LD
 * dice "esta página describe a una persona llamada Rick Sanchez, de especie
 * humana, cuya imagen es esta".
 *
 * Se usa JSON-LD y no Microdata/RDFa porque es el formato que Google
 * recomienda: vive aislado en un `<script>` del `<head>`, sin ensuciar el
 * marcado ni acoplarse a la estructura visual de la plantilla.
 *
 * Regla de oro: el structured data debe describir contenido REALMENTE visible
 * en la página. Declarar datos que el usuario no puede ver es motivo de acción
 * manual por spam en la Search Console.
 */

import { Characters } from '../interfaces/characters.interface';
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './seo.config';

/** Entidad de Wikidata para "personaje ficticio". */
const WIKIDATA_FICTIONAL_CHARACTER = 'https://www.wikidata.org/wiki/Q95074';

/**
 * Identidad global del sitio.
 *
 * Va en todas las páginas: le permite al buscador entender que las distintas
 * URLs pertenecen a un mismo sitio y habilita el nombre de marca en la SERP.
 */
export function websiteSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: 'es',
  };
}

/**
 * Ruta de migas de pan.
 *
 * Google la usa para reemplazar la URL cruda del resultado por una jerarquía
 * legible (`Inicio > Personajes > Rick Sanchez`), lo que mide mejor en móvil
 * y sube el CTR. Debe reflejar la jerarquía del sitio, no el historial de
 * navegación del usuario.
 */
export function breadcrumbSchema(
  trail: ReadonlyArray<{ name: string; path: string }>,
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/**
 * Ficha de un personaje.
 *
 * Se modela como `Person` porque es el tipo que mejor encaja con los atributos
 * disponibles (nombre, imagen, género). `additionalType` apunta a Wikidata para
 * matizar que se trata de un personaje ficticio: schema.org no tiene un tipo
 * propio para eso, y esa referencia externa es la forma estándar de precisar
 * una entidad sin salirse del vocabulario.
 */
export function characterSchema(character: Characters): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    additionalType: WIKIDATA_FICTIONAL_CHARACTER,
    '@id': absoluteUrl(`/character/${character.id}#person`),
    name: character.name,
    image: character.image,
    url: absoluteUrl(`/character/${character.id}`),
    gender: character.gender,
    description: `${character.name} es un personaje de especie ${character.species} originario de ${character.origin.name}. Estado actual: ${character.status}.`,
    // `additionalProperty` es el mecanismo estándar para atributos que el
    // vocabulario no contempla — aquí, especie y estado vital.
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Especie',
        value: character.species,
      },
      {
        '@type': 'PropertyValue',
        name: 'Estado',
        value: character.status,
      },
    ],
    homeLocation: {
      '@type': 'Place',
      name: character.location.name,
    },
    birthPlace: {
      '@type': 'Place',
      name: character.origin.name,
    },
    isPartOf: { '@id': `${SITE_URL}/#website` },
  };
}

/**
 * Listado paginado de personajes.
 *
 * `ItemList` le comunica al buscador que la página es un índice y cuál es el
 * orden de sus elementos. Se usa `itemListElement` con URLs en lugar de
 * duplicar la ficha completa de cada personaje: el detalle ya vive en su
 * propia página y repetirlo aquí sería contenido redundante.
 */
export function characterListSchema(
  characters: ReadonlyArray<Characters>,
  page: number,
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': absoluteUrl(`/characters/page/${page}#list`),
    name: `Personajes de Rick and Morty — página ${page}`,
    numberOfItems: characters.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: characters.map((character, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(`/character/${character.id}`),
      name: character.name,
    })),
  };
}

/**
 * Página de contacto.
 *
 * `ContactPoint` alimenta el panel de conocimiento de la marca. Solo tiene
 * sentido declararlo si los datos de contacto están efectivamente en la página.
 */
export function contactPageSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contacto',
    url: absoluteUrl('/contact'),
    mainEntity: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'hola@example.com',
        availableLanguage: ['Spanish', 'English'],
      },
    },
  };
}
