import { Component, input } from '@angular/core';
import { Characters } from '../../interfaces/characters.interface';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-character-card',
  imports: [RouterLink],
  templateUrl: './character-card.html',
})
export class CharacterCard {
  character = input.required<Characters>();
}
