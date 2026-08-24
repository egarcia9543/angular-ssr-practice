import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Seo } from '../../services/seo';

/**
 * Página 404.
 *
 * Antes, la ruta comodín hacía `redirectTo: 'about'`. Eso produce un
 * **soft 404**: el servidor responde 200 OK y devuelve contenido válido para
 * una URL que en realidad no existe. Es un antipatrón documentado por Google
 * porque contamina el índice con URLs inventadas y desperdicia presupuesto de
 * rastreo.
 *
 * El tratamiento correcto combina tres señales que deben coincidir:
 *   1. Código de estado HTTP 404 — se configura en `app.routes.server.ts`.
 *   2. `<meta name="robots" content="noindex, follow">` — refuerzo explícito.
 *   3. Contenido útil para el usuario, con enlaces de vuelta al sitio.
 *
 * Se usa `follow` y no `nofollow` a propósito: no queremos indexar esta
 * página, pero sí que el rastreador siga los enlaces de recuperación y
 * redescubra el contenido válido.
 */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.html',
})
export class NotFound implements OnInit {
  private readonly _seo = inject(Seo);

  ngOnInit(): void {
    this._seo.update({
      title: 'Página no encontrada',
      description: 'La página que buscas no existe o fue movida.',
      path: '/404',
      robots: 'noindex, follow',
    });
  }
}
