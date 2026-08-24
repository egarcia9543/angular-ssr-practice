import { Component, inject, OnInit } from '@angular/core';
import { contactPageSchema } from '../../config/schema-org';
import { PAGE_SEO } from '../../config/seo.config';
import { Seo } from '../../services/seo';

@Component({
  selector: 'app-contact-page',
  imports: [],
  templateUrl: './contact-page.html',
  styleUrl: './contact-page.css',
})
export class ContactPage implements OnInit {
  private readonly _seo = inject(Seo);

  ngOnInit(): void {
    this._seo.update(PAGE_SEO.contact);
    this._seo.setJsonLd('ld-contact', contactPageSchema());
  }
}
