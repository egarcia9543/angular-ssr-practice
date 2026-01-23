import { Component, input } from '@angular/core';
import { Characters } from '../../interfaces/characters.interface';

@Component({
  selector: 'app-character-card',
  imports: [],
  templateUrl: './character-card.html',
})
export class CharacterCard {
  character = input.required<Characters>();
}
