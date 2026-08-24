import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { tap } from 'rxjs';
import { breadcrumbSchema, characterSchema } from '../../config/schema-org';
import { Characters } from '../../interfaces/characters.interface';
import { CharactersService } from '../../services/characters-service';
import { Seo } from '../../services/seo';

@Component({
  selector: 'app-character-details',
  imports: [],
  templateUrl: './character-details.html',
  styleUrl: './character-details.css',
})
export class CharacterDetails implements OnInit {
  private readonly _characterService = inject(CharactersService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _seo = inject(Seo);

  public character = signal<Characters | null>(null);

  ngOnInit(): void {
    const id = this._route.snapshot.paramMap.get('id');
    if (!id) return;

    this.loadCharacter(id);
  }

  public loadCharacter(id: string) {
    this._characterService.loadCharacterById(id)
      .pipe(
        tap(character => this._applySeo(character))
      )
      .subscribe(response => {
        this.character.set(response);
      });
  }

  /**
   * Aplica el SEO de la ficha con los datos ya resueltos.
   *
   * Se hace dentro de `tap`, es decir en cuanto llega la respuesta y ANTES de
   * pintar. Con SSR esto es lo que permite que el HTML que sale del servidor
   * ya lleve el título y las metas correctas: si se aplicaran después del
   * primer render, el rastreador vería los valores por defecto.
   */
  private _applySeo(character: Characters): void {
    const description = `${character.name} es un personaje ${character.species.toLowerCase()} de Rick and Morty. Origen: ${character.origin.name}. Estado: ${character.status}.`;

    this._seo.update({
      title: character.name,
      description,
      path: `/character/${character.id}`,
      image: character.image,
      // `profile` describe mejor la ficha de una entidad concreta que el
      // genérico `website`, y es el tipo que Open Graph define para perfiles.
      type: 'profile',
    });

    // Datos estructurados: describen a la entidad para el buscador.
    this._seo.setJsonLd('ld-character', characterSchema(character));

    // Migas de pan: le dan a Google la jerarquía del sitio, que puede sustituir
    // a la URL cruda en el resultado de búsqueda.
    this._seo.setJsonLd(
      'ld-breadcrumb',
      breadcrumbSchema([
        { name: 'Inicio', path: '/about' },
        { name: 'Personajes', path: '/characters/page/1' },
        { name: character.name, path: `/character/${character.id}` },
      ]),
    );
  }
}
