# 04 — Patrones de diseño (GoF) aplicados al frontend

> **Tema:** aplicar conscientemente al menos 3 patrones del *Gang of Four* en frontend
> **Estado:** teoría y auditoría completas. **La implementación la hace Esteban** (Parte 2).

---

## Parte 1 — Teoría

### 1.1 El encuadre correcto (y el error de partida)

*Design Patterns* (Gamma, Helm, Johnson, Vlissides — 1994) catalogó 23 soluciones
recurrentes a problemas de diseño orientado a objetos. Los autores son el
"Gang of Four".

El error típico al abordar este tema es **salir a buscar dónde meter patrones**.
Eso produce código peor: abstracciones sin motivo, indirección gratuita y una
factoría que envuelve un `new`.

> **Los patrones se descubren, no se imponen.**
> Un patrón es la respuesta a una **tensión concreta** en el código. Si no puedes
> nombrar el problema que resuelve, no lo apliques.

Por eso la Parte 2 de este documento **no** propone patrones sueltos: parte de
problemas reales y verificados en este laboratorio y llega al patrón que los
resuelve. Ese orden es el que se evalúa.

Y hay un segundo encuadre igual de importante:

> **Angular ya está construido sobre patrones GoF.**
> La respuesta valiosa en un assessment no es "yo añadiría un Singleton", sino
> "el framework ya usa estos, así es como se llaman, y este es el matiz".

---

### 1.2 Los 23, para ubicarse

| Creacionales | Estructurales | De comportamiento |
|--------------|---------------|-------------------|
| Abstract Factory | Adapter | Chain of Responsibility |
| Builder | Bridge | Command |
| Factory Method | Composite | Interpreter |
| Prototype | Decorator | Iterator |
| Singleton | Facade | Mediator |
| | Flyweight | Memento |
| | Proxy | Observer |
| | | State |
| | | Strategy |
| | | Template Method |
| | | Visitor |

No hace falta memorizarlos. Sí hace falta **reconocer los que ya usas a diario**.

---

### 1.3 Los que Angular ya usa (y cómo se llaman)

Esta tabla es, por sí sola, media respuesta de assessment:

| Patrón | Dónde vive en Angular |
|--------|----------------------|
| **Observer** | RxJS `Observable`, `Subject`, `EventEmitter` |
| **Singleton** | `providedIn: 'root'` — **con matices, ver §1.4** |
| **Factory Method / Abstract Factory** | Los proveedores de DI: `useFactory`, `useClass`, `useExisting` |
| **Builder** | `FormBuilder`, la API fluida e inmutable de `HttpParams` |
| **Composite** | El árbol de componentes; `FormGroup`/`FormArray`/`FormControl` sobre `AbstractControl` |
| **Strategy** | `TitleStrategy`, `PreloadingStrategy`, `ErrorHandler`, `ValidatorFn` |
| **Chain of Responsibility** | Los interceptores HTTP |
| **Proxy** | Los interceptores actuando como intermediarios de `HttpClient` |
| **Iterator** | `@for` sobre iterables; `IterableDiffer` |
| **Template Method** | Los hooks de ciclo de vida: el framework define la secuencia, tú rellenas los pasos |
| **Facade** | El patrón habitual de servicio que oculta un subsistema |

**El ejemplo más limpio es Reactive Forms**, porque son **dos patrones a la vez**:

- `FormBuilder` → **Builder**: construye un objeto complejo paso a paso
- `AbstractControl` con `FormControl` (hoja) y `FormGroup`/`FormArray` (compuesto)
  → **Composite**: tratas de forma uniforme un control simple y un árbol entero.
  Por eso `.value`, `.valid` y `.reset()` funcionan igual en cualquier nivel.

---

### 1.4 Las cuatro trampas de nomenclatura ⭐

Aquí es donde se separan las respuestas. Son colisiones de nombre reales.

#### Trampa 1: `@Component` **no** es el patrón Decorator

Los decoradores de TypeScript son **anotaciones de metadatos**: marcan una clase
para que el compilador y el framework la traten de cierto modo.

El **Decorator de GoF** es otra cosa: envuelve un objeto para añadirle
responsabilidades en tiempo de ejecución **conservando su interfaz**, de modo que
el cliente no distingue el objeto envuelto del original.

