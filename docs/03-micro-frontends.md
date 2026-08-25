# 03 — Estrategias de micro-frontends

> **Temas:** cuándo usar micro-frontends · estrategias de composición · **runtime compartido vs. no compartido** · problemas transversales · el ecosistema Angular · micro-frontends y SSR
> **Naturaleza del tema:** predominantemente teórico y de criterio arquitectónico. La práctica es acotada a propósito (Parte 2).

---

## Parte 1 — Teoría

### 1.1 Qué son — y qué no son

Un **micro-frontend** es una porción de interfaz que un equipo puede **desarrollar,
probar y desplegar de forma independiente**, y que se integra con otras en una
misma experiencia de usuario.

Es la extensión al frontend de la idea de los microservicios. Y arrastra la misma
confusión: se adopta buscando elegancia técnica cuando en realidad resuelve un
problema **organizativo**.

**Lo que NO es un micro-frontend:**

| No es… | Por qué |
|--------|---------|
| Dividir la app en módulos o librerías | Eso es **modularidad**, y es bueno, pero se despliega junto |
| Lazy loading de rutas | Sigue siendo un artefacto único |
| Un monorepo con varias librerías | Sigue habiendo un solo despliegue |
| Usar varios frameworks porque sí | Eso es deuda técnica con nombre bonito |

**El criterio que decide** si algo es un micro-frontend es uno solo:

> ¿Puede el equipo A **desplegar a producción** su parte sin coordinarse con el
> equipo B, sin un build conjunto y sin una ventana de release compartida?

Si la respuesta es no, no son micro-frontends. Es una app modular — que muchas
veces es exactamente lo que necesitas.

---

### 1.2 El problema real: es organizativo, no técnico

**Ley de Conway:** *"las organizaciones diseñan sistemas que replican su propia
estructura de comunicación."*

Los micro-frontends son la aplicación deliberada de esa ley: si tienes ocho
equipos de producto y **un** frontend monolítico, la arquitectura no encaja con la
organización y el síntoma aparece siempre igual:

- Una cola de despliegues: nadie sale a producción hasta que todos están listos
- Un cambio en un componente compartido rompe tres equipos
- El "release train" semanal donde una regresión bloquea a todo el mundo
- Nadie se atreve a tocar el código que no es suyo
- El tiempo de build crece hasta hacer insoportable el ciclo de feedback

Fíjate en que **ninguno de esos síntomas es técnico**. Son problemas de
coordinación humana.

> **La frase que resume el tema:** los micro-frontends optimizan la
> **autonomía de los equipos**, y lo pagan con **complejidad operativa**.
> Si no tienes un problema de autonomía, solo estás comprando la factura.

---

### 1.3 Cuándo SÍ y cuándo NO — el árbol de decisión

Esta es la parte que más pesa en un assessment. El enunciado dice literalmente
*"entiende cuándo usar micro-frontends"*: la respuesta valiosa incluye **cuándo no**.

#### Antes de plantearlos, agota estas alternativas

| Alternativa | Resuelve | Coste |
|-------------|----------|-------|
| **Monolito modular** con fronteras claras | Acoplamiento de código | Bajo |
| **Monorepo (Nx)** con librerías y reglas de dependencia | Propiedad de código, límites forzados por linter | Bajo |
| **Trunk-based + feature flags** | Despliegues bloqueados entre sí | Medio |
| **Micro-frontends** | Despliegue e independencia tecnológica real | **Alto** |

> Si en una entrevista te preguntan "¿usarías micro-frontends aquí?", la mejor
> primera respuesta es **"¿ya probamos un monorepo con fronteras forzadas?"**.
> Nx resuelve el 80 % de los dolores con el 10 % del coste.

#### Señales a favor

