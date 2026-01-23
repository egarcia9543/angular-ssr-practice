import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Product } from '../interfaces/products.interface';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private http = inject(HttpClient);

  public loadPage(page: number, limit: number = 10): Observable<Product[]> {
    return this.http.get<Product[]>(`https://api.escuelajs.co/api/v1/products?limit=${limit}&offset=${page*10}`);
  }
}