Comparten la palabra y nada más. En Angular, lo más cercano al Decorator de GoF
son los **interceptores HTTP**, que envuelven el manejador conservando su firma.

#### Trampa 2: `providedIn: 'root'` **no** es el Singleton de GoF

El Singleton clásico es una clase que **controla su propia instancia** mediante un
accesor estático global (`Logger.getInstance()`). Hoy se considera mayormente un
antipatrón: esconde dependencias, introduce estado global y dificulta los tests.

Angular consigue el **propósito** —una sola instancia— sin ninguno de esos costes:

| | Singleton GoF | `providedIn: 'root'` |
|---|---|---|
| Quién controla la instancia | La propia clase | El **inyector** |
| Cómo se obtiene | Accesor estático global | Se **declara** como dependencia |
| Dependencia visible | No, oculta en el código | **Sí**, explícita |
| Sustituible en tests | Difícil | Trivial, cambiando el proveedor |
| Alcance | Global al proceso | Del inyector: `root`, ruta o componente |

**La respuesta correcta:** *"Angular logra la intención del Singleton a través de
la inyección de dependencias, evitando los inconvenientes de su implementación
clásica."* Y un matiz que casi nadie añade: **no es global** — un servicio provisto
en un componente tiene una instancia por instancia de ese componente.

#### Trampa 3: signals no son exactamente Observer

**Observer** (RxJS) es **push**: el sujeto notifica a sus suscriptores cuando algo
cambia, y estos reaccionan.

Los **signals** son un grafo reactivo con **rastreo automático de dependencias** y
evaluación perezosa: `computed()` no se recalcula hasta que alguien lo lee. Está
emparentado con Observer, pero el mecanismo es distinto (push-pull, no push puro).

Decir "los signals son el patrón Observer" no es del todo falso, pero precisar la
diferencia demuestra que entiendes ambos.

#### Trampa 4: MVC, MVVM, Redux y DI **no** son patrones GoF

MVC y MVVM son **patrones arquitectónicos**. Redux es una arquitectura de estado
(inspirada en Flux, con eco del Command y del Memento). La inyección de
dependencias es un principio, no un patrón del catálogo.

Si en un ejercicio sobre GoF respondes "uso MVC", estás fuera del catálogo.

---

### 1.5 El matiz moderno: muchos patrones son ahora funciones

En 1994 el catálogo asumía un lenguaje sin funciones de primera clase. En
TypeScript, varios patrones colapsan:

| Patrón | Implementación clásica | En TypeScript moderno |
|--------|------------------------|-----------------------|
| **Strategy** | Interfaz + N clases | Un **tipo función**. `ValidatorFn` es exactamente esto |
| **Command** | Clase con `execute()` | Una función, o un objeto de acción |
| **Template Method** | Clase abstracta con hooks | Una función que recibe callbacks |
| **Factory Method** | Subclases que sobrescriben | Una función que devuelve el objeto |

Angular lo refleja en su propia evolución: los interceptores pasaron de clases con
`HttpInterceptor` a **funciones** (`HttpInterceptorFn`), y los guards de clases a
`CanActivateFn`. Mismo patrón, menos ceremonia.

> **La respuesta que suma:** *"Strategy con un solo método es, en TypeScript, un
> tipo función. El patrón sigue estando; lo que desaparece es la clase."*

---

## Parte 2 — Práctica: qué aplicar aquí y por qué

Cada apartado empieza por un **problema verificado** en este laboratorio. El
patrón es la consecuencia, no el punto de partida.

Los tres primeros son los recomendados para cumplir el "al menos 3".

---

### Patrón 1 — Adapter 🔴 El más justificado

#### El problema (verificado contra la API)

`src/app/interfaces/characters.interface.ts` describe la respuesta cruda de la API,
y **miente en tres sitios**:

| Declarado | Realidad comprobada |
|-----------|---------------------|
| `created: Date` | `"2017-11-04T18:48:46.250Z"` → es un **`string`**. `JSON.parse` nunca produce un `Date` |
| `next: string` | En la última página vale `null` |
| `prev: null` | Desde la página 2 vale un `string` |

La primera es un **bug latente**: `character.created.getFullYear()` compila sin
protestar y revienta en ejecución. TypeScript confía en lo que declaras, y aquí lo
declarado es falso.

Hay dos problemas más:

