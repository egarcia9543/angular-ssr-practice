import { ApplicationRef, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ProductsSkeleton } from "../../components/products-skeleton/products-skeleton";
import { ProductsService } from '../../services/products-service';
import { Product } from '../../interfaces/products.interface';
import { ProductCard } from "../../components/product-card/product-card";

@Component({
  selector: 'app-products-page',
  imports: [ProductsSkeleton, ProductCard],
  templateUrl: './products-page.html',
  styleUrl: './products-page.css',
})
export class ProductsPage implements OnInit, OnDestroy {
  public isLoading = signal(true);
  private appRef = inject(ApplicationRef);
  private _productService = inject(ProductsService);

  private $appState = this.appRef.isStable.subscribe((isStable) => {
    console.log('Application is stable:', isStable);
  });

  public productsList = signal<Product[]>([]);

  ngOnInit(): void {
    /**
     * Con SSR, el callback se ejecuta en el lado del
     * servidor, de esta forma, el cliente recibe directamente
     * el estado final de la señal sin necesidad de esperar
     * a que se ejecute el setTimeout en el cliente.
     */

    /**
     * Este callback se ejecuta una vez que la aplicación
     * se encuentra estable
     */
    // setTimeout(() => {
    //   this.isLoading.set(false);
    // }, 5000);

    this.getProducts()
  }

  public getProducts(nextPage: number = 0) {
    this._productService.loadPage(nextPage).subscribe(
      products => {
        this.productsList.set(products);
      }
    )
  }

  ngOnDestroy(): void {
    this.$appState.unsubscribe();
  }
}
