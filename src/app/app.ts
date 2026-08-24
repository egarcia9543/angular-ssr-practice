import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from "./components/navbar/navbar";
import { websiteSchema } from './config/schema-org';
import { Seo } from './services/seo';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly _seo = inject(Seo);

  ngOnInit(): void {
    /**
     * La entidad `WebSite` describe al sitio completo, no a una página, así
     * que se declara una sola vez en el componente raíz y se marca como
     * persistente para que sobreviva a los cambios de ruta.
     *
     * Ponerla en cada página sería redundante y obligaría a reescribir el
     * mismo bloque en cada `ngOnInit`.
     */
    this._seo.setJsonLd('ld-website', websiteSchema(), true);
  }
}