- **Varios equipos autónomos** (regla práctica: 3–4 o más) sobre el mismo producto
- Necesidad real de **cadencias de despliegue distintas**
- **Dominios de negocio separables**: catálogo, checkout, cuenta, soporte
- **Integrar una adquisición** o un sistema legacy con otro stack
- **Migración incremental** de un framework antiguo (patrón *strangler fig*)
- Un producto **white-label** embebido en aplicaciones de terceros

#### Señales en contra

- **Un solo equipo** o dos. Es el caso más frecuente, y la respuesta casi siempre es no
- La UI está **fuertemente entrelazada** (un editor, un dashboard interactivo)
- **El rendimiento es crítico** y no puedes permitirte payload duplicado
- **SEO y SSR son requisitos** (ver §1.8)
- No hay **madurez de DevOps**: sin CI/CD sólido por equipo, la autonomía es ficción
- Se busca "modernizar" sin un problema concreto que resolver

#### El árbol, resumido

```
¿Tienes >1 equipo que necesite desplegar por separado?
├── NO  → Monolito modular. Fin.
└── SÍ
    ├── ¿Basta con un monorepo y fronteras forzadas?
    │   └── SÍ → Nx con reglas de dependencia. Fin.
    └── NO, necesitan despliegue e infraestructura independientes
        ├── ¿Necesitan aislamiento fuerte / stacks distintos / código no confiable?
        │   └── SÍ → runtime NO compartido (iframe, páginas separadas)
        └── NO, comparten stack y confianza
            └── runtime COMPARTIDO (Native Federation, Web Components)
```

---

### 1.4 Estrategias de composición

Cinco familias, ordenadas por *cuándo* ocurre la integración.

#### a) Composición en tiempo de build

Cada micro-frontend se publica como paquete npm y el contenedor los instala.

**Problema fatal:** para publicar un cambio hay que reconstruir y redesplegar el
contenedor. Se pierde la independencia de despliegue, que era el objetivo.

> **No son micro-frontends de verdad.** Sirven para librerías compartidas
> (design system), no para features.

#### b) Composición en servidor

El servidor ensambla el HTML de varios fragmentos antes de enviarlo:
SSI, ESI (Edge Side Includes), Podium, Tailor.

Buen SEO y buen rendimiento inicial. Es el modelo de muchos e-commerce grandes.
Coste: infraestructura propia y menos interactividad entre fragmentos.

#### c) Composición en el borde (edge)

Como la anterior pero en la CDN. Rápido, pero muy atado al proveedor.

#### d) Composición en cliente por iframe

El contenedor incrusta `<iframe>`. **Aislamiento total** — ver §1.5.

#### e) Composición en cliente por JavaScript

El contenedor carga módulos remotos en tiempo de ejecución y los monta en el DOM.
Es el modelo de **Module Federation**, **Native Federation** y **single-spa**.

Máxima flexibilidad e integración fluida; también el que más problemas
transversales genera (§1.6).

---

### 1.5 Runtime compartido vs. no compartido ⭐

Es el eje explícito del enunciado, así que conviene precisarlo bien. En realidad
hay **dos ejes que se suelen confundir**:

```
EJE 1 — Aislamiento del runtime
   ¿Comparten el mismo contexto de JavaScript (realm, window, DOM)?

EJE 2 — Compartición de dependencias
   Dentro de un mismo runtime, ¿comparten la instancia del framework
   o cada uno trae la suya?
```

#### Eje 1: el aislamiento

| | **Runtime compartido** | **Runtime NO compartido** |
|---|---|---|
| **Mecanismo** | Native/Module Federation, single-spa, Web Components | iframes, páginas separadas, Web Workers |
| **Contexto JS** | Uno solo: mismo `window`, mismo `document` | Uno por micro-frontend |
| **Aislamiento CSS** | Manual: Shadow DOM, convenciones, prefijos | **Total, gratis** |
| **Aislamiento de fallos** | Ninguno: un error puede tumbar la página | **Total**: si uno cae, el resto sigue |
| **Peso de descarga** | Se pueden compartir dependencias | Cada uno carga su framework completo |
| **Comunicación** | Llamadas directas, eventos, estado compartido | Solo `postMessage` (asíncrono, serializado) |
| **UX** | Sin costuras | Costuras: scroll, foco, modales, responsive |
| **Versionado** | Acoplado por las dependencias compartidas | **Independencia total** |
| **Seguridad** | Confianza mutua obligatoria | Frontera real (`sandbox`, CSP) |
| **SEO / SSR** | Difícil pero posible | Muy malo: el contenido del iframe no cuenta |
| **Accesibilidad** | Un solo árbol; foco y landmarks naturales | Foco fragmentado, landmarks aislados |

