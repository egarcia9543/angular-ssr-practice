# Laboratorio Angular — Guía de estudio

Documentación de los temas repasados usando este proyecto como banco de pruebas.
Cada tema tiene su propio archivo con tres secciones:

1. **Teoría** — el modelo mental y el *por qué*, no solo la sintaxis.
2. **Práctica en este proyecto** — dónde vive el concepto en el código, con enlaces a los archivos reales.
3. **Preguntas de assessment** — lo que suelen preguntar y la respuesta que un entrevistador espera.

---

## Índice de temas

| # | Tema | Archivo | Estado |
|---|------|---------|--------|
| 01 | SEO técnico — meta tags, noindex, robots.txt, sitemaps, schema.org | [01-seo-tecnico.md](./01-seo-tecnico.md) | ✅ Implementado y verificado |
| 02 | Accesibilidad y estándares ARIA | [02-accesibilidad-aria.md](./02-accesibilidad-aria.md) | 📖 Teoría lista · práctica pendiente |

---

## Sobre el laboratorio

Aplicación Angular 20.3 con Server-Side Rendering que consume la
[Rick and Morty API](https://rickandmortyapi.com/). Se construyó específicamente
para practicar conceptos de Angular moderno sobre código real en lugar de ejemplos aislados.

### Stack

| Pieza | Versión / detalle |
|-------|-------------------|
| Angular | 20.3 (standalone components, signals) |
| SSR | `@angular/ssr` 20.3 + Express 5 |
| Estilos | Tailwind CSS 3.4 |
| Testing | Karma + Jasmine |
| Lenguaje | TypeScript 5.9 |
| Deploy | Netlify (`@netlify/angular-runtime`) |

### Mapa del código

```
src/app/
├── app.routes.ts              → rutas del cliente (lazy loading con loadComponent)
├── app.routes.server.ts       → render mode por ruta (SSR / prerender / CSR)
├── app.config.ts              → providers de la app (cliente)
├── app.config.server.ts       → providers del servidor
├── components/                → UI reutilizable (navbar, card, skeleton, empty state)
├── pages/                     → vistas enrutadas
├── services/                  → acceso a datos y utilidades (HttpClient, meta tags)
├── interfaces/                → contratos de tipos de la API
└── enums/                     → constantes de URLs y títulos
```

### Comandos

```bash
npm start                      # dev server en http://localhost:4200
npm run build                  # build de producción (browser + server)
npm run serve:ssr:ssr-project  # servir el build SSR con Node
npm test                       # tests unitarios con Karma
```