- La interfaz se llama **`Location`**, que colisiona con el tipo global del DOM.
- Los valores llegan en inglés (`"Alive"`, `"Human"`) y se pintan directamente en
  la UI — el problema de idioma del **tema 02, ejercicio 7**.

#### El patrón

> **Adapter** — *"Convierte la interfaz de una clase en otra que los clientes
> esperan."*

Aquí: convertir el **DTO** (la forma exacta que devuelve la API, con sus
imperfecciones) en un **modelo de dominio** (la forma que tu aplicación quiere
usar). La frontera queda en un solo sitio.

#### Lineamientos

1. **Separa los dos tipos en archivos distintos.** Un `*.dto.ts` que describa la
   API **con total honestidad** (incluido `created: string` y las nulabilidades
   reales), y un modelo de dominio con lo que tu app necesita.
2. **Nómbralos sin ambigüedad:** `CharacterDto` frente a `Character`. Y aprovecha
   para renombrar `Location`.
3. **Escribe funciones de mapeo puras.** Entrada DTO, salida dominio. Sin
   inyección, sin efectos: así son triviales de testear.
4. **Aplícalo en el servicio**, con `map()` dentro del pipe. Ese es el punto donde
   se cruza la frontera: **nada aguas abajo debe volver a ver un DTO**.
5. **Decide el tipado de los valores cerrados.** `status` solo puede ser
   `'Alive' | 'Dead' | 'unknown'`. Una unión te da autocompletado y exhaustividad
   en los `switch`. Piensa si haces lo mismo con `species`.
6. **Piensa el idioma aquí.** El adaptador es el lugar natural para traducir, y
   resolvería de paso el ejercicio 7 del tema 02. Pero ojo: si traduces, el JSON-LD
   del tema 01 debería seguir emitiendo el valor original o el traducido, no una
   mezcla. Decide y documéntalo.
7. **No hace falta adaptador inverso**: esta app solo lee.

#### Criterios de aceptación

- [ ] Ningún componente ni plantilla importa un tipo `*Dto`
- [ ] `created` es un `Date` real en tiempo de ejecución
- [ ] `next` y `prev` reflejan su nulabilidad real
- [ ] No queda ningún tipo que colisione con un global del DOM
- [ ] Las funciones de mapeo son puras
- [ ] Si un campo de la API cambiara, **solo** habría que tocar el adaptador

---

### Patrón 2 — Strategy 🟠 El más idiomático en Angular

#### El problema

El SEO del tema 01 funciona, pero **cada página repite el mismo `ngOnInit`**:

```ts
ngOnInit(): void {
  this._seo.update(PAGE_SEO.about);
}
```

Está en `about`, `contact`, `pricing`, `not-found`, `characters-page` y
`character-details`. Son seis sitios que hay que recordar. Si mañana añades una
página y olvidas el `ngOnInit`, esa ruta se queda con los metadatos de la anterior.

Es decir: **el conocimiento de "qué SEO tiene cada ruta" está disperso en los
componentes, cuando en realidad es una propiedad de la ruta.**

#### El patrón

> **Strategy** — *"Define una familia de algoritmos, encapsula cada uno y hazlos
> intercambiables."*

Angular expone `TitleStrategy` como **clase abstracta** precisamente para esto:
es un punto de extensión con forma de Strategy. La estrategia por defecto
(`DefaultTitleStrategy`) solo fija el `<title>`; puedes sustituirla por una que
aplique **todo** el paquete SEO.

#### Lineamientos

1. **Estudia primero el contrato.** `TitleStrategy` es abstracta con un método
   `updateTitle(snapshot)`. Mira su definición en
   `node_modules/@angular/router/index.d.ts`.
2. **Mueve los metadatos a la configuración de rutas.** Angular acepta `title` como
   string **o como `ResolveFn`**, y `data` para lo demás. Ahí es donde
   conceptualmente pertenecen.
3. **Implementa tu estrategia** y regístrala con
   `{ provide: TitleStrategy, useClass: … }` en `app.config.ts`. Fíjate en que
   **sustituir una implementación por otra sin tocar al cliente es exactamente
   la definición del patrón**.
4. **Las rutas dinámicas son el caso interesante.** El título de
   `/character/:id` depende de la API. Investiga los **resolvers**: si los datos
   se resuelven antes de activar la ruta, la estrategia ya los tiene disponibles.
