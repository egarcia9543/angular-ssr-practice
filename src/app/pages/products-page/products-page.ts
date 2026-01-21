import { Component } from '@angular/core';
import { ProductCard } from "../../components/product-card/product-card";

@Component({
  selector: 'app-products-page',
  imports: [ProductCard],
  templateUrl: './products-page.html',
  styleUrl: './products-page.css',
})
export class ProductsPage {

}