> Las dos últimas filas conectan directamente con los temas 01 y 02. Un iframe es
> un documento aparte: su contenido **no** se atribuye a la página que lo contiene
> a efectos de indexación, y el árbol de accesibilidad se parte en dos.

#### Eje 2: la compartición de dependencias

Dentro de un runtime compartido todavía decides si hay **una** instancia de Angular
o **varias**:

| | Dependencias compartidas | Cada uno la suya |
|---|---|---|
| Peso | Angular se descarga una vez | Se duplica en cada micro-frontend |
| Versionado | **Todos atados a versiones compatibles** | Cada equipo actualiza a su ritmo |
| Estado singleton | Un solo `providedIn: 'root'` | Uno por micro-frontend (¡fuente de bugs sutiles!) |
| Autonomía | Menor | Mayor |

**Aquí está el trade-off central de Module/Native Federation.** Declarar Angular
como `singleton` ahorra megabytes pero crea un **acoplamiento de versión**: nadie
puede migrar a Angular 21 hasta que todos puedan. Que es, irónicamente, el
problema de coordinación que se quería eliminar.

**Regla práctica:** comparte lo estable y de bajo riesgo (framework, design
system) y no compartas lo volátil. Y **mide**: la duplicación puede ser más barata
de lo que crees si aplicas caching y HTTP/2.

#### Cómo elegir en una frase

> **Runtime no compartido cuando necesitas una frontera** — código de terceros o
> no confiable, stacks incompatibles, requisitos de seguridad, legacy que no vas a
> tocar.
> **Runtime compartido cuando necesitas una experiencia** — una UI que se sienta
> como un solo producto.

---

### 1.6 Los cinco problemas transversales

Aquí es donde los micro-frontends se pagan. Un buen candidato los menciona sin
que se los pregunten.

**1. Enrutamiento.** ¿Quién es dueño de la URL? Lo habitual es un router de
contenedor que delega rangos de rutas, pero los enlaces profundos, el botón
"atrás" y los guards se vuelven un problema distribuido.

**2. Comunicación y estado.** La regla es **minimizarla**: si dos micro-frontends
necesitan compartir mucho estado, probablemente deberían ser uno. Cuando hace
falta, opciones ordenadas de menos a más acoplamiento: parámetros de URL →
`CustomEvent` en el DOM → un bus de eventos → estado compartido (evítalo).

**3. Estilos.** El CSS es global por naturaleza. Soluciones: Shadow DOM
(aislamiento real, pero complica el theming y los overlays), convenciones de
prefijos, CSS Modules, o `ViewEncapsulation` de Angular. El **design system
compartido** es imprescindible: sin él obtienes cinco tonos de azul distintos.

**4. Autenticación y sesión.** Debe resolverse **una vez** en el contenedor y
propagarse. Duplicar la lógica de auth por micro-frontend es un agujero de
seguridad y una pesadilla de mantenimiento.

**5. Versionado y contratos.** La interfaz entre contenedor y micro-frontend es
una **API**: necesita versionado, compatibilidad hacia atrás y tests de contrato.
Sin eso, "despliegue independiente" significa "romper a otros de forma
independiente".

---

### 1.7 El ecosistema Angular

#### Module Federation (webpack)

La implementación original, de webpack 5. En Angular se usaba con
`@angular-architects/module-federation`.

