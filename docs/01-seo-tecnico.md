# 01 — SEO técnico en Angular

> **Temas:** meta tags · noindex · robots.txt · sitemaps XML · schema.org
> **Estado del laboratorio:** implementado y verificado sobre el build de producción.

---

## Parte 1 — Teoría

### 1.0 La pregunta de fondo: ¿cuándo el SEO es un estándar de software?

Antes de la sintaxis, la idea que un evaluador quiere escuchar: **el SEO técnico
no es marketing, es un contrato entre tu aplicación y un cliente automatizado.**

Tu aplicación tiene dos tipos de usuario:

| | Usuario humano | Rastreador (bot) |
|---|---|---|
| Ejecuta JavaScript | Sí, siempre | A veces, con retraso y presupuesto limitado |
| Entiende el diseño visual | Sí | No: solo lee el marcado |
| Tolera esperas | Unos segundos | Abandona rápido |
| Interpreta el significado | Por contexto | Solo lo que esté declarado explícitamente |

Todo el SEO técnico se deriva de esa tabla. El rastreador es un cliente con
capacidades reducidas, y las meta tags, el `robots.txt`, el sitemap y el
structured data son la **API que tu sitio le expone**.

Por eso el SEO cruza a "estándar de software" cuando aparece cualquiera de
estas condiciones:

1. **El contenido es público y la adquisición depende de búsqueda orgánica.**
   E-commerce, medios, marketplaces, documentación, SaaS con blog. Aquí el SEO
   es un requisito funcional, no un "nice to have".
2. **El contenido se genera dinámicamente.** Un catálogo con miles de URLs
   necesita sitemaps y canonicals *por diseño*: no se puede mantener a mano.
3. **La misma información es accesible desde varias URLs.** Filtros, ordenamientos,
   parámetros de campaña. Sin canonicals, el propio sitio compite consigo mismo.
4. **La aplicación es una SPA.** El renderizado en cliente es el enemigo natural
   del rastreo, y por eso Angular ofrece SSR.

Y **cuándo NO importa**: paneles administrativos, aplicaciones internas,
herramientas detrás de login, backoffices. Ahí lo correcto es lo opuesto —
`noindex, nofollow` y `Disallow: /` — y gastar esfuerzo en optimizar SEO sería
trabajo desperdiciado. Saber decir esto es tan valioso como saber implementarlo.

> **El costo de equivocarse es asimétrico.** Un canonical mal puesto puede sacar
> miles de URLs del índice en días; recuperarlas toma semanas o meses. Por eso
> el SEO técnico se trata como cualquier otro contrato: se versiona, se revisa
> en el pull request y se verifica automáticamente.

---

### 1.1 El problema específico de las SPAs

Una aplicación Angular sin SSR entrega esto al rastreador:

```html
<body>
  <app-root></app-root>
</body>
```

Cero contenido. Google *sí* ejecuta JavaScript, pero lo hace en una segunda
pasada diferida y con presupuesto limitado. Bing, los rastreadores de IA y —
sobre todo — **los previsualizadores de enlaces de WhatsApp, LinkedIn, Slack y
X no ejecutan JavaScript en absoluto**. Ese último punto suele ser el argumento
decisivo en una discusión de negocio: sin SSR, compartir un enlace de tu
producto muestra una tarjeta vacía.

**Por eso SSR es el prerrequisito de todo lo demás en este documento.** Las
meta tags dinámicas solo sirven si ya están en el HTML de la respuesta.

En este proyecto eso lo garantiza [app.routes.server.ts](../src/app/app.routes.server.ts):

| Modo | Cuándo se genera el HTML | Uso adecuado |
|------|--------------------------|--------------|
| `Prerender` | En el build | Contenido conocido y estable |
| `Server` | En cada petición | Contenido fresco o dependiente de la petición |
| `Client` | Nunca (lo arma el navegador) | Solo rutas que **no** deben indexarse |

---

### 1.2 Meta tags: qué controla cada una

```html
<title>Rick Sanchez | Rick &amp; Morty Explorer</title>
<meta name="description" content="...">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://…/character/1">
```

| Etiqueta | Qué hace | Detalle que suelen preguntar |
|----------|----------|------------------------------|
| `<title>` | Titular del resultado de búsqueda | 50-60 caracteres. Google lo reescribe si no encaja con la consulta |
| `description` | Texto bajo el titular | **No es factor de ranking.** Influye en el CTR, que sí lo es |
| `robots` | Indexación y seguimiento de enlaces | Ver §1.3 |
| `canonical` | URL "oficial" del contenido | Es una *sugerencia*, no una orden |

**Open Graph y Twitter Cards** controlan cómo se ve el enlace al compartirlo.
Aquí está el error más común de Angular:

```ts
// MAL — genera <meta name="og:title">, que los rastreadores sociales ignoran
this.meta.updateTag({ name: 'og:title', content: title });

// BIEN — Open Graph exige el atributo `property`
this.meta.updateTag({ property: 'og:title', content: title });
```

Open Graph usa `property`; Twitter/X usa `name`. La inconsistencia es de los
estándares, no de Angular, y por eso conviene encapsularla en un servicio.

---

### 1.2.bis Rastreo vs. indexación — el concepto que ordena todo lo demás

Casi todos los errores de SEO técnico salen de confundir estas dos cosas. Un
buscador no hace "una cosa": hace etapas independientes, en orden.

