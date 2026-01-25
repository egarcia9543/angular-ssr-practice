import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server
  },
  {
    path: 'characters/page/:page',
    renderMode: RenderMode.Prerender,
    getPrerenderParams() {
      const pages = Array.from({ length: 5 }, (_, i) => ({ page: (i + 1).toString() }));
      return Promise.resolve(pages);
    },
  },
  {
    path: 'character/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams() {
      const ids = Array.from({ length: 5 }, (_, i) => ({ id: (i + 1).toString() }));
      return Promise.resolve(ids);
    }
  }
]
