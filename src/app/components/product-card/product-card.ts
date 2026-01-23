import { Component, input } from '@angular/core';

@Component({
  selector: 'app-product-card',
  imports: [],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  productName = input.required<string>();
  productImageUrl = input.required<string>();
  productDescription = input.required<string>();
  productPrice = input.required<number>();

}
