import { ApplicationRef, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ProductsSkeleton } from "../../components/products-skeleton/products-skeleton";
import { ProductsService } from '../../services/products-service';
import { Product } from '../../interfaces/products.interface';
import { ProductCard } from "../../components/product-card/product-card";
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, tap } from 'rxjs';
import { Title } from '@angular/platform-browser';

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
  private _route = inject(ActivatedRoute);
  private _router = inject(Router);
  private _title = inject(Title);

  private $appState = this.appRef.isStable.subscribe((isStable) => {
    console.log('Application is stable:', isStable);
  });

  public productsList = signal<Product[]>([]);
  public currentPage = toSignal(
    this._route.queryParamMap.pipe(
      map(params => params.get('page') ?? '1'),
      map(page => isNaN(Number(page)) ? 1 : +page),
      map(page => Math.max(1, page))
    )
  )

  ngOnInit(): void {
    console.log('Current Page:', this.currentPage());
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
    const nextPageToLoad = this.currentPage()! + nextPage;

    this._productService.loadPage(nextPageToLoad)
    .pipe(
      tap(() => {
        this._router.navigate([], {
          queryParams: { page: nextPageToLoad },
        });
      }),
      tap(() => {
        this._title.setTitle(`Products - Page ${nextPageToLoad}`);
      })
    )

    .subscribe(
      products => {
        this.productsList.set(products);
      }
    )
  }

  ngOnDestroy(): void {
    this.$appState.unsubscribe();
  }
}