> **Dato crítico y verificado en este laboratorio:** `angular.json` usa
> `@angular/build:application`, es decir **esbuild/Vite**, no webpack. Desde
> Angular 17 ese es el builder por defecto. **Module Federation de webpack no es
> aplicable aquí.** Decir "usaría Module Federation" sin más, en un proyecto
> Angular moderno, delata material desactualizado.

#### Native Federation ⭐ — la opción actual

`@angular-architects/native-federation` reimplementa el **modelo mental** de
Module Federation sobre estándares del navegador: **ES modules + import maps**.

| Ventaja | Detalle |
|---------|---------|
| Independiente del bundler | Funciona con esbuild, Vite, webpack |
| Basado en estándares | Import maps son API del navegador, no de un bundler |
| Misma API conceptual | `shared`, `remotes`, `exposes` |

**Es la respuesta correcta para Angular 17+.**

#### Angular Elements (Web Components)

`@angular/elements` empaqueta un componente Angular como *custom element*
estándar:

```ts
const element = createCustomElement(CharacterCard, { injector });
customElements.define('rm-character-card', element);
```

| Ventaja | Coste |
|---------|-------|
| Lo consume cualquier stack (React, Vue, HTML plano) | Cada elemento arrastra su runtime si no se comparte |
| Encapsulación con Shadow DOM | Comunicación limitada a atributos y eventos |
| Estándar del navegador, sin lock-in | No hay lazy loading de rutas ni router integrado |

Encaja muy bien en **widgets embebibles** y en **integración con otros stacks**.

#### single-spa

Orquestador agnóstico, anterior a Module Federation. Sigue siendo válido cuando
conviven frameworks distintos, pero requiere más configuración manual.

---

### 1.8 Micro-frontends y SSR: la fricción que casi nadie menciona

Este laboratorio tiene SSR, así que el punto es directamente relevante.

**Por qué es difícil:**

1. **El ensamblaje tiene que ocurrir dos veces**, en servidor y en cliente, y
   producir exactamente lo mismo. Si no, la hidratación falla.
2. **Cargar remotos en el servidor** implica que el servidor haga peticiones de
   red a otros orígenes durante el render: latencia y un punto de fallo nuevo.
3. **El error de hidratación es difícil de depurar** cuando el HTML lo generaron
   dos artefactos distintos.
4. **Los import maps** funcionan distinto en Node y en el navegador.
5. **Un iframe no aporta nada al SEO**: su contenido no se atribuye a la página
   contenedora.

**La conclusión práctica:** si SEO y SSR son requisitos duros y el equipo es
pequeño, los micro-frontends **de composición en cliente** son mala idea. La
alternativa que sí encaja es la **composición en servidor** (§1.4b), que es
precisamente el modelo que usan los e-commerce grandes con SEO crítico.

---

### 1.9 El coste honesto

Lo que se paga, y conviene poder enumerarlo:

| Coste | Manifestación |
|-------|---------------|
| **Rendimiento** | Dependencias duplicadas, más peticiones, más JS |
| **Operación** | N pipelines, N despliegues, N entornos, N monitorizaciones |
| **Depuración** | Un error atraviesa varios artefactos con sourcemaps distintos |
| **Consistencia de UX** | Sin un design system férreo, el producto se ve roto |
| **Testing** | Los tests E2E necesitan el sistema entero ensamblado |
| **Cognitivo** | Cada desarrollador debe entender el contrato de integración |

> **Micro-frontends son una solución organizativa con un coste técnico.**
> Si la organización no tiene el problema, solo queda el coste.

---

## Parte 2 — Práctica (acotada a propósito)

Montar micro-frontends reales aquí sería desproporcionado y además chocaría con el
SSR (§1.8). La práctica se enfoca en lo que el enunciado pide de verdad:
**criterio para decidir** y **una estrategia aplicada a un problema de negocio**.

### Ejercicio 1 — ADR: ¿debería este laboratorio ser micro-frontends? ⭐ Recomendado

