import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'about',
    loadComponent: () => import('./pages/about-page/about-page').then(m => m.AboutPage)
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact-page/contact-page').then(m => m.ContactPage)
  },
  {
    path: 'pricing',
    loadComponent: () => import('./pages/pricing-page/pricing-page').then(m => m.PricingPage)
  },
  {
    path: '**',
    redirectTo: 'about'
  }
];
