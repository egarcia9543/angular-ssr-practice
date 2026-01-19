import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { MetatagsGenerator } from '../../services/metatags-generator';

@Component({
  selector: 'app-pricing-page',
  imports: [],
  templateUrl: './pricing-page.html',
  styleUrl: './pricing-page.css',
})
export class PricingPage {
  private title = inject(Title);
  private _metatagSrv = inject(MetatagsGenerator);

  ngOnInit(): void {
    this.title.setTitle(this._metatagSrv.getPageTitle());
  }
}
