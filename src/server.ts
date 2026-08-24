import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import { getContext } from '@netlify/angular-runtime/context.mjs';
import { getSitemapXml } from './sitemap';

const angularAppEngine = new AngularAppEngine();

/**
 * Handler que ejecuta Netlify para cada petición que no resuelve el CDN.
 *
 * A diferencia del servidor Express que genera Angular por defecto, aquí NO se
 * sirven archivos estáticos ni se abre un puerto: Netlify publica el contenido
 * de `dist/ssr-project/browser` en su CDN y solo invoca esta función cuando la
 * ruta pedida no corresponde a un archivo ya publicado. Por eso desaparecen
 * `express.static` y `app.listen`.
 *
 * El contrato también cambia: se trabaja con `Request`/`Response` de la
 * plataforma web en vez de con los objetos de Node.
 */
export async function netlifyAppEngineHandler(request: Request): Promise<Response> {
  const context = getContext();

  /**
   * sitemap.xml generado en tiempo de ejecución.
   *
   * Va ANTES de delegar en Angular por la misma razón que antes iba antes del
   * catch-all de Express: si la petición llegara al motor de Angular, `/sitemap.xml`
   * intentaría resolverse como una ruta de la aplicación y devolvería HTML.
   *
   * La cabecera `Content-Type: application/xml` es obligatoria: servido como
   * `text/html`, el rastreador descarta el archivo sin procesarlo.
   */
  const { pathname } = new URL(request.url);
  if (pathname === '/sitemap.xml') {
    const xml = await getSitemapXml();

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        // Una hora de caché en CDN. El sitemap cambia poco y los bots lo piden
        // seguido, así que conviene no regenerarlo en cada visita.
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  const result = await angularAppEngine.handle(request, context);
  return result || new Response('Not found', { status: 404 });
}

/**
 * The request handler used by the Angular CLI (dev-server and during build).
 */
export const reqHandler = createRequestHandler(netlifyAppEngineHandler);
