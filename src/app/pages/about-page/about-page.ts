import { Component, inject, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { MetatagsGenerator } from '../../services/metatags-generator';

@Component({
  selector: 'app-about-page',
  imports: [],
  templateUrl: './about-page.html',
  styleUrl: './about-page.css',
})
export class AboutPage implements OnInit {
  private title = inject(Title);
  private _metatagSrv = inject(MetatagsGenerator);

  ngOnInit(): void {
    this.title.setTitle(this._metatagSrv.getPageTitle());
  }
}
