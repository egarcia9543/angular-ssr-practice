import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { MetatagsGenerator } from '../../services/metatags-generator';

@Component({
  selector: 'app-contact-page',
  imports: [],
  templateUrl: './contact-page.html',
  styleUrl: './contact-page.css',
})
export class ContactPage {
  private title = inject(Title);
  private _metatagSrv = inject(MetatagsGenerator);

  ngOnInit(): void {
    this.title.setTitle(this._metatagSrv.getPageTitle());
  }
}