El entregable con más valor de assessment, y el de menor esfuerzo.

Escribe un **Architecture Decision Record** en `docs/adr/001-micro-frontends.md`.

**Lineamientos:**

1. **Usa el formato estándar de ADR:** Contexto · Decisión · Alternativas
   consideradas · Consecuencias · Estado.
2. **Describe el contexto real**: un desarrollador, una aplicación Angular con SSR,
   SEO como requisito explícito (tema 01), dominios acoplados.
3. **Recorre el árbol de §1.3 de forma explícita**, mostrando el razonamiento paso
   a paso, no solo la conclusión.
4. **Documenta las alternativas descartadas y por qué.** Un ADR que solo justifica
   la opción elegida vale la mitad.
5. **Define los disparadores que cambiarían la decisión.** Ejemplo: *"si llegamos
   a 3 equipos con cadencias distintas, reevaluar"*. Esto es lo que distingue un
   ADR real de un ejercicio.
6. **Sé honesto:** para este proyecto la respuesta correcta es **no**. Defender
   bien un "no" demuestra más criterio que forzar un "sí".

**Criterios de aceptación:**
- [ ] Sigue el formato de ADR
- [ ] La decisión es "no", y está argumentada con el árbol de decisión
- [ ] Menciona explícitamente el conflicto con SSR/SEO del §1.8
- [ ] Propone la alternativa adecuada (monolito modular / Nx)
- [ ] Incluye disparadores de reevaluación

---

### Ejercicio 2 — Aplicar una estrategia a un problema de negocio ⭐ Recomendado

El enunciado pide *"aplicar alguna estrategia para solucionar un problema de
negocio"*. Aquí lo haces **sobre un caso planteado**, no sobre este laboratorio.

**El caso.** *Rick & Morty Explorer* es adquirido por una empresa de medios que
quiere **embeber la ficha de personaje en los artículos de su portal de noticias**.
El portal está hecho en **WordPress con React**, lo mantiene **otro equipo**, y
debe seguir funcionando aunque tu servicio caiga.

**Lineamientos:**

1. **Recorre los dos ejes de §1.5** y decide el runtime. Presta atención a "código
   de terceros", "otro equipo" y "tolerancia a fallos".
2. **Elige la estrategia de composición** (§1.4) y justifícala contra al menos una
   descartada.
3. **Resuelve los cinco problemas transversales** (§1.6) para este caso concreto.
   Algunos serán triviales; di por qué.
4. **Define el contrato de integración**: qué recibe, qué emite, cómo se versiona.
5. **Piensa el SEO** (§1.8): ¿el contenido embebido debe indexarse en el portal?
   ¿Quién se lleva la autoridad? Es una pregunta de negocio, no solo técnica.

**Criterios de aceptación:**
- [ ] Runtime elegido y justificado con los dos ejes
- [ ] Estrategia de composición elegida, con una alternativa descartada
- [ ] Contrato de integración definido
- [ ] Consecuencias de SEO analizadas

---

### Ejercicio 3 — Spike técnico: Angular Elements 🔧 Opcional

Si quieres tener **código** que enseñar además del análisis. Es la implementación
natural del ejercicio 2.

**Lineamientos:**

1. `npm i @angular/elements`.
2. **No toques la aplicación SSR.** Crea un *target* de build aparte en
   `angular.json` con su propio punto de entrada. Si mezclas esto con
   `outputMode: server`, romperás el build actual.
3. Expón `CharacterCard` como custom element con `createCustomElement`.
4. **Entrada por atributo:** un custom element recibe **strings**. Decide si pasas
   el objeto serializado o solo el `id` y el componente resuelve los datos.
5. **Salida por evento:** emite un `CustomEvent` al hacer clic, en lugar de
   navegar. El anfitrión decide qué hacer — eso es un buen contrato.
6. Verifica con un `.html` estático que cargue el bundle y use la etiqueta. Si
   funciona sin Angular en la página anfitriona, la estrategia está demostrada.

