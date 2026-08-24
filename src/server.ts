import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { getSitemapXml } from './sitemap';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * sitemap.xml generado en tiempo de ejecución.
 *
 * Va declarado ANTES del middleware que renderiza Angular: Express evalúa los
 * handlers en orden, y el catch-all de más abajo captura cualquier ruta que
 * llegue hasta él. Si este bloque estuviera después, `/sitemap.xml` intentaría
 * resolverse como una ruta de la aplicación y devolvería HTML.
 *
 * La cabecera `Content-Type: application/xml` es obligatoria: servido como
 * `text/html`, el rastreador descarta el archivo sin procesarlo.
 */
app.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const xml = await getSitemapXml();

    res.header('Content-Type', 'application/xml; charset=utf-8');
    // Una hora de caché en CDN. El sitemap cambia poco y los bots lo piden
    // seguido, así que conviene no regenerarlo en cada visita.
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (error) {
    next(error);
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
    setHeaders(res, path) {
      // El `maxAge` de un año es correcto para los bundles, que llevan hash en
      // el nombre. Para `robots.txt` sería peligroso: si se publica un
      // `Disallow` por error, la caché impediría corregirlo durante un año.
      if (path.endsWith('robots.txt')) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    },
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