```
1. DESCUBRIMIENTO → 2. RASTREO → 3. RENDERIZADO → 4. INDEXACIÓN → 5. POSICIONAMIENTO
   (¿existe esta      (descargar    (ejecutar JS)    (guardar en      (¿en qué puesto
    URL?)              el HTML)                        la base)         la muestro?)
```

**Cada herramienta actúa en una etapa concreta.** Ahí está la clave.

#### Rastreo (*crawling*)

El bot hace una **petición HTTP GET** a la URL y descarga el cuerpo de la
respuesta. Nada más exótico que esto:

```bash
curl https://misitio.com/producto/42   # esto es, exactamente, un rastreo
```

Cuando se dice "el bot puede descargar la URL o no", se habla solo de si esa
petición HTTP llega a ocurrir.

**`robots.txt` actúa aquí (etapa 2).** Antes de pedir cualquier URL del dominio,
el bot descarga `/robots.txt` (lo cachea ~24 h) y comprueba si la ruta está
permitida. Si dice `Disallow`, **no hace la petición**: el servidor nunca se
entera de que ese bot existía.

#### Indexación

El buscador procesa lo descargado —extrae texto, determina de qué trata— y lo
**almacena en su índice**, la base de datos que se consulta al buscar.

Estar indexado significa **ser candidato a aparecer**. No garantiza buena
posición (eso es la etapa 5), pero sin indexación no hay ninguna posibilidad.

**`noindex` actúa aquí (etapa 4).**

#### La comparación

| | Rastreo | Indexación |
|---|---|---|
| Qué es | Descargar el HTML (petición HTTP) | Guardar el contenido en la base del buscador |
| Se controla con | `robots.txt` | `<meta name="robots" content="noindex">` |
| Dónde vive el control | Archivo en la raíz del dominio | Dentro del HTML de cada página |
| Analogía | ¿Dejo entrar al inspector a la casa? | ¿El inspector anota la casa en su catálogo? |

#### Por qué el orden importa

El `noindex` vive **dentro del HTML**. Para leerlo, el bot tiene que haber
descargado la página. La etapa 4 **depende** de que la etapa 2 haya ocurrido:

```
robots.txt: Disallow → el bot NO descarga → nunca ve el <meta noindex> → el noindex NO se aplica
```

#### El caso contraintuitivo

Una URL puede estar **bloqueada en `robots.txt` y aun así indexada**.

Google la descubre por un enlace externo (etapa 1, que **no** requiere rastreo).
No puede descargarla, pero sabe que existe y con qué texto la enlazan. Si la
considera relevante, la indexa usando solo esa información externa. El resultado
en la SERP se ve así:

> **midominio.com/pagina-secreta**
> *No hay información disponible para esta página.*

Sin título ni descripción propios. Peor que no aparecer.

#### Tabla de decisión

| Objetivo | Qué hacer |
|----------|-----------|
| Sacar una URL del índice | **Permitir el rastreo** + servir `noindex` |
| Ahorrar presupuesto de rastreo en URLs ya fuera del índice | `Disallow` |
| Ambas cosas | Primero `noindex`; **cuando ya desapareció**, entonces `Disallow` |
| Proteger algo de verdad | Ninguna de las dos: **autenticación en el servidor** |

Ese orden —`noindex` primero, `Disallow` después— es la respuesta completa que
casi nadie da entera.

---

### 1.3 `noindex` — controlar qué entra al índice

```html
<meta name="robots" content="noindex, follow">
```

Dos ejes independientes:

| Directiva | Efecto |
|-----------|--------|
| `index` / `noindex` | ¿Puede aparecer esta URL en los resultados? |
| `follow` / `nofollow` | ¿Se recorren los enlaces de esta página? |

**La combinación por defecto para excluir algo es `noindex, follow`**, no
`noindex, nofollow`. Quieres que la página desaparezca del índice pero que el
rastreador siga usando sus enlaces para llegar al contenido que sí importa.
`nofollow` se reserva para aislar por completo (staging, zonas privadas).

Casos legítimos de `noindex`:
- Páginas 404 y de error
- "Gracias por tu compra" / confirmaciones
- Resultados de búsqueda interna y filtros (generan URLs casi infinitas)
- Versiones imprimibles
- Entornos de staging (¡el olvido clásico que indexa tu QA!)

**La trampa que casi siempre aparece en los assessments:**

> `noindex` y `Disallow` en `robots.txt` son incompatibles entre sí.

Si bloqueas una URL en `robots.txt`, el bot nunca la descarga, y por lo tanto
**nunca lee el `noindex`**. La URL puede seguir apareciendo en resultados (sin
descripción) si otros sitios la enlazan. Para desindexar de verdad: **permite el
rastreo** y sirve el `noindex`. Una vez desindexada, si además quieres ahorrar
presupuesto de rastreo, entonces sí puedes bloquearla.

Alternativa a nivel de servidor, útil para PDFs y archivos donde no hay `<head>`:

```
X-Robots-Tag: noindex, follow
```

---

### 1.4 `robots.txt` — controlar el rastreo

Archivo de texto plano, **siempre en la raíz del dominio**
(`https://sitio.com/robots.txt`); en cualquier otra ruta se ignora.

```
User-agent: *
Disallow: /api/
Allow: /

Sitemap: https://sitio.com/sitemap.xml
```