5. **Bonus de dos temas anteriores.** Con resolver, los metadatos existen **antes**
   del primer render — lo que arregla de paso el problema de *timing* del
   **tema 02, ejercicio 5** (el anunciador leía el título anterior).
6. **Sé honesto sobre el alcance.** `TitleStrategy` se llama así por el título,
   pero se ejecuta en cada navegación, lo que la hace un buen punto para el SEO
   completo. Si te parece un abuso del nombre, dilo y justifica la alternativa —
   esa reflexión vale.

#### Criterios de aceptación

- [ ] Ningún componente de página llama a `Seo.update()` en su `ngOnInit`
- [ ] Los metadatos viven en la configuración de rutas
- [ ] Las rutas dinámicas funcionan igual que las estáticas
- [ ] El SSR sigue emitiendo las metas correctas (verifícalo como en el tema 01)
- [ ] Sabes explicar por qué esto es Strategy y no Template Method

---

### Patrón 3 — Chain of Responsibility 🟠 El más visible

#### El problema

`CharactersService` llama a una API externa **sin ninguna red de seguridad**: si
falla, falla. Sin reintento, sin registro, sin traducción del error. Y la URL base
está repetida en dos métodos.

#### El patrón

> **Chain of Responsibility** — *"Evita acoplar el emisor al receptor dando a más
> de un objeto la oportunidad de atender la petición."*

Los **interceptores HTTP de Angular son literalmente esto**: cada uno recibe la
petición y decide si la atiende, la transforma o la pasa al siguiente con `next`.

#### Lineamientos

1. **Usa interceptores funcionales** (`HttpInterceptorFn`), no clases: es la API
   actual, y conecta con el §1.5.
2. **Regístralos con `withInterceptors([...])`** en el `provideHttpClient` de
   `app.config.ts`.
3. **El orden importa, y es la esencia del patrón.** Se ejecutan en el orden
   declarado a la ida y en orden inverso a la vuelta. Un interceptor de registro
   antes o después del de reintento mide cosas distintas. **Documenta tu orden.**
4. **Elige dos o tres responsabilidades pequeñas y separadas**, no una grande.
   Candidatos con sentido aquí: reintento con espera, medición de tiempos,
   traducción de error HTTP a error de dominio, o inyección de la URL base.
5. **Cada interceptor, una responsabilidad.** Si el tuyo hace dos cosas, son dos.
6. **Cuidado con el SSR.** El interceptor corre también en el servidor. Un log en
   consola aparecerá en los logs de Netlify; un reintento multiplica la latencia
   del render. Decide qué debe ejecutarse en cada entorno.
7. **Fíjate en lo que ya tienes:** `provideClientHydration()` ya activa la caché de
   transferencia HTTP, que evita repetir en el cliente las peticiones hechas en el
   servidor. No reimplementes eso.

#### Criterios de aceptación

- [ ] Al menos dos interceptores, cada uno con una sola responsabilidad
- [ ] El orden está documentado y justificado
- [ ] `CharactersService` no cambió: el patrón es transparente para el cliente
- [ ] El comportamiento en SSR está considerado explícitamente
- [ ] Sabes explicar la diferencia entre esto, Decorator y Proxy

---

### Patrón 4 — Facade 🟡 Opcional

#### El problema

`characters-page.ts` hace demasiadas cosas: lee parámetros de ruta, dispara HTTP,
mantiene tres signals, calcula la paginación y aplica SEO. Además usa un `effect()`
para lanzar una petición, que es un antipatrón documentado (los efectos son para
sincronizar con el exterior, no para orquestar datos).

#### El patrón

> **Facade** — *"Proporciona una interfaz unificada a un conjunto de interfaces de
> un subsistema."*

Un servicio que exponga `characters()`, `totalPages()`, `isLoading()` y
`loadPage(n)`, y que oculte HTTP, adaptación y estado.

#### Lineamientos

1. **Define primero la interfaz pública** que querrías desde el componente, y
   luego impleméntala. Al revés se acaba filtrando el subsistema.
2. **El componente no debe saber que existe `HttpClient`.**
3. **Aprovecha para investigar `resource()` / `rxResource()`**, la API de Angular
   para carga asíncrona con signals. Es la sustituta natural del `effect()` actual.
