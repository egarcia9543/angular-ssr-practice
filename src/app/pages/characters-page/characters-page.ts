import { ApplicationRef, Component, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ProductsSkeleton } from "../../components/products-skeleton/products-skeleton";
import { CharactersService } from '../../services/characters-service';
import { Characters } from '../../interfaces/characters.interface';
import { CharacterCard } from "../../components/character-card/character-card";
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, tap } from 'rxjs';
import { Title } from '@angular/platform-browser';

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
  private _title = inject(Title);

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
    console.log(nextPageToLoad)

    this._charactersService.loadPage(nextPageToLoad)
      .pipe(
        tap(() => {
          this._title.setTitle(`Characters - Page ${nextPageToLoad}`);
        })
      )

      .subscribe(
        characters => {
          this.charactersList.set(characters.results);
          this.totalPages.set(characters.info.pages);
        }
      )
  }

  ngOnDestroy(): void {
    this.$appState.unsubscribe();
  }
}