| Concepto | Aclaración |
|----------|------------|
| Controla | El **rastreo** (si el bot descarga la URL) |
| NO controla | La **indexación** (para eso, `noindex`) |
| Alcance | Por protocolo + host + puerto. `http://` y `https://` son distintos |
| `Sitemap:` | URL absoluta, independiente de los bloques `User-agent` |
| Precedencia | Gana la regla **más específica** (la más larga), no la primera |
| Visibilidad | Es **público**. Nunca listes ahí rutas sensibles |

Comodines soportados: `*` (cualquier secuencia) y `$` (fin de URL).

```
Disallow: /*?utm_source=     # cualquier URL con ese parámetro
Disallow: /*.pdf$            # solo las que terminan en .pdf
```

**El presupuesto de rastreo (crawl budget)** es el concepto que da sentido a
todo esto: Google dedica un número finito de peticiones a tu sitio. Si lo gasta
en 40 000 variantes de un filtro, no le queda para tus productos nuevos. Por eso
se bloquean parámetros de campaña y rutas técnicas.

---

### 1.4.bis Rastreadores de IA

Desde ~2023 apareció una categoría nueva de bots en el `robots.txt`. Entenderla
bien es lo que distingue una respuesta actualizada de una que se quedó en 2019.

#### Lo primero: no todos hacen lo mismo

Meterlos a todos en el mismo saco es el error habitual. Hay **tres tipos**, con
consecuencias de negocio opuestas:

| Tipo | Qué hace | Si lo bloqueas |
|------|----------|----------------|
| **Entrenamiento** | Descarga contenido para entrenar modelos | Tu contenido no alimenta el modelo. **No pierdes tráfico** |
| **Búsqueda / RAG** | Indexa para responder consultas citando fuentes | **Desapareces de las respuestas con IA**. Pierdes visibilidad |
| **Disparado por usuario** | Alguien pega tu URL en un chat y el asistente la lee | Ese usuario concreto **no puede leer tu página** |

La distinción importa: bloquear el entrenamiento es una decisión sobre
propiedad intelectual. Bloquear los de búsqueda es renunciar a aparecer cuando
alguien pregunta por tu producto en un asistente — cada vez más, la nueva puerta
de entrada.

#### Los user-agents más relevantes

| User-agent | Operador | Tipo |
|------------|----------|------|
| `GPTBot` | OpenAI | Entrenamiento |
| `OAI-SearchBot` | OpenAI | Búsqueda (citas en ChatGPT) |
| `ChatGPT-User` | OpenAI | Disparado por usuario |
| `ClaudeBot` | Anthropic | Entrenamiento |
| `Claude-SearchBot` | Anthropic | Búsqueda |
| `Claude-User` | Anthropic | Disparado por usuario |
| `PerplexityBot` | Perplexity | Búsqueda |
| `CCBot` | Common Crawl | Entrenamiento (dataset público que usan muchos) |
| `Applebot-Extended` | Apple | Señal de exclusión de entrenamiento |
| `Google-Extended` | Google | Señal de exclusión de entrenamiento |
| `Bytespider` | ByteDance | Entrenamiento (con fama de ignorar `robots.txt`) |
| `meta-externalagent` | Meta | Entrenamiento |

#### El caso especial: `Google-Extended`

**No es un rastreador.** No existe ningún bot con ese user-agent haciendo
peticiones a tu servidor. Es un **token de control**: quien rastrea sigue siendo
Googlebot, y `Google-Extended` decide si el contenido ya rastreado puede usarse
para entrenar y alimentar Gemini.

```
User-agent: Google-Extended
Disallow: /
```

Esto **no afecta al posicionamiento en Google Search**. Es la única forma de
separar "quiero salir en el buscador" de "no quiero alimentar el modelo".
`Applebot-Extended` funciona igual respecto a Apple Intelligence.

Entender que un `User-agent` puede ser una señal de política y no un cliente
HTTP real es un detalle que casi nadie menciona.

#### La limitación de fondo: `robots.txt` no obliga a nada

`robots.txt` es **cumplimiento voluntario**. Es una señal, no un control de
acceso. Un bot puede:

- Ignorarlo por completo (`Bytespider` ha sido señalado repetidamente por esto)
- Falsear su user-agent y hacerse pasar por un navegador
- Acceder a tu contenido a través de terceros que sí lo rastrearon

**Si necesitas bloqueo real**, `robots.txt` no sirve. Hacen falta:
- Reglas de WAF / CDN (Cloudflare, por ejemplo, ofrece bloqueo de bots de IA con un interruptor)
- Limitación de tasa por IP o ASN
- Autenticación — la única barrera verdaderamente efectiva

> Misma lección que en §1.2.bis: **`robots.txt` nunca es un mecanismo de
> seguridad.** Es un acuerdo de caballeros.

#### Cómo se decide

Es una decisión **de negocio, no técnica**. El eje es qué papel juega tu
contenido:

| Perfil | Postura típica |
|--------|----------------|
| Medio, editorial, contenido premium | Bloquear entrenamiento, permitir búsqueda (quieren la cita y el clic) |
| SaaS, producto, documentación | Permitir todo — que la IA recomiende tu producto es adquisición |
| E-commerce | Permitir búsqueda; el entrenamiento es indiferente |
| App interna o privada | Bloquear todo, y además autenticar |

Este laboratorio permite todo, porque su contenido es público y didáctico.

