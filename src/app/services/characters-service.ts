import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Characters, CharactersResponse } from '../interfaces/characters.interface';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private http = inject(HttpClient);

  public loadPage(page: number, limit: number = 10): Observable<CharactersResponse> {
    return this.http.get<CharactersResponse>(`https://rickandmortyapi.com/api/character`);
  }
}
