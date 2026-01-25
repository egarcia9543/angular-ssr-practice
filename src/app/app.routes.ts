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
    path: 'characters/page/:page',
    loadComponent: () => import('./pages/characters-page/characters-page').then(m => m.CharactersPage)
  },
  {
    path: 'character/:id',
    loadComponent: () => import('./pages/character-details/character-details').then(m => m.CharacterDetails)
  },
  {
    path: '**',
    redirectTo: 'about'
  }
];