#### Sobre `llms.txt`

Circula una propuesta de archivo `/llms.txt` que ofrecería a los modelos una
versión en Markdown del sitio. **No es un estándar y ningún operador importante
lo consume hoy.** Conviene conocerlo para no confundirlo con `robots.txt`, que
sí es un protocolo consolidado y respetado.

---

### 1.5 Sitemaps XML — facilitar el descubrimiento

Lista de URLs que consideras dignas de indexar. **Es una sugerencia, no una
orden**: estar en el sitemap no garantiza indexación, y no estar no impide que
te indexen.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://sitio.com/character/1</loc>
    <lastmod>2026-08-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
```

| Elemento | Obligatorio | Nota importante |
|----------|-------------|-----------------|
| `<loc>` | Sí | URL absoluta, XML-escapada, máx. 2048 caracteres |
| `<lastmod>` | No | **La única que Google usa hoy**, y solo si la considera fiable |
| `<changefreq>` | No | **Google la ignora** desde 2023 |
| `<priority>` | No | **Google la ignora**. Es relativa dentro del sitio, no global |

**Límites:** 50 000 URLs y 50 MB sin comprimir por archivo. Al superarlos, se
parte y se publica un *sitemap index*:

```xml
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://sitio.com/sitemap-personajes-1.xml</loc></sitemap>
  <sitemap><loc>https://sitio.com/sitemap-personajes-2.xml</loc></sitemap>
</sitemapindex>
```

**Reglas de higiene** — un sitemap sucio le enseña al rastreador a desconfiar:
- Solo URLs **canónicas** e **indexables** (200 OK, sin `noindex`)
- Nunca redirecciones, 404 ni URLs bloqueadas en `robots.txt`
- Un `lastmod` que cambia en cada build sin que el contenido cambie hace que
  Google deje de creerle

**Estático vs. dinámico:** si el contenido viene de una base de datos o una API,
el sitemap debe generarse en tiempo de ejecución. Un XML mantenido a mano queda
obsoleto en la primera publicación.

---

### 1.6 schema.org — darle significado al contenido

El HTML describe *presentación*: "hay un `<h2>` con el texto Rick Sanchez".
schema.org describe *significado*: "esta página trata sobre una persona llamada
Rick Sanchez, de especie humana, cuya imagen es esta".

Es un vocabulario compartido (creado por Google, Microsoft, Yahoo y Yandex) con
tres formatos posibles. **Usa JSON-LD**: Google lo recomienda explícitamente,
vive aislado en un `<script>` del `<head>` y no acopla los datos a la estructura
visual de la plantilla. Microdata y RDFa ensucian el marcado y se rompen en
cuanto alguien reordena un `div`.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Rick Sanchez",
  "image": "https://…/1.jpeg"
}
</script>
```

| Clave | Significado |
|-------|-------------|
| `@context` | Vocabulario en uso. Siempre `https://schema.org` |
| `@type` | Tipo de entidad (`Person`, `Product`, `Article`, `BreadcrumbList`…) |
| `@id` | Identificador único y estable. Permite **enlazar entidades entre páginas** |

**El beneficio concreto** son los *rich results*: estrellas de valoración,
precios, migas de pan, FAQs desplegables, imágenes de recetas. Ocupan más
espacio en la SERP y suben el CTR aunque la posición no cambie.

**Las dos reglas que no se pueden romper:**

1. **Debe describir contenido realmente visible en la página.** Declarar
   valoraciones que el usuario no ve es motivo de acción manual por spam.
2. **No todo tipo de schema.org produce un rich result.** Solo los que Google
   documenta en su galería de resultados enriquecidos. El resto sigue siendo
   válido y útil para el grafo de conocimiento, pero no cambia la SERP.