4. **Ojo con el alcance del servicio.** Si lo provees en `root`, el estado
   sobrevive a la navegación; si lo provees en el componente, no. Es una decisión,
   no un detalle — y conecta con el matiz del §1.4 sobre `providedIn`.

---

### Patrón 5 — Builder + Composite 🟡 Opcional, dos por el precio de uno

#### El problema

La página de contacto muestra un correo estático. No hay formulario, así que la
aplicación **no ejercita Reactive Forms** en absoluto — y es donde Angular exhibe
dos patrones GoF a la vez.

#### Los patrones

- **`FormBuilder`** → **Builder**: construye paso a paso un objeto complejo.
- **`AbstractControl`** → **Composite**: `FormControl` es la hoja,
  `FormGroup`/`FormArray` el compuesto, y ambos comparten interfaz. Por eso
  `.value`, `.valid` y `.reset()` se comportan igual a cualquier nivel del árbol.
- **`ValidatorFn`** → **Strategy** en su forma moderna: un tipo función
  intercambiable (§1.5).

#### Lineamientos

1. Construye el formulario con `FormBuilder`, no con `new FormGroup(...)`. Compara
   ambos y anota por qué uno se llama Builder.
2. **Anida un `FormGroup`** dentro del formulario (por ejemplo, datos de contacto)
   para que el Composite sea visible, no teórico.
3. **Escribe un validador personalizado** como `ValidatorFn`. Ahí es donde ves el
   Strategy: la misma interfaz, algoritmos intercambiables.
4. **Hazlo accesible desde el principio** — es la mejor forma de consolidar el
   tema 02: `<label for>` real, `aria-invalid` sincronizado con el estado del
   control, `aria-describedby` apuntando al mensaje de error, y el error anunciado
   con la live region adecuada.
5. Recorre el árbol con `.get('grupo.campo')` y observa que la ruta funciona
   uniformemente: esa uniformidad **es** el Composite.

---

## Parte 3 — Preguntas de assessment

<details>
<summary><b>Nombra tres patrones GoF que uses en Angular</b></summary>

- **Observer** — RxJS: `Observable`, `Subject`, `EventEmitter`.
- **Strategy** — puntos de extensión como `TitleStrategy`, `PreloadingStrategy`,
  `ErrorHandler`; y `ValidatorFn`, que es Strategy en forma de función.
- **Chain of Responsibility** — los interceptores HTTP: cada uno atiende la
  petición o la pasa al siguiente con `next`.

Y si quieres un ejemplo que valga por dos: **Reactive Forms** son **Builder**
(`FormBuilder`) y **Composite** (`FormControl` como hoja, `FormGroup` como
compuesto sobre `AbstractControl`) simultáneamente.
</details>

<details>
<summary><b>¿<code>@Component</code> es el patrón Decorator?</b></summary>

**No.** Es una colisión de nombres.

Los decoradores de TypeScript son **anotaciones de metadatos** que marcan una clase
para que el framework la procese. El **Decorator de GoF** envuelve un objeto para
añadirle responsabilidades en tiempo de ejecución **conservando su interfaz**, de
forma que el cliente no distingue el original del envuelto.

En Angular, lo más cercano al Decorator de GoF son los **interceptores HTTP**.
</details>

<details>
<summary><b>¿<code>providedIn: 'root'</code> es el patrón Singleton?</b></summary>

Cumple su **intención** —una sola instancia— pero no su implementación, y la
diferencia importa.

El Singleton clásico controla su propia instancia con un accesor estático global.
Eso oculta dependencias, introduce estado global y complica los tests; hoy se
considera mayormente un antipatrón.

En Angular la instancia la controla el **inyector**: la dependencia se declara
explícitamente y en un test se sustituye cambiando el proveedor. Además **no es
global**: el alcance es el del inyector, así que un servicio provisto en un
componente tiene una instancia por cada instancia de ese componente.

Respuesta corta: *"logra la intención del Singleton mediante DI, evitando los
inconvenientes de su implementación clásica"*.
</details>

<details>
<summary><b>¿Cuándo usarías Adapter en frontend?</b></summary>

Cuando la forma de los datos que te da una API **no** es la que tu aplicación
quiere usar. Traduces en la frontera —normalmente en el servicio, con `map()`— y
nada aguas abajo vuelve a ver el DTO.

