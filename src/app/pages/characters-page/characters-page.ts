import { ApplicationRef, Component, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ProductsSkeleton } from "../../components/products-skeleton/products-skeleton";
import { CharactersService } from '../../services/characters-service';
import { Characters } from '../../interfaces/characters.interface';
import { CharacterCard } from "../../components/character-card/character-card";
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, tap } from 'rxjs';
import { characterListSchema } from '../../config/schema-org';
import { Seo } from '../../services/seo';

@Component({
  selector: 'app-characters-page',
  imports: [ProductsSkeleton, CharacterCard, RouterLink],
  templateUrl: './characters-page.html',
})
export class CharactersPage implements OnInit, OnDestroy {
  public isLoading = signal(true);
  private appRef = inject(ApplicationRef);
  private _charactersService = inject(CharactersService);
  private _route = inject(ActivatedRoute);
  private _router = inject(Router);
  private _seo = inject(Seo);

  private $appState = this.appRef.isStable.subscribe((isStable) => {
    console.log('Application is stable:', isStable);
  });

  public charactersList = signal<Characters[]>([]);
  public currentPage = toSignal(
    this._route.params.pipe(
      map(params => params['page'] ?? '1'),
      map(page => isNaN(Number(page)) ? 1 : +page),
      map(page => Math.max(1, page))
    )
  );
  public totalPages = signal(0);

  public loadOnPageReady = effect(() => { this.getCharacters() });


  ngOnInit(): void {
    console.log('Current Page:', this.currentPage());
    /**
     * Con SSR, el callback se ejecuta en el lado del
     * servidor, de esta forma, el cliente recibe directamente
     * el estado final de la señal sin necesidad de esperar
     * a que se ejecute el setTimeout en el cliente.
     */

    /**
     * Este callback se ejecuta una vez que la aplicación
     * se encuentra estable
     */
    // setTimeout(() => {
    //   this.isLoading.set(false);
    // }, 5000);

    // this.getCharacters()
  }

  public getCharacters() {
    const nextPageToLoad = this.currentPage()!;

    this._charactersService.loadPage(nextPageToLoad)
      .pipe(
        tap(response => this._applySeo(nextPageToLoad, response.results))
      )
      .subscribe(
        characters => {
          this.charactersList.set(characters.results);
          this.totalPages.set(characters.info.pages);
        }
      )
  }

  /**
   * SEO de un listado paginado.
   *
   * Dos decisiones que suelen hacerse mal:
   *
   * 1. **Canonical auto-referencial.** Cada página apunta a sí misma
   *    (`/characters/page/3` → `/characters/page/3`), NO a la página 1.
   *    Canonicalizar todo hacia la primera página le dice a Google que las
   *    demás son duplicados, y deja de rastrearlas: se pierden del índice los
   *    personajes que solo aparecen ahí.
   *
   * 2. **Sin `rel="prev"` / `rel="next"`.** Google dejó de usarlos en 2019 y
   *    lo anunció públicamente. Mantenerlos no hace daño, pero no aporta nada
   *    en Google; la señal que sí cuenta hoy es que las páginas estén
   *    enlazadas entre sí con `<a href>` rastreables.
   *
   * El título incluye el número de página para que los resultados de la SERP
   * no se vean como duplicados entre sí.
   */
  private _applySeo(page: number, characters: Characters[]): void {
    this._seo.update({
      title: page === 1 ? 'Personajes' : `Personajes — página ${page}`,
      description:
        page === 1
          ? 'Explora el catálogo completo de personajes de Rick and Morty con su especie, origen y estado.'
          : `Página ${page} del catálogo de personajes de Rick and Morty.`,
      path: `/characters/page/${page}`,
    });

    this._seo.setJsonLd('ld-character-list', characterListSchema(characters, page));
  }

  ngOnDestroy(): void {
    this.$appState.unsubscribe();
  }
}
