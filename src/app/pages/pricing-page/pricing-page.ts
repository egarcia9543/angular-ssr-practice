import { Component, inject, PLATFORM_ID } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { MetatagsGenerator } from '../../services/metatags-generator';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-pricing-page',
  imports: [],
  templateUrl: './pricing-page.html',
  styleUrl: './pricing-page.css',
})
export class PricingPage {
  private title = inject(Title);
  private _metatagSrv = inject(MetatagsGenerator);

  private _platform = inject(PLATFORM_ID); // Give us info about the platform (server or client)

  ngOnInit(): void {
    /**
     * We must check if we are in the client or server side
     */

    console.log('Platform ID:', this._platform);

    // document.title =  "Titulo Hardcoded" - This line works only in the client side, there's no document in the server side

    if (isPlatformBrowser(this._platform)) {
      console.log('We are in the browser');
    }

    this.title.setTitle(this._metatagSrv.getPageTitle());
  }
}