Resuelve tres cosas: aísla la app de los cambios de la API, permite corregir un
tipado deshonesto, y da un sitio natural para normalizar (fechas, uniones,
traducciones).

En este laboratorio está plenamente justificado: la interfaz declara
`created: Date` cuando la API devuelve un `string`, y las nulabilidades de
`next`/`prev` están invertidas respecto a la realidad.
</details>

<details>
<summary><b>Diferencia entre Strategy, Template Method y State</b></summary>

Los tres intercambian comportamiento, pero por motivos distintos:

- **Strategy** — el **cliente** elige el algoritmo, y todos son intercambiables
  entre sí. Composición.
- **Template Method** — la **clase base** fija la secuencia y las subclases
  rellenan pasos concretos. Herencia. Los hooks de ciclo de vida de Angular
  responden a esta idea.
- **State** — el objeto **cambia su propio comportamiento** al cambiar su estado
  interno, y las transiciones forman parte del patrón.

Regla mnemotécnica: Strategy es *cómo* hacerlo, State es *qué* soy ahora.
</details>

<details>
<summary><b>Diferencia entre Decorator, Proxy y Chain of Responsibility</b></summary>

Los tres envuelven a otro objeto conservando la interfaz; cambia la **intención**:

- **Decorator** — **añadir** responsabilidades. Se apilan varios.
- **Proxy** — **controlar el acceso**: caché, carga perezosa, permisos. Suele haber
  uno.
- **Chain of Responsibility** — **decidir quién atiende**. Cada eslabón puede
  resolver o delegar, y puede cortar la cadena.

Los interceptores HTTP de Angular son sobre todo Chain of Responsibility, y según
lo que haga cada uno pueden comportarse como Decorator (añadir una cabecera) o
como Proxy (servir desde caché sin llegar al servidor).
</details>

<details>
<summary><b>¿Sigue teniendo sentido el catálogo GoF en JavaScript moderno?</b></summary>

Sí, pero varios patrones **cambian de forma**. El catálogo asumía un lenguaje sin
funciones de primera clase; en TypeScript, Strategy con un solo método es
simplemente un **tipo función**, y lo mismo ocurre con Command, Template Method
simple y Factory Method.

Angular lo refleja en su propia evolución: los interceptores pasaron de clases con
`HttpInterceptor` a funciones `HttpInterceptorFn`, y los guards de clases a
`CanActivateFn`. El patrón sigue estando; lo que desaparece es la ceremonia.

Los estructurales (Adapter, Facade, Composite, Proxy) mantienen su forma original,
porque tratan de relaciones entre objetos y no de encapsular un algoritmo.
</details>

<details>
<summary><b>¿MVC, MVVM o Redux son patrones GoF?</b></summary>

No. MVC y MVVM son **patrones arquitectónicos**, de otro nivel de abstracción.
Redux es una arquitectura de gestión de estado inspirada en Flux, con ecos del
Command (las acciones) y del Memento (los snapshots), pero no está en el catálogo.
La inyección de dependencias es un principio, no un patrón GoF.

Confundirlos es el error más común al hablar de "patrones" sin precisar de cuáles.
</details>

<details>
<summary><b>¿Cómo decides si aplicar un patrón?</b></summary>

Nombrando primero el **problema**. Si no puedes describir la tensión concreta que
te está haciendo daño —duplicación, acoplamiento, un cambio que obliga a tocar seis
archivos—, aplicar un patrón solo añade indirección.

Los patrones se **descubren** refactorizando, no se imponen al diseñar. La señal de
alarma es "vamos a usar el patrón X aquí" antes de que exista el dolor: eso produce
factorías que envuelven un `new` y abstracciones de un solo uso.
</details>

---

## Referencias

- Gamma, Helm, Johnson, Vlissides — *Design Patterns* (1994), el catálogo original
- [Refactoring Guru — Patrones de diseño](https://refactoring.guru/es/design-patterns) — la mejor referencia visual, en español
- [Angular — HTTP interceptors](https://angular.dev/guide/http/interceptors)
- [Angular — Reactive Forms](https://angular.dev/guide/forms/reactive-forms)
- [Angular — `TitleStrategy`](https://angular.dev/api/router/TitleStrategy)