**Criterios de aceptación:**
- [ ] `npm run build` de la app original sigue funcionando
- [ ] El elemento se usa desde un HTML plano, sin Angular
- [ ] La comunicación es por atributos y eventos, no por acoplamiento directo
- [ ] Anotas el peso del bundle y lo comentas (§1.9)

> **Advertencia:** este spike **no** debe integrarse en la app principal. Su valor
> es demostrar que entiendes el modelo, no complicar el laboratorio.

---

## Parte 3 — Preguntas de assessment

<details>
<summary><b>¿Qué problema resuelven los micro-frontends?</b></summary>

Un problema **organizativo**, no técnico: permiten que varios equipos desplieguen
de forma independiente sobre un mismo producto.

Es la aplicación deliberada de la Ley de Conway. Los síntomas que resuelven son de
coordinación humana —colas de despliegue, release trains, miedo a tocar código
ajeno—, no de arquitectura de código.

Si el problema que tienes es acoplamiento de código y no de despliegue, la
respuesta correcta es un monolito modular o un monorepo con fronteras forzadas.
</details>

<details>
<summary><b>¿Cuándo NO usarías micro-frontends?</b></summary>

- Con **uno o dos equipos** — el caso más común
- Cuando **SEO y SSR** son requisitos duros (§1.8)
- Cuando la UI está **fuertemente entrelazada** (un editor, un dashboard)
- Cuando el **rendimiento** es crítico y no puedes duplicar payload
- Sin **madurez de CI/CD** por equipo: sin ella, la autonomía es ficción
- Cuando el objetivo es "modernizar" sin un problema concreto

Antes de adoptarlos hay que agotar el monorepo con reglas de dependencia (Nx), que
resuelve la mayor parte de los dolores con una fracción del coste.
</details>

<details>
<summary><b>Explica runtime compartido vs. no compartido</b></summary>

**Compartido**: todos los micro-frontends viven en el mismo contexto de JavaScript
—mismo `window`, mismo DOM—. Se integran de forma fluida y pueden compartir
dependencias, pero no hay aislamiento: un error puede tumbar la página, el CSS se
filtra y las versiones quedan acopladas. Mecanismos: Native Federation,
single-spa, Web Components.

**No compartido**: cada uno en su propio contexto, típicamente un iframe.
Aislamiento total de JS, CSS y fallos, e independencia de versiones absoluta. A
cambio: peso duplicado, comunicación solo por `postMessage`, costuras de UX, y
problemas serios de SEO y accesibilidad porque el documento está partido en dos.

**La regla:** runtime no compartido cuando necesitas **una frontera** (terceros,
seguridad, legacy); compartido cuando necesitas **una experiencia**.
</details>

<details>
<summary><b>Dentro de un runtime compartido, ¿conviene compartir el framework?</b></summary>

Es un trade-off, no una respuesta única.

Declarar Angular como `singleton` evita descargarlo varias veces, pero crea
**acoplamiento de versión**: nadie puede migrar a la siguiente mayor hasta que
todos puedan — que es justo el problema de coordinación que se quería eliminar.

Regla práctica: comparte lo estable y de bajo riesgo (framework, design system) y
no compartas lo volátil. Y mide antes de asumir: con HTTP/2 y buen caching, la
duplicación puede salir más barata que el acoplamiento.

Ojo con un efecto sutil: si no se comparte, cada micro-frontend tiene **su propia
instancia** de los servicios `providedIn: 'root'`. Lo que parecía un singleton
deja de serlo.
</details>

<details>
<summary><b>¿Module Federation en Angular moderno?</b></summary>

**Cuidado con esta pregunta.** Module Federation es una funcionalidad de
**webpack 5**, y desde Angular 17 el builder por defecto es
`@angular/build:application`, basado en **esbuild/Vite**. Webpack ya no está en la
ruta por defecto.

