import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AppUrls, PageTitles } from '../enums/urls.enum';

@Injectable({
  providedIn: 'root',
})
export class MetatagsGenerator {
  private _route = inject(Router);

  public getPageTitle(): string {
    const route = this._route.url;

    switch (route) {
      case AppUrls.ABOUT:
        return PageTitles.ABOUT;
      case AppUrls.CONTACT:
        return PageTitles.CONTACT;
      case AppUrls.PRICING:
        return PageTitles.PRICING;
      default:
        return 'SSR Angular Application';
    }
  }
}
