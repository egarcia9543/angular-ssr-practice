import { Component, input } from '@angular/core';

@Component({
  selector: 'app-product-card',
  imports: [],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  productName = input<string>();
  productImageUrl = input<string>();
  productDescription = input<string>();
  productPrice = input<number>();

}