La opción actual es **Native Federation**
(`@angular-architects/native-federation`), que reimplementa el mismo modelo mental
—`shared`, `remotes`, `exposes`— sobre **ES modules e import maps**, que son
estándares del navegador y por tanto independientes del bundler.

Responder "Module Federation" sin este matiz delata material desactualizado.
</details>

<details>
<summary><b>¿Cómo se comunican dos micro-frontends?</b></summary>

La primera respuesta debe ser **minimizando la necesidad**: si dos micro-frontends
comparten mucho estado, probablemente deberían ser uno solo.

Cuando hace falta, de menos a más acoplamiento:

1. **Parámetros de URL** — el mecanismo más desacoplado, y además enlazable
2. **`CustomEvent` en el DOM** — funciona entre stacks distintos
3. **Un bus de eventos** provisto por el contenedor
4. **Estado compartido** — el más cómodo y el que más acopla; evítalo

Con runtime no compartido (iframe) solo existe `postMessage`, asíncrono y
serializado — lo que fuerza un contrato explícito, que es justamente su ventaja.
</details>

<details>
<summary><b>¿Qué problemas transversales aparecen?</b></summary>

Cinco: **enrutamiento** (quién es dueño de la URL), **comunicación y estado**,
**aislamiento de estilos**, **autenticación** (debe resolverse una vez en el
contenedor) y **versionado de contratos**.

El último es el más subestimado: la interfaz entre contenedor y micro-frontend es
una API y necesita versionado y tests de contrato. Sin eso, "desplegar de forma
independiente" significa "romper a los demás de forma independiente".
</details>

<details>
<summary><b>¿Por qué los micro-frontends se llevan mal con el SSR?</b></summary>

Porque el ensamblaje tiene que ocurrir **dos veces** —en servidor y en cliente— y
producir exactamente el mismo HTML; si no, la hidratación falla. Además, cargar
remotos durante el render del servidor añade latencia y un punto de fallo, y los
import maps se comportan distinto en Node y en el navegador.

Y en el caso de los iframes es peor: su contenido **no se atribuye** a la página
contenedora a efectos de indexación.

Por eso, cuando SEO y SSR son requisitos duros, la estrategia que encaja es la
**composición en servidor** (SSI/ESI), no la composición en cliente.
</details>

<details>
<summary><b>¿Cómo mantienes consistente la UI?</b></summary>

Con un **design system compartido y versionado**, distribuido como paquete e
integrado como dependencia compartida. Sin él, el resultado inevitable son cinco
tonos de azul y seis variantes de botón.

Es la excepción interesante a la regla de la independencia: **el design system sí
debe estar acoplado**, porque su propósito es precisamente imponer consistencia.
Se gestiona con versionado semántico y una política clara de cambios rompientes.
</details>

<details>
<summary><b>¿Recomendarías micro-frontends para este laboratorio?</b></summary>

No, y saber decirlo es la respuesta correcta.

Un solo desarrollador, un único dominio de negocio, dominios acoplados y —
decisivo— **SSR con SEO como requisito explícito**, que es justo el escenario donde
la composición en cliente peor encaja.

El coste (pipelines, contratos, riesgo de hidratación, payload duplicado) no compra
nada, porque no existe el problema de coordinación que los justifica.

Lo que sí aplicaría: mantener fronteras de módulo limpias, para que **si** algún
día aparecen varios equipos, la extracción sea posible.
</details>

---

## Referencias

- [Micro Frontends — Martin Fowler / Cam Jackson](https://martinfowler.com/articles/micro-frontends.html) — el artículo canónico
- [micro-frontends.org](https://micro-frontends.org/) — Michael Geers
- [Native Federation para Angular](https://www.npmjs.com/package/@angular-architects/native-federation)
- [Angular Elements](https://angular.dev/guide/elements)
- [single-spa](https://single-spa.js.org/)
- [Nx — reglas de fronteras entre módulos](https://nx.dev/features/enforce-module-boundaries) — la alternativa que hay que descartar primero
