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
    /**
     * Ruta comodín.
     *
     * Renderiza una página 404 real en lugar de redirigir a `/about`.
     * Redirigir devolvería 200 OK para URLs inexistentes (soft 404), lo que
     * hace que el buscador indexe basura. El código 404 se declara en
     * `app.routes.server.ts`.
     */
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFound)
  }
];
