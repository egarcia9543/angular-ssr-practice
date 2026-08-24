import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PAGE_SEO } from '../../config/seo.config';
import { Seo } from '../../services/seo';

@Component({
  selector: 'app-pricing-page',
  imports: [],
  templateUrl: './pricing-page.html',
  styleUrl: './pricing-page.css',
})
export class PricingPage implements OnInit {
  private readonly _seo = inject(Seo);
  private readonly _platform = inject(PLATFORM_ID);

  ngOnInit(): void {
    /**
     * El SEO se aplica SIEMPRE, en servidor y en cliente.
     *
     * Es un error frecuente envolver las meta tags en `isPlatformBrowser`:
     * el rastreador lee el HTML que emite el servidor, así que las etiquetas
     * generadas solo en el navegador llegan tarde o no llegan. Este servicio
     * usa el token `DOCUMENT`, que en SSR apunta al DOM sintético de
     * `platform-server`, por lo que funciona en ambos entornos.
     */
    this._seo.update(PAGE_SEO.pricing);

    if (isPlatformBrowser(this._platform)) {
      // Aquí sí corresponde la guarda: cualquier API exclusiva del navegador
      // (`window`, `localStorage`, `IntersectionObserver`) lanzaría en Node.
    }
  }
}
