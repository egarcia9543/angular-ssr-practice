import { Component, inject, OnInit, signal } from '@angular/core';
import { Characters } from '../../interfaces/characters.interface';
import { CharactersService } from '../../services/characters-service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-character-details',
  imports: [],
  templateUrl: './character-details.html',
  styleUrl: './character-details.css',
})
export class CharacterDetails implements OnInit {
  private _characterService = inject(CharactersService);
  private _route = inject(ActivatedRoute);

  public character = signal<Characters | null>(null);

  ngOnInit(): void {
    const id = this._route.snapshot.paramMap.get('id');
    if (!id) return;

    this.loadCharacter(id);
  }

  public loadCharacter(id: string) {
    this._characterService.loadCharacterById(id).subscribe(response => {
      this.character.set(response);
    });
  }
}
