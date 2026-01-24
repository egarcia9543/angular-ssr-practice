import { Component, inject, OnInit, signal } from '@angular/core';
import { Characters } from '../../interfaces/characters.interface';
import { CharactersService } from '../../services/characters-service';
import { ActivatedRoute } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { tap } from 'rxjs';

@Component({
  selector: 'app-character-details',
  imports: [],
  templateUrl: './character-details.html',
  styleUrl: './character-details.css',
})
export class CharacterDetails implements OnInit {
  private _characterService = inject(CharactersService);
  private _route = inject(ActivatedRoute);
  private _title = inject(Title);
  private _meta = inject(Meta);

  public character = signal<Characters | null>(null);

  ngOnInit(): void {
    const id = this._route.snapshot.paramMap.get('id');
    if (!id) return;

    this.loadCharacter(id);
  }

  public loadCharacter(id: string) {
    this._characterService.loadCharacterById(id)
    .pipe(
      tap(character => {
        this._title.setTitle(`${character.name}`);
        this._meta.updateTag({
          name: 'description', content: `Details about ${character.name}`
        });
        this._meta.updateTag({
          name: 'og:title', content: `${character.name}`
        });
        this._meta.updateTag({
          name: 'og:description', content: `Details about ${character.name}`
        });
        this._meta.updateTag({
          name: 'og:image', content: character.image
        });
      })
    )
    .subscribe(response => {
      this.character.set(response);
    });
  }
}
