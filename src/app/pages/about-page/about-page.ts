import { Component, inject, OnInit } from '@angular/core';
import { PAGE_SEO } from '../../config/seo.config';
import { Seo } from '../../services/seo';

@Component({
  selector: 'app-about-page',
  imports: [],
  templateUrl: './about-page.html',
  styleUrl: './about-page.css',
})
export class AboutPage implements OnInit {
  private readonly _seo = inject(Seo);

  ngOnInit(): void {
    this._seo.update(PAGE_SEO.about);
  }
}
