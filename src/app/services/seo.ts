import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import {
  absoluteUrl,
  DEFAULT_OG_IMAGE,
  SITE_LOCALE,
  SITE_NAME,
} from '../config/seo.config';

/**
 * Directivas del meta robots.
 *
 * - `index, follow`     → por defecto. Indexa la página y sigue sus enlaces.
 * - `noindex, follow`   → NO la indexes, pero sí recorre sus enlaces.
 *                         Es la opción correcta para páginas que existen para
 *                         el usuario pero no aportan valor en buscadores
 *                         (404, "gracias por tu compra", resultados de filtros).
 * - `noindex, nofollow` → aísla la página por completo. Reservado para zonas
 *                         privadas o entornos de staging.
 */
export type RobotsDirective =
  | 'index, follow'
  | 'noindex, follow'
  | 'noindex, nofollow';

export interface SeoData {
  /** Título de la pestaña y del resultado de búsqueda. Ideal: 50-60 caracteres. */
  title: string;
  /** Resumen mostrado bajo el título en la SERP. Ideal: 120-160 caracteres. */
  description: string;
  /** Ruta interna de la página, ej. `/character/1`. Se convierte a absoluta. */
  path: string;
  /** Imagen para redes sociales. Absoluta. Cae al valor por defecto si se omite. */
  image?: string;
  /** Tipo de Open Graph. `website` para páginas generales, `article` para contenido. */
  type?: 'website' | 'article' | 'profile';
  /** Instrucción para los rastreadores. Por defecto indexable. */
  robots?: RobotsDirective;
}

/**
 * Punto único de control de todo el SEO on-page.
 *
 * ¿Por qué un servicio y no `Meta`/`Title` sueltos en cada componente?
 *
 * 1. **Consistencia**: garantiza que `title`, `og:title` y `twitter:title`
 *    nunca se desincronicen entre sí.
 * 2. **Limpieza entre navegaciones**: en una SPA el `<head>` NO se recrea al
 *    cambiar de ruta. Si la ficha de un personaje pone `og:image` y luego
 *    navegas a `/about`, esa imagen se queda pegada salvo que alguien la
 *    borre explícitamente. Este servicio reescribe el paquete completo en
 *    cada llamada, así que ese arrastre no puede ocurrir.
 * 3. **Compatibilidad con SSR**: manipula el DOM a través del token `DOCUMENT`
 *    en vez del `document` global, que no existe en Node.
 */