**Herramientas de validación:**
- [Rich Results Test](https://search.google.com/test/rich-results) — qué rich result puede generar Google
- [Schema Markup Validator](https://validator.schema.org/) — validez del vocabulario
- Google Search Console → "Mejoras" — errores en producción, con datos reales

---

## Parte 2 — Práctica en este proyecto

### 2.1 El punto de partida: qué hacía `MetatagsGenerator`

El servicio original — `src/app/services/metatags-generator.ts`, eliminado en
este tema — era así:

```ts
@Injectable({ providedIn: 'root' })
export class MetatagsGenerator {
  private _route = inject(Router);

  public getPageTitle(): string {
    const route = this._route.url;
    switch (route) {
      case AppUrls.ABOUT:   return PageTitles.ABOUT;
      case AppUrls.CONTACT: return PageTitles.CONTACT;
      case AppUrls.PRICING: return PageTitles.PRICING;
      default:              return 'SSR Angular Application';
    }
  }
}
```

**Qué hacía:** leía la URL actual del `Router` y devolvía un `string` con el
título correspondiente, que cada página pasaba a `Title.setTitle()`.

**Para qué servía:** centralizar los títulos en un solo lugar, en vez de tener
literales sueltos por los componentes. La intención era correcta.

**Por qué no alcanzaba** — y esto es exactamente el tipo de análisis que se
espera en un assessment:

| Limitación | Consecuencia |
|------------|--------------|
| Solo generaba el `<title>` | Sin `description`, sin canonical, sin Open Graph. El 90% del SEO on-page faltaba |
| `switch` sobre la URL | Cada página nueva exige un `case`. No escala, y las rutas con parámetros (`/character/:id`) no encajan |
| Acoplado al `Router` | El componente ya sabe qué está mostrando; volver a preguntárselo a la URL es indirección sin ganancia |
| Devolvía un `string` | El llamador tenía que acordarse de aplicarlo. Nada garantizaba consistencia |
| Nombre engañoso | Se llamaba "Metatags" pero no generaba ninguna meta tag |

**Lo reemplaza** [`Seo`](../src/app/services/seo.ts): recibe el paquete completo
de datos y **aplica** todas las etiquetas, en lugar de devolver un fragmento.

---

### 2.2 El servicio `Seo`

[src/app/services/seo.ts](../src/app/services/seo.ts)

```ts
this._seo.update({
  title: character.name,
  description,
  path: `/character/${character.id}`,
  image: character.image,
  type: 'profile',
});
```

Una sola llamada escribe: `<title>`, `description`, `robots`, siete etiquetas
Open Graph, cuatro de Twitter Card y el `<link rel="canonical">`.

Tres decisiones de diseño que vale la pena poder defender:

**1. Reescribe el paquete completo en cada llamada.**
En una SPA el `<head>` **no se recrea** al cambiar de ruta. Si la ficha de un
personaje escribe `og:image` y luego navegas a `/about`, esa imagen se queda
pegada salvo que alguien la borre. Al reescribir todo siempre, ese arrastre no
puede ocurrir.

**2. Usa el token `DOCUMENT`, no el `document` global.**
`Meta` no gestiona elementos `<link>`, así que el canonical exige tocar el DOM.
Con `inject(DOCUMENT)` el mismo código funciona en el navegador y en Node,
donde apunta al DOM sintético de `platform-server`. Usar `document` directamente
lanzaría `ReferenceError` durante el SSR.

**3. Escapa el JSON-LD antes de inyectarlo.**

```ts
JSON.stringify(schema)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026');
```

Si un dato de la API contuviera la cadena `</script>`, el navegador cerraría el
bloque ahí y trataría el resto como HTML: una vía de inyección real. Escapar a
secuencias unicode mantiene el JSON válido y neutraliza el vector. **Este
detalle diferencia una respuesta de manual de una respuesta de alguien que ha
puesto structured data en producción.**

---

### 2.3 `noindex` + el arreglo del soft 404

**El problema encontrado.** La ruta comodín hacía:

```ts
{ path: '**', redirectTo: 'about' }
```

Cualquier URL inexistente redirigía a `/about` y el servidor respondía
**200 OK**. Eso es un *soft 404*: le dice al buscador que
`/esta-url-no-existe-jamas` es una página válida. Resultado: URLs basura en el
índice y presupuesto de rastreo desperdiciado.

**El arreglo, en tres señales que deben coincidir:**

| Señal | Dónde | Valor |
|-------|-------|-------|
| Código HTTP | [app.routes.server.ts](../src/app/app.routes.server.ts) | `status: 404` |
| Meta robots | [not-found.ts](../src/app/pages/not-found/not-found.ts) | `noindex, follow` |
| Contenido útil | [not-found.html](../src/app/pages/not-found/not-found.html) | Enlaces de recuperación |

```ts
// app.routes.server.ts
{
  path: '**',
  renderMode: RenderMode.Server,
  status: 404,
}
```

**El detalle que se pasa por alto:** al poner `status: 404` en el comodín, hubo
que **declarar explícitamente las rutas estáticas antes**, o `/about`,
`/contact` y `/pricing` también habrían respondido 404 — un desastre silencioso
que el navegador no muestra pero el rastreador sí obedece.

```ts
{ path: 'about',   renderMode: RenderMode.Prerender },
{ path: 'contact', renderMode: RenderMode.Prerender },
{ path: 'pricing', renderMode: RenderMode.Prerender },
```

Y para que las páginas de personajes **no** pregeneradas siguieran devolviendo
200, hizo falta `fallback: PrerenderFallback.Server`. Sin él, `/character/500`
caería en el comodín y devolvería 404, sacando del índice casi todo el catálogo.

---

### 2.4 `robots.txt`

[public/robots.txt](../public/robots.txt) — se sirve automáticamente desde la
raíz porque `angular.json` copia todo `public/` a la salida del build.

Bloquea parámetros de campaña (`utm_*`, `sessionid`) para no gastar presupuesto
de rastreo en variantes de la misma página, y declara la ubicación del sitemap.

> **Nota:** `server.ts` sirve los estáticos con `maxAge: '1y'`, lo que también
> aplica al `robots.txt`. En producción conviene una excepción con un TTL bajo,
> porque un `robots.txt` cacheado un año impide corregir un bloqueo por error.

---

### 2.5 Sitemap XML dinámico

[src/sitemap.ts](../src/sitemap.ts) + la ruta en [src/server.ts](../src/server.ts)

Se genera en tiempo de ejecución porque el catálogo vive en una API externa.
Resultado verificado: **871 URLs** (3 estáticas + 42 de listado + 826 fichas).

```ts
app.get('/sitemap.xml', async (_req, res, next) => {
  const xml = await getSitemapXml();
  res.header('Content-Type', 'application/xml; charset=utf-8');
  res.header('Cache-Control', 'public, max-age=3600');
  res.send(xml);
});
```

Cuatro decisiones defendibles:

| Decisión | Razón |
|----------|-------|
| Declarado **antes** del middleware de Angular | Express evalúa en orden; el catch-all capturaría la ruta y devolvería HTML |
| `Content-Type: application/xml` | Servido como `text/html`, el rastreador lo descarta |
| Caché en memoria de 6 h + `Cache-Control` | Los bots piden el sitemap seguido; sin caché, cada visita golpea la API externa |
| Degradación ante fallo de la API | Devuelve el sitemap solo con rutas estáticas. Un 500 repetido hace que el buscador deje de pedirlo |

---

### 2.6 Datos estructurados

[src/app/config/schema-org.ts](../src/app/config/schema-org.ts) — constructores puros.

| Esquema | Dónde se aplica | Propósito |
|---------|-----------------|-----------|
| `WebSite` | [app.ts](../src/app/app.ts) — persistente | Identidad del sitio, declarada una sola vez |
| `Person` | Ficha de personaje | Entidad principal de la página |
| `BreadcrumbList` | Ficha de personaje | Jerarquía visible en la SERP |
| `ItemList` | Listado paginado | Marca la página como índice |
| `ContactPage` | Contacto | Alimenta el panel de conocimiento |

**Modelar un personaje ficticio.** schema.org no tiene un tipo para eso. La
solución estándar es usar el tipo más cercano y precisarlo con `additionalType`
apuntando a Wikidata:

```ts
'@type': 'Person',
additionalType: 'https://www.wikidata.org/wiki/Q95074', // personaje ficticio
```

**Enlazar entidades con `@id`.** Cada ficha declara
`isPartOf: { '@id': 'https://…/#website' }`, lo que conecta la persona con la
entidad `WebSite` global. Así el buscador entiende que las páginas forman un
grafo, no un conjunto de islas.

**El bloque persistente.** `WebSite` describe al sitio, no a una página, así que
se registra una vez en el componente raíz con la bandera `persistent`:

```ts
this._seo.setJsonLd('ld-website', websiteSchema(), true);
```

Los demás bloques se borran en cada `update()`. Sin esa limpieza, navegar de la
ficha de un personaje a `/contact` dejaría en el `<head>` un `Person` que ya no
corresponde al contenido visible — justo el desajuste que Google penaliza.

---

### 2.7 SEO en listados paginados

[characters-page.ts](../src/app/pages/characters-page/characters-page.ts)

```ts
this._seo.update({
  title: page === 1 ? 'Personajes' : `Personajes — página ${page}`,
  description: /* distinta por página */,
  path: `/characters/page/${page}`,   // canonical auto-referencial
});
```

Dos decisiones que suelen hacerse mal:

**1. Canonical auto-referencial.** Cada página apunta **a sí misma**, no a la
página 1. Canonicalizar todo hacia la primera le dice a Google que las demás son
duplicados y deja de rastrearlas: se pierden del índice los personajes que solo
aparecen en páginas profundas.

**2. Sin `rel="prev"` / `rel="next"`.** Google dejó de usarlos en 2019 y lo
anunció públicamente. Lo que sí cuenta hoy es que las páginas estén enlazadas
con `<a href>` rastreables.

**3. Títulos y descripciones distintos por página**, para que los resultados no
se vean como duplicados entre sí.

---

## Parte 3 — Verificación

Todo lo anterior fue comprobado sobre el build de producción, no solo en teoría.

```bash
npm run build
node dist/ssr-project/server/server.mjs
```

### Códigos de estado

```
200  /about                    ← estática pregenerada
200  /pricing
200  /characters/page/1        ← listado pregenerado
200  /characters/page/30       ← NO pregenerada → fallback a servidor
200  /character/500            ← NO pregenerada → fallback a servidor
404  /ruta-que-no-existe       ← 404 real, no soft 404
```

### `<head>` que sale del servidor para `/character/1`

```html
<title>Rick Sanchez | Rick &amp; Morty Explorer</title>
<meta name="description" content="Rick Sanchez es un personaje human de…">
<meta name="robots" content="index, follow">
<meta property="og:title" content="Rick Sanchez">
<meta property="og:image" content="https://…/avatar/1.jpeg">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://…/character/1">
<script type="application/ld+json" id="ld-website" data-seo-persistent>…</script>
<script type="application/ld+json" id="ld-character">…</script>
<script type="application/ld+json" id="ld-breadcrumb">…</script>
```

**Esto es lo que hace que el laboratorio sea demostrable:** el contenido está en
el HTML de la respuesta, sin ejecutar JavaScript.

### Comandos de verificación

```bash
# El rastreador ve el contenido sin ejecutar JS
curl -s http://localhost:4000/character/1 | grep -E 'canonical|og:title'

# Las URLs inexistentes devuelven 404 de verdad
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/no-existe

# El sitemap se sirve con el Content-Type correcto
curl -s -D - -o /dev/null http://localhost:4000/sitemap.xml

# Cuántas URLs declara
curl -s http://localhost:4000/sitemap.xml | grep -c '<loc>'
```

---

## Parte 4 — Preguntas de assessment

<details>
<summary><b>¿Cuál es la diferencia entre <code>robots.txt</code> y la meta <code>noindex</code>?</b></summary>

`robots.txt` controla el **rastreo**: si el bot puede descargar la URL.
`noindex` controla la **indexación**: si puede aparecer en resultados.

Son independientes y **usarlos juntos es contraproducente**: si bloqueas una URL
en `robots.txt`, el bot nunca la descarga y por lo tanto nunca lee el `noindex`.
La URL puede seguir apareciendo en resultados sin descripción si otros sitios la
enlazan.

Para desindexar: permite el rastreo y sirve `noindex`. Una vez fuera del índice,
si además quieres ahorrar presupuesto de rastreo, entonces sí puedes bloquearla.
</details>

<details>
<summary><b>Explica la diferencia entre rastreo e indexación</b></summary>

**Rastreo** es la petición HTTP: el bot descarga el HTML de la URL. Equivale a
un `curl`. Se controla con `robots.txt`.

**Indexación** es el paso posterior: el buscador procesa lo descargado y lo
guarda en su base de datos, convirtiendo la URL en candidata a aparecer en
resultados. Se controla con `<meta name="robots" content="noindex">`.

Son etapas distintas de un mismo pipeline
(descubrimiento → rastreo → renderizado → indexación → posicionamiento), y la
indexación **depende** del rastreo: el `noindex` vive dentro del HTML, así que
el bot debe poder descargarlo para obedecerlo.
</details>

<details>
<summary><b>¿Puede una URL bloqueada en <code>robots.txt</code> aparecer en Google?</b></summary>

Sí, y es la prueba de que rastreo e indexación son cosas distintas.

Google puede **descubrir** la URL por un enlace externo — el descubrimiento no
requiere rastreo. No puede descargarla, pero sabe que existe y con qué texto la
enlazan. Si la considera relevante, la indexa con esa información externa y la
muestra así:

> **midominio.com/pagina** — *No hay información disponible para esta página.*

Sin título ni descripción propios: peor que no aparecer. Por eso, para
desindexar de verdad hay que **permitir el rastreo** y servir `noindex`.
</details>

<details>
<summary><b>¿Sirve <code>robots.txt</code> para proteger contenido sensible?</b></summary>

No, por dos razones independientes:

1. **Es cumplimiento voluntario.** Es una señal que el bot elige respetar, no un
   control de acceso. Un rastreador malicioso lo ignora o falsea su user-agent.
2. **Es público y legible por cualquiera.** Listar `/admin/` equivale a publicar
   un índice de lo que quieres esconder.

Lo único que protege de verdad es la **autenticación en el servidor**.
</details>

<details>
<summary><b>¿Cómo tratas los rastreadores de IA en el <code>robots.txt</code>?</b></summary>

Primero distinguiendo tres tipos, porque las consecuencias son opuestas:

- **Entrenamiento** (`GPTBot`, `ClaudeBot`, `CCBot`): alimentan modelos.
  Bloquearlos **no cuesta tráfico**; es una decisión de propiedad intelectual.
- **Búsqueda / RAG** (`OAI-SearchBot`, `PerplexityBot`, `Claude-SearchBot`):
  responden citando fuentes. Bloquearlos **te saca de las respuestas con IA**,
  que es un canal de descubrimiento creciente.
- **Disparados por usuario** (`ChatGPT-User`, `Claude-User`): alguien pegó tu
  URL en un chat. Bloquearlos impide que esa persona lea tu página.

La postura depende del modelo de negocio: un medio suele bloquear entrenamiento
y permitir búsqueda; un SaaS suele permitir todo, porque que la IA recomiende su
producto es adquisición.

Y siempre la advertencia: es voluntario. Para bloqueo real hacen falta WAF/CDN o
autenticación.
</details>

<details>
<summary><b>¿Qué es <code>Google-Extended</code>?</b></summary>

**No es un rastreador.** Ningún cliente HTTP usa ese user-agent; quien rastrea
sigue siendo Googlebot. Es un **token de control** que decide si el contenido ya
rastreado puede usarse para entrenar y alimentar Gemini.

Lo importante: bloquearlo **no afecta al posicionamiento en Google Search**. Es
la única forma de separar "quiero salir en el buscador" de "no quiero alimentar
el modelo". `Applebot-Extended` cumple el mismo papel con Apple Intelligence.
</details>

<details>
<summary><b>¿Por qué usar <code>noindex, follow</code> y no <code>noindex, nofollow</code>?</b></summary>

Son dos ejes distintos. `noindex` saca la página del índice; `follow` permite
que el rastreador siga usando sus enlaces.

En una 404, quieres que la URL rota desaparezca de los resultados pero que el
bot llegue desde ahí al contenido válido. `nofollow` cortaría ese camino y se
reserva para aislar por completo (staging, zonas privadas).
</details>

<details>
<summary><b>¿Un sitemap garantiza que te indexen?</b></summary>

No. Es una **sugerencia de descubrimiento**, no una orden. Estar en el sitemap
no garantiza indexación, y no estar no la impide.

Su valor está en sitios grandes, con contenido nuevo o poco enlazado
internamente. En un sitio de 10 páginas bien enlazadas aporta muy poco.
</details>

<details>
<summary><b>¿Qué elementos del sitemap usa Google realmente?</b></summary>

Solo `<loc>` y `<lastmod>`, y este último **únicamente si lo considera fiable**.
Google anunció públicamente que **ignora `changefreq` y `priority`**.

Si el `lastmod` cambia en cada build sin que el contenido cambie, Google aprende
a desconfiar y deja de usarlo. Mantener `changefreq` y `priority` no hace daño
—otros buscadores los consideran— pero no hay que esperar efecto en Google.
</details>

<details>
<summary><b>¿Cuáles son los límites de un sitemap?</b></summary>

50 000 URLs y 50 MB sin comprimir por archivo. Al superarlos, se parte en varios
y se publica un **sitemap index** que los referencia. Un sitemap index puede
contener hasta 50 000 sitemaps.
</details>

<details>
<summary><b>¿Por qué JSON-LD y no Microdata o RDFa?</b></summary>

Es el formato que Google recomienda. Vive aislado en un `<script>` del `<head>`,
así que no ensucia el marcado ni se acopla a la estructura visual: reordenar la
plantilla no rompe los datos estructurados. Microdata y RDFa se entrelazan con
el HTML y son frágiles ante cualquier refactor de la vista.

Además, generar un objeto y serializarlo es trivial desde un componente; salpicar
atributos por la plantilla, no.
</details>

<details>
<summary><b>¿Qué es un soft 404 y por qué es un problema?</b></summary>

Cuando el servidor responde **200 OK** con contenido válido para una URL que en
realidad no existe — típicamente redirigiendo todo lo desconocido a la home.

El buscador cree que esas URLs son páginas legítimas, las indexa y gasta
presupuesto de rastreo en ellas. El tratamiento correcto es un **404 real** con
`noindex, follow` y contenido útil para el usuario. Es exactamente el bug que se
corrigió en §2.3 de este documento.
</details>

<details>
<summary><b>En un listado paginado, ¿el canonical debe apuntar a la página 1?</b></summary>

No. Cada página debe **canonicalizarse a sí misma**.

Apuntar todo a la página 1 le dice a Google que las demás son duplicados; deja
de rastrearlas y se pierde del índice el contenido que solo aparece en las
páginas profundas. Además, `rel="prev"`/`rel="next"` está obsoleto desde 2019:
lo que cuenta hoy es que las páginas estén enlazadas con `<a href>` rastreables.
</details>

<details>
<summary><b>¿Por qué SSR es un requisito para el SEO en Angular?</b></summary>

Sin SSR, el HTML entregado es `<app-root></app-root>` — sin contenido.

Google *sí* ejecuta JavaScript, pero en una segunda pasada diferida y con
presupuesto limitado. Bing y, sobre todo, **los previsualizadores de enlaces de
WhatsApp, LinkedIn, Slack y X no ejecutan JavaScript en absoluto**: sin SSR,
compartir un enlace de tu producto muestra una tarjeta vacía.

Ese suele ser el argumento decisivo con negocio, porque es visible de inmediato.
</details>

<details>
<summary><b>¿Por qué manipular el <code>&lt;head&gt;</code> con <code>DOCUMENT</code> y no con <code>document</code>?</b></summary>

Porque en SSR el código se ejecuta en Node, donde el `document` global no
existe: usarlo lanza `ReferenceError` y rompe el render del servidor.

`inject(DOCUMENT)` devuelve el DOM real en el navegador y el DOM sintético de
`platform-server` en el servidor, así que el mismo código funciona en ambos.
</details>

<details>
<summary><b>¿Cómo evitas que las meta tags de una página se filtren a la siguiente?</b></summary>

En una SPA el `<head>` no se recrea al navegar. Si una página escribe
`og:image` y la siguiente no la sobrescribe, la imagen anterior persiste.

La solución de este laboratorio es que `Seo.update()` **reescribe el paquete
completo** en cada llamada y elimina explícitamente las etiquetas opcionales y
los bloques JSON-LD no persistentes de la ruta anterior.
</details>

<details>
<summary><b>¿Cuándo el SEO NO es relevante en un proyecto?</b></summary>

En aplicaciones detrás de login, paneles administrativos, herramientas internas
y backoffices. Ahí lo correcto es lo contrario: `noindex, nofollow` y
`Disallow: /`, más asegurarse de que el entorno de staging nunca se indexe.

Saber cuándo **no** aplicar SEO evita trabajo desperdiciado, y es una respuesta
que distingue a quien entiende el porqué de quien repite una checklist.
</details>

---

## Pendientes conocidos

Cosas deliberadamente no resueltas, útiles para mencionar como "próximos pasos":

- **`public/og-default.png` no existe.** Hace falta una imagen de 1200×630 px
  para que los enlaces compartidos sin imagen propia muestren algo.
- **`SITE_URL` está hardcodeado.** En producción debería venir de una variable
  de entorno por ambiente: staging y producción nunca deben compartir canonical.
- **`robots.txt` se sirve con `maxAge: '1y'`.** Conviene una excepción con TTL
  bajo en `server.ts`.
- **Sin `hreflang`.** Solo aplica si el sitio se publica en varios idiomas.
- **IDs del sitemap asumidos consecutivos.** Válido para esta API; con datos
  propios habría que recorrer los IDs reales.

---

## Referencias

- [Guía de robots.txt — Woorank](https://www.woorank.com/es/edu/seo-guides/guia-basica-a-tu-archivo-robots-txt)
- [Crear un sitemap — Google Search Central](https://developers.google.com/search/docs/advanced/sitemaps/build-sitemap?hl=es)
- [Vocabulario schema.org](https://schema.org/)
- [Protocolo de sitemaps](https://www.sitemaps.org/protocol.html)
- [Especificación de Open Graph](https://ogp.me/)
- [Angular — Server-side rendering](https://angular.dev/guide/ssr)
