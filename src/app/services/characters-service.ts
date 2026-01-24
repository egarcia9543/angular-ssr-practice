import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Characters, CharactersResponse } from '../interfaces/characters.interface';

@Injectable({
  providedIn: 'root',
})
export class CharactersService {
  private http = inject(HttpClient);

  public loadPage(page: number): Observable<CharactersResponse> {
    return this.http.get<CharactersResponse>(`https://rickandmortyapi.com/api/character?page=${page}`);
  }

  public loadCharacterById(id: string): Observable<Characters> {
    return this.http.get<Characters>(`https://rickandmortyapi.com/api/character/${id}`);
  }
}