@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly _doc = inject(DOCUMENT);
  private readonly _title = inject(Title);
  private readonly _meta = inject(Meta);

  /** Etiquetas opcionales que deben eliminarse si la página nueva no las define. */
  private static readonly OPTIONAL_TAGS = [
    'property="article:published_time"',
    'property="og:image:alt"',
  ];

  /** Marca los bloques JSON-LD que no deben borrarse al cambiar de ruta. */
  private static readonly PERSISTENT_ATTR = 'data-seo-persistent';

  /**
   * Aplica el paquete SEO completo de una página.
   *
   * Llamar a este método es la única forma soportada de tocar el `<head>`;
   * si un componente escribe metas por su cuenta, se pierde la garantía de
   * limpieza descrita arriba.
   */
  public update(data: SeoData): void {
    const url = absoluteUrl(data.path);
    const image = data.image ?? DEFAULT_OG_IMAGE;
    const type = data.type ?? 'website';
    const robots = data.robots ?? 'index, follow';

    // El título completo incluye la marca; el og:title no, porque las tarjetas
    // sociales ya muestran el nombre del sitio por separado.
    this._title.setTitle(`${data.title} | ${SITE_NAME}`);

    this._meta.updateTag({ name: 'description', content: data.description });
    this._meta.updateTag({ name: 'robots', content: robots });

    // Open Graph usa `property`, NO `name`. Es el error más frecuente al usar
    // el servicio `Meta` de Angular: `updateTag({ name: 'og:title' })` genera
    // `<meta name="og:title">`, que los rastreadores de Facebook, LinkedIn y
    // WhatsApp ignoran por completo.
    this._meta.updateTag({ property: 'og:title', content: data.title });
    this._meta.updateTag({ property: 'og:description', content: data.description });
    this._meta.updateTag({ property: 'og:url', content: url });
    this._meta.updateTag({ property: 'og:image', content: image });
    this._meta.updateTag({ property: 'og:type', content: type });
    this._meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this._meta.updateTag({ property: 'og:locale', content: SITE_LOCALE });

    // Twitter/X sí usa `name`. La inconsistencia es del estándar, no de Angular.
    this._meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this._meta.updateTag({ name: 'twitter:title', content: data.title });
    this._meta.updateTag({ name: 'twitter:description', content: data.description });
    this._meta.updateTag({ name: 'twitter:image', content: image });

    this.setCanonical(url);
    this._clearStaleTags();
    this._clearPageJsonLd();
  }

  /**
   * Declara la URL canónica de la página.
   *
   * Le dice al buscador cuál es la versión "oficial" de un contenido accesible
   * desde varias URLs (`?utm_source=…`, `/producto?color=rojo`, con y sin barra
   * final). Sin canonical, esas variantes compiten entre sí y el buscador
   * reparte la autoridad en lugar de concentrarla.
   *
   * `Meta` no gestiona elementos `<link>`, así que hay que tocar el DOM. Se usa
   * `DOCUMENT` para que funcione igual en el servidor durante el SSR.
   */
  public setCanonical(url: string): void {
    const head = this._doc.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!link) {
      link = this._doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }

    link.setAttribute('href', url);
  }

  /**
   * Cambia solo la directiva robots, sin tocar el resto del paquete.
   *
   * Útil cuando el estado de indexación depende de datos que llegan después
   * del render inicial (por ejemplo, una búsqueda que resultó vacía).
   */
  public setRobots(value: RobotsDirective): void {
    this._meta.updateTag({ name: 'robots', content: value });
  }

  /**
   * Inserta o reemplaza un bloque de datos estructurados JSON-LD.
   *
   * Cada bloque se identifica con un `id` para poder sustituirlo en la
   * siguiente navegación en lugar de acumular scripts duplicados —
   * un `<head>` con tres `BreadcrumbList` distintos es un error de validación.
   *
   * @param id         Identificador estable del bloque, ej. `'ld-breadcrumb'`.
   * @param schema     Objeto plano que se serializa a JSON-LD.
   * @param persistent Si es `true`, el bloque sobrevive a los cambios de ruta.
   *                   Reservado para entidades de sitio (`WebSite`,
   *                   `Organization`) que aplican a todas las páginas.
   */
  public setJsonLd(id: string, schema: object, persistent = false): void {
    const head = this._doc.head;
    let script = head.querySelector<HTMLScriptElement>(`script[id="${id}"]`);

    if (!script) {
      script = this._doc.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('id', id);
      if (persistent) {
        script.setAttribute(Seo.PERSISTENT_ATTR, '');
      }
      head.appendChild(script);
    }

    script.textContent = this._serializeJsonLd(schema);
  }

  /** Elimina un bloque JSON-LD que ya no aplica a la ruta actual. */
  public removeJsonLd(id: string): void {
    this._doc.head.querySelector(`script[id="${id}"]`)?.remove();
  }

  /**
   * Serializa el esquema escapando los caracteres que romperían el `<script>`.
   *
   * Si un dato de la API contuviera la cadena `</script>`, el navegador
   * cerraría el bloque JSON-LD ahí y trataría el resto como HTML: una vía
   * de inyección real. Escapar `<`, `>` y `&` como secuencias unicode mantiene
   * el JSON válido y neutraliza el vector.
   */
  private _serializeJsonLd(schema: object): string {
    return JSON.stringify(schema)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
  }

  /**
   * Borra etiquetas opcionales que la página anterior pudo haber dejado.
   *
   * Solo aplica en navegación del lado del cliente: en SSR cada petición
   * arranca con un `<head>` limpio.
   */
  private _clearStaleTags(): void {
    for (const selector of Seo.OPTIONAL_TAGS) {
      this._meta.removeTag(selector);
    }
  }

  /**
   * Elimina los bloques JSON-LD de la página anterior.
   *
   * Sin esta limpieza, navegar de la ficha de un personaje a la de contacto
   * dejaría en el `<head>` un `Person` que ya no corresponde al contenido
   * visible — exactamente el tipo de desajuste que Google penaliza como
   * structured data engañoso.
   *
   * Se ejecuta desde `update()`, es decir ANTES de que la página nueva
   * registre los suyos.
   */
  private _clearPageJsonLd(): void {
    const scripts = this._doc.head.querySelectorAll(
      `script[type="application/ld+json"]:not([${Seo.PERSISTENT_ATTR}])`,
    );

    scripts.forEach((script) => script.remove());
  }
}
