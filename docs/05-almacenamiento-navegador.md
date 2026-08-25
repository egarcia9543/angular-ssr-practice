# 05 — Guardado de datos en el navegador

> **Temas:** localStorage · sessionStorage · cookies · IndexedDB · base de datos en servidor · cuotas y expulsión · seguridad · **el choque con SSR**
> **Estado:** teoría y auditoría completas. **La implementación la hace Esteban** (Parte 2).

---

## Parte 1 — Teoría

### 1.1 La pregunta previa: ¿dónde debe vivir este dato?

Antes de elegir mecanismo hay que responder seis preguntas. La elección sale sola.

| Pregunta | Por qué decide |
|----------|----------------|
| **¿Quién lo necesita?** | Si el **servidor** debe conocerlo, solo hay una opción: cookies |
| **¿Cuánto debe durar?** | ¿La pestaña? ¿Hasta cerrar sesión? ¿Para siempre? |
| **¿Cuánto ocupa?** | 4 KB, 5 MB y "cientos de MB" son tres mundos distintos |
| **¿Qué forma tiene?** | ¿Clave-valor, o necesitas **consultar** por criterios? |
| **¿Es sensible?** | Todo lo del navegador es **legible por el usuario** y por cualquier XSS |
| **¿Debe sobrevivir al dispositivo?** | Si sí, no es almacenamiento de navegador: es tu base de datos |

> **La pregunta que más gente se salta es la primera**, y en una aplicación con SSR
> es la más importante. Ver §1.10.

---

### 1.2 Los cinco mecanismos de un vistazo

| | localStorage | sessionStorage | Cookies | IndexedDB | BD en servidor |
|---|---|---|---|---|---|
| **Capacidad** | ~5–10 MB | ~5–10 MB | **~4 KB** por cookie | Cientos de MB+ | Ilimitada |
| **Duración** | Hasta borrarlo | Hasta cerrar la pestaña | La que definas | Hasta borrarlo | Permanente |
| **Alcance** | Origen | **Pestaña** + origen | Dominio + ruta | Origen | Global |
| **API** | Síncrona | Síncrona | Síncrona (JS) | **Asíncrona** | Red |
| **Bloquea el hilo** | **Sí** | **Sí** | Sí | No | No |
| **¿Va al servidor?** | No | No | **Sí, en cada petición** | No | — |
| **¿Legible en SSR?** | **No** | **No** | **Sí** | **No** | Sí |
| **Tipos** | Solo `string` | Solo `string` | Solo `string` | Objetos, `Blob`, `File` | Los que definas |
| **Consultable** | No | No | No | **Sí (índices, cursores)** | Sí |
| **Entre dispositivos** | No | No | No | No | **Sí** |

Tres filas merecen atención especial: **"bloquea el hilo"**, **"¿va al servidor?"** y
**"¿legible en SSR?"**. Son las que deciden en los casos difíciles.

---

### 1.3 localStorage

```ts
localStorage.setItem('tema', 'oscuro');
const tema = localStorage.getItem('tema');   // string | null
localStorage.removeItem('tema');
```

**Lo bueno:** simplísimo, persistente, disponible en todos los navegadores.

**Lo que hay que saber, y casi nadie menciona:**

1. **Es síncrono y bloquea el hilo principal.** Cada lectura o escritura detiene el
   renderizado y la respuesta a eventos. Leer 200 KB de JSON al arrancar es una
   pausa perceptible, y **degrada el INP** (la métrica de Core Web Vitals que
   sustituyó a FID). Nunca lo pongas en un bucle ni en un handler de scroll.
2. **Solo guarda strings.** Todo pasa por `JSON.stringify`/`parse`, con el coste
   de serialización y el riesgo de que un `parse` de datos corruptos lance.
3. **Puede lanzar excepción.** En modo privado de algunos navegadores, o al superar
   la cuota, `setItem` lanza `QuotaExceededError`. **Envuélvelo siempre.**
4. **Se comparte entre pestañas del mismo origen**, y el evento `storage` te avisa
   de cambios hechos en *otras* pestañas — útil para sincronizar sesión.
5. **Cualquier JavaScript de la página lo lee.** Un XSS se lo lleva entero.

**Úsalo para:** preferencias no críticas, borradores, caché pequeña, estado de UI.
**No lo uses para:** tokens, datos sensibles, volúmenes grandes, datos que el
servidor necesite.

---

### 1.4 sessionStorage

Misma API que `localStorage`. **Una sola diferencia, pero define su uso:**

> El alcance es la **pestaña**, no el origen.

- Cada pestaña tiene su copia aislada. Dos pestañas del mismo sitio **no se ven**.
- Sobrevive a un recargado (F5), pero **muere al cerrar la pestaña**.
- Al duplicar una pestaña, el navegador **copia** su contenido.

**Úsalo para:** estado de un flujo de varios pasos, filtros de una búsqueda,
posición de scroll, datos que **no** deben filtrarse entre pestañas.

**El caso que lo justifica:** un usuario abre dos pestañas para comparar dos
productos. Con `localStorage` compartirían estado y se pisarían; con
`sessionStorage`, cada una mantiene el suyo.

---

### 1.5 Cookies — el mecanismo con más matices

Es el más antiguo, el más limitado en tamaño y **el único que el servidor ve**.

```
Set-Cookie: tema=oscuro; Max-Age=31536000; Path=/; Secure; HttpOnly; SameSite=Lax
```

#### Los atributos, y qué decide cada uno

| Atributo | Qué hace | Nota |
|----------|----------|------|
| `Expires` / `Max-Age` | Cuándo caduca | Sin ellos es de **sesión**: muere al cerrar el navegador |
| `Domain` | Qué dominios la reciben | Omitirlo es **más seguro**: la limita al host exacto |
| `Path` | Qué rutas la reciben | Casi siempre `/` |
| `Secure` | Solo por HTTPS | Obligatorio en producción |
| `HttpOnly` | **Invisible para JavaScript** | La defensa clave contra XSS |
| `SameSite` | Si viaja en peticiones de otros sitios | `Lax` (por defecto), `Strict`, `None` |
| `Partitioned` | Aísla por sitio incrustador (CHIPS) | Para incrustaciones legítimas de terceros |

**`SameSite` en detalle**, porque es lo que más se pregunta:

- **`Lax`** — se envía en navegaciones de nivel superior (seguir un enlace), no en
  peticiones subordinadas. **Es el valor por defecto** en los navegadores modernos.
- **`Strict`** — nunca en contexto de otro sitio. Muy seguro, pero si alguien llega
  desde Google a tu sitio, aparece deslogueado.
- **`None`** — se envía siempre. **Requiere `Secure`** obligatoriamente.

#### El coste que se olvida

**Las cookies viajan en TODAS las peticiones al dominio**: HTML, JSON, imágenes,
fuentes, CSS. 4 KB de cookies × 60 recursos = 240 KB subidos por carga, en un canal
de subida que suele ser el más lento. Por eso los sitios grandes sirven los
estáticos desde un dominio sin cookies.

**Regla:** las cookies son para **identificadores y banderas**, nunca para datos.

#### Lo legal

En la UE, las cookies **no esenciales** requieren consentimiento previo (RGPD +
ePrivacy). Las estrictamente necesarias —sesión, seguridad, balanceo— están
exentas. Y ojo: **la ley habla de acceso al dispositivo, no de "cookies"**, así que
usar `localStorage` para lo mismo **no te salva** del requisito.

#### El estado de las de terceros

Safari y Firefox las **bloquean por defecto** desde hace años. Google dio marcha
atrás en su plan de eliminarlas por completo en Chrome y optó por dar control al
usuario. Para incrustaciones legítimas existen **CHIPS** (`Partitioned`) y la
**Storage Access API**. Lo que sí es seguro: **no diseñes nada que dependa de
cookies de terceros**.

---

### 1.6 IndexedDB

Base de datos transaccional, **asíncrona** y orientada a objetos, dentro del
navegador.

**Lo que la distingue de verdad:**

1. **Asíncrona:** no bloquea el hilo principal. Es la única opción sensata para
   volúmenes grandes.
2. **Guarda objetos reales**, no strings: usa el algoritmo de *clonado
   estructurado*, así que admite objetos anidados, `Date`, `Blob`, `File`,
   `ArrayBuffer`, `Map`, `Set`.
3. **Es consultable:** *object stores* con **índices** y **cursores**. Puedes pedir
   "todos los personajes vivos ordenados por nombre" sin cargar todo en memoria.
4. **Transaccional:** atomicidad real.
5. **Capacidad grande**, en función del disco disponible.

**Lo malo:** la API nativa es verbosa y basada en eventos, de otra época. En la
práctica se usa un envoltorio: **`idb`** (mínimo, promesas) o **Dexie.js** (más
completo, con consultas fluidas).

**Úsalo para:** modo offline, caché de respuestas de API, archivos y medios, listas
grandes, cualquier cosa que necesites **consultar**.

> **No confundir con la Cache API.** Esa almacena pares petición/respuesta HTTP y
> se usa con Service Workers. IndexedDB guarda **datos**; la Cache API guarda
> **respuestas**. En una PWA se usan las dos, para cosas distintas.

**Eliminado:** WebSQL ya no existe en los navegadores. Si lo ves en un tutorial,
el tutorial es viejo.

---

### 1.7 Base de datos (servidor): cuándo el navegador no es el sitio

El almacenamiento de navegador es siempre **una caché o una comodidad**, nunca la
fuente de verdad. Va al servidor todo lo que cumpla alguna de estas:

- Debe estar disponible **en varios dispositivos**
- Es **compartido** entre usuarios
- Es la **fuente de verdad** del negocio
- Necesita **auditoría**, respaldo o integridad garantizada
- Es **sensible**: el usuario puede leer y modificar a mano cualquier cosa
  guardada en su navegador

> **Regla dura:** cualquier dato del navegador puede ser manipulado por el usuario.
> Un `localStorage.setItem('rol', 'admin')` está a dos clics de distancia. **Jamás
> confíes en el cliente para autorización.**

El patrón habitual es combinar: la BD es la verdad, y el navegador guarda una copia
para funcionar rápido u offline, sincronizando después.

---

### 1.8 Cuotas, expulsión y la trampa de Safari

**La cuota es por origen**, y la comparten IndexedDB, Cache API y los demás
mecanismos. Se consulta así:

```ts
const { quota, usage } = await navigator.storage.estimate();
```

**Dos modos de persistencia:**

- **Best-effort** (por defecto): el navegador puede **borrarlo** si necesita
  espacio.
- **Persistent**: se solicita con `navigator.storage.persist()`, y el navegador
  decide según el uso y el compromiso del usuario con el sitio.

#### La trampa que casi nadie conoce ⭐

**Safari (ITP) borra el almacenamiento escribible por scripts tras 7 días sin
interacción del usuario con el sitio.** Afecta a `localStorage`, `IndexedDB`, y a
las cookies puestas desde JavaScript (`document.cookie`), que además quedan
limitadas a 7 días de vida.

**Lo que NO cae en esa limitación:** las cookies de primera parte establecidas por
el **servidor** con la cabecera `Set-Cookie`.

Esto tiene una consecuencia de diseño directa: **si una preferencia debe durar de
verdad en Safari, ponla en una cookie escrita por el servidor**, no desde
JavaScript. Encaja perfectamente con la conclusión del §1.10.

**Y en modo privado/incógnito:** la cuota se reduce drásticamente y todo se borra
al cerrar. En algunos navegadores, `localStorage.setItem` directamente lanza. Otro
motivo para envolver siempre.

---

### 1.9 Seguridad

| Riesgo | Afecta a | Mitigación |
|--------|----------|------------|
| **XSS** | localStorage, sessionStorage, IndexedDB, cookies sin `HttpOnly` | `HttpOnly` en cookies; sanitizar; CSP |
| **CSRF** | Cookies (se envían solas) | `SameSite=Lax/Strict` + token anti-CSRF |
| **Manipulación** | **Todos** | Validar **siempre** en el servidor |
| **Fuga en dispositivo compartido** | Todo lo persistente | Preferir `sessionStorage`; limpiar al cerrar sesión |

#### El debate clásico: ¿dónde va el token de sesión?

Es una pregunta de entrevista muy frecuente. La respuesta con matiz:

- **`localStorage`** → vulnerable a **XSS**: cualquier script inyectado lo lee y lo
  exfiltra. Inmune a CSRF, porque hay que adjuntarlo a mano.
- **Cookie `HttpOnly` + `Secure` + `SameSite`** → **invisible para JavaScript**, así
  que un XSS no puede leerla. Vulnerable a CSRF, que se mitiga con `SameSite` y
  tokens.

**El consenso actual es la cookie `HttpOnly`**, porque el XSS es más frecuente y
más grave que el CSRF, y porque el CSRF tiene mitigaciones estándar y efectivas.

El matiz que remata: *"con un XSS activo estás comprometido en cualquier caso, pero
`HttpOnly` impide la exfiltración directa del token y eleva mucho el coste del
ataque."*

---

### 1.10 ⭐ Almacenamiento y SSR: el punto crítico de este proyecto

Aquí está lo específico de esta aplicación, y es donde el tema se vuelve
interesante en Angular.

#### El problema

`localStorage`, `sessionStorage`, `document.cookie` e `indexedDB` son APIs del
**navegador**. En el render del servidor, el código corre en **Node**, donde
sencillamente **no existen**:

```
ReferenceError: localStorage is not defined
```

#### La consecuencia arquitectónica

> **Las cookies son el único almacenamiento que el servidor puede leer.**
>
> Por lo tanto: **cualquier dato que deba influir en el HTML que emite el servidor
> tiene que ser una cookie.** Todo lo demás llega demasiado tarde.

Ejemplos de datos que **obligan** a cookie en una app con SSR:

- **Tema claro/oscuro** — si está en `localStorage`, el servidor pinta el tema por
  defecto y al hidratar cambia: el usuario ve un **destello** (*flash of incorrect
  theme*). Con cookie, el servidor ya emite el HTML correcto.
- **Idioma o región** — mismo razonamiento, y conecta con el ejercicio 7 del tema 02.
- **Sesión de usuario** — para renderizar contenido personalizado en el servidor.
- **Variante de test A/B** — si no, el contenido cambia tras hidratar.

#### El otro problema: el desajuste de hidratación

Este proyecto usa `provideClientHydration()`. La hidratación exige que el DOM que
genera el cliente **coincida** con el que llegó del servidor. Si un componente lee
`localStorage` durante su primer render y pinta algo distinto, Angular detecta el
desajuste y lanza un error de hidratación.

**La regla:** el primer render del cliente debe ser **idéntico** al del servidor.
Lo que dependa de almacenamiento local se aplica **después**.

#### Los tres mecanismos de Angular para esto

| Mecanismo | Cuándo usarlo |
|-----------|---------------|
| `isPlatformBrowser(inject(PLATFORM_ID))` | Guarda genérica. Ya hay un ejemplo en `pricing-page.ts` |
| **`afterNextRender(() => …)`** | **La forma idiomática moderna.** Solo se ejecuta en navegador y **después** del render, así que no puede provocar desajuste de hidratación |
| `inject(REQUEST)` | **Verificado disponible en tu versión.** Da acceso a la petición en el servidor — es como se leen las cookies durante el SSR |

> Nota de versión: en Angular 20 `afterRender` se renombró a **`afterEveryRender`**.
> Para leer almacenamiento normalmente quieres `afterNextRender`, que corre una vez.

Y para **escribir** una cookie desde el servidor existe `RESPONSE_INIT`.

#### La conclusión práctica

```
¿El dato debe afectar al HTML que emite el servidor?
├── SÍ → Cookie. No hay alternativa.
└── NO → localStorage / sessionStorage / IndexedDB,
         leídos SIEMPRE dentro de afterNextRender()
```

---

## Parte 2 — Práctica (la implementación es tuya)

Cinco ejercicios que cubren los cinco mecanismos del enunciado. **El ejercicio 1 es
el más valioso**: es el que demuestra que entiendes el choque con SSR.

Aplica el mismo método de trabajo del tema 02: observar → decidir → implementar →
verificar → registrar.

---

### Ejercicio 1 — Cookie: tema claro/oscuro sin destello 🔴 El importante

#### El problema

La aplicación no tiene selector de tema. Es el caso canónico para demostrar el
§1.10, porque **la solución ingenua falla de forma visible**.

Si guardas la preferencia en `localStorage`:
1. El servidor no puede leerla → emite el HTML con el tema por defecto
2. El navegador pinta ese HTML
3. Angular hidrata, lee `localStorage` y cambia el tema
4. **El usuario ve un destello blanco antes del tema oscuro**

Y si además cambias clases durante el primer render, provocas un **error de
hidratación**.

#### Lineamientos

1. **Antes de escribir código, reproduce el problema mal.** Impleméntalo primero
   con `localStorage` y observa el destello. Es la mejor forma de entender por qué
   la cookie es obligatoria aquí.
2. **Elige dónde se aplica el tema.** Lo habitual es un atributo o clase en
   `<html>` (`data-theme="dark"`), que en Angular no controla ninguna plantilla:
   piensa cómo llegar ahí desde el servidor y desde el cliente.
3. **Escritura en el cliente:** `document.cookie`, con `Max-Age`, `Path=/`,
   `SameSite=Lax`. **No** uses `HttpOnly` aquí — necesitas leerla desde JS.
4. **Lectura en el servidor:** `inject(REQUEST)` te da la petición; la cabecera
   `Cookie` viene ahí. Escribe un parser pequeño o usa uno.
5. **Encapsula la diferencia.** El componente **no debería saber** si corre en
   servidor o en cliente. Un servicio con dos implementaciones tras la misma
   interfaz es exactamente el patrón **Strategy** del tema 04, y `useFactory` en
   la configuración de proveedores es **Factory**.
6. **Ten en cuenta Safari (§1.8):** la cookie escrita desde JS caduca a los 7 días.
   Anótalo como limitación conocida, o investiga escribirla desde el servidor.
7. **Considera `prefers-color-scheme`** como valor por defecto cuando no hay cookie.

#### Criterios de aceptación
- [ ] El tema correcto llega **en el HTML del servidor** — verifícalo con
      `curl -s localhost:4200 | grep data-theme`, sin ejecutar JavaScript
- [ ] No hay destello al recargar con el tema oscuro activo
- [ ] No hay errores de hidratación en consola
- [ ] Ningún componente accede a `document.cookie` directamente
- [ ] Sabes explicar por qué `localStorage` **no puede** resolver esto

---

### Ejercicio 2 — localStorage: personajes favoritos 🟠

#### El problema

No hay forma de marcar personajes. Es un dato **puramente de cliente**, persistente,
pequeño y sin impacto en el SEO: el caso natural de `localStorage`.

#### Lineamientos

1. **Guarda solo los IDs**, no los objetos completos. Los datos ya vienen de la API;
   duplicarlos genera copias desincronizadas.
2. **Envuelve TODO acceso en `try/catch`.** Puede lanzar por cuota o por modo
   privado (§1.3). Un fallo de almacenamiento no debe romper la página.
3. **Léelo dentro de `afterNextRender()`**, nunca en `ngOnInit`. Si lo lees en el
   primer render, provocas desajuste de hidratación.
4. **Piensa el estado inicial.** El servidor no sabe qué es favorito, así que el
   HTML inicial debe representar "sin favoritos" y actualizarse después. Que ese
   cambio no produzca salto de layout — recuerda el CLS.
5. **Versiona el formato.** Guarda algo como `{ v: 1, ids: [...] }`. Cuando cambies
   la estructura, podrás migrar en vez de romper.
6. **Bonus:** escucha el evento `storage` para sincronizar entre pestañas (§1.3).
7. **Accesibilidad (tema 02):** el botón de favorito necesita nombre accesible y
   `aria-pressed` sincronizado con el estado. Y el cambio debería anunciarse.

#### Criterios de aceptación
- [ ] Los favoritos sobreviven a recargar y a cerrar el navegador
- [ ] No hay errores de hidratación
- [ ] La app funciona con el almacenamiento deshabilitado
- [ ] Hay versionado del formato
- [ ] El control es accesible por teclado y anuncia su estado

---

### Ejercicio 3 — sessionStorage: lo que no debe cruzar pestañas 🟡

#### El problema

Necesitas un dato que **no** deba compartirse entre pestañas, para que la diferencia
con `localStorage` sea evidente y no teórica.

#### Lineamientos

1. **Elige tú el caso**, pero justifícalo. Un buen candidato: los personajes vistos
   recientemente en **esta** sesión de navegación, o la posición del listado a la
   que volver.
2. **La prueba de que elegiste bien:** abre dos pestañas y comprueba que el estado
   es independiente. Si compartirlo no molesta, `sessionStorage` no era necesario.
3. Aplica las mismas cautelas del ejercicio 2: `try/catch` y `afterNextRender()`.
4. **Documenta en una frase** por qué este dato es de pestaña y no de origen.

---

### Ejercicio 4 — IndexedDB: caché offline del catálogo 🟠

#### El problema

Cada visita golpea la API externa. Sin red, la aplicación no muestra nada. Son
826 personajes: demasiado para `localStorage` y con necesidad de **consulta**, así
que es el terreno de IndexedDB.

#### Lineamientos

1. **Empieza por la API nativa**, aunque sea verbosa, y solo después valora `idb`
   o Dexie. Si no has visto una transacción de IndexedDB a pelo, no entenderás qué
   te está ahorrando el envoltorio.
2. **Diseña el *object store* antes de escribir.** Clave primaria `id`, y al menos
   **un índice** (por ejemplo `status` o `name`) — sin índice no estás usando lo
   que diferencia a IndexedDB de un mapa.
3. **Define la política de caché**: ¿cuándo se considera obsoleto? ¿Sirves de
   caché mientras revalidas? Escríbelo antes de implementarlo.
4. **Versiona el esquema.** IndexedDB tiene `onupgradeneeded` justamente para eso.
5. **Punto de integración:** el sitio natural es un **interceptor HTTP**, lo que
   enlaza con el patrón *Chain of Responsibility* del tema 04. Pero cuidado: el
   interceptor **también corre en el servidor**, donde IndexedDB no existe.
6. **No rompas el SSR ni el SEO.** El HTML del servidor debe seguir llegando
   completo. La caché es una mejora para el cliente, no la fuente del render.
7. **Mira `navigator.storage.estimate()`** y anota cuánto ocupa tu caché.

#### Criterios de aceptación
- [ ] Los datos persisten entre sesiones
- [ ] Hay al menos un índice y lo usas en una consulta real
- [ ] El esquema está versionado
- [ ] El SSR sigue funcionando: `npm run build` y verificación como en el tema 01
- [ ] Política de invalidación documentada

---

### Ejercicio 5 — El análisis: qué NO va en el navegador 🟢

#### El problema

El enunciado incluye "BD". La respuesta valiosa aquí **no es montar un backend**,
sino saber **trazar la frontera**.

#### Lineamientos

Escribe un apartado corto en este documento que, para esta aplicación, clasifique:

1. **Qué datos podrían vivir en el navegador** y con qué mecanismo, justificando
   con las seis preguntas del §1.1.
2. **Qué exigiría una base de datos en servidor** y por qué. Pista: piensa qué
   pasa con los favoritos del ejercicio 2 si el usuario cambia de dispositivo, o
   si quisieras mostrar "los personajes más marcados por la comunidad".
3. **Qué NUNCA debe guardarse en el navegador** en ningún caso.
4. **El patrón híbrido:** cómo convivirían BD y almacenamiento local si esta app
   tuviera cuentas de usuario — quién es la fuente de verdad y cómo se sincroniza.

#### Criterios de aceptación
- [ ] Cada decisión se justifica con al menos una de las seis preguntas del §1.1
- [ ] Mencionas explícitamente que el cliente es manipulable (§1.7)
- [ ] Identificas al menos un dato que **cambiaría** de mecanismo al añadir cuentas

---

## Parte 3 — Preguntas de assessment

<details>
<summary><b>Diferencia entre localStorage y sessionStorage</b></summary>

Comparten API. La diferencia es el **alcance**: `localStorage` es por **origen** y
persiste hasta que se borre explícitamente; `sessionStorage` es por **pestaña** y
muere al cerrarla.

Dos pestañas del mismo sitio **comparten** `localStorage` pero **no**
`sessionStorage`. Por eso `sessionStorage` es el correcto cuando dos pestañas deben
mantener flujos independientes: con `localStorage` se pisarían.

Detalle: `sessionStorage` **sí** sobrevive a un recargado, y al duplicar una pestaña
el navegador copia su contenido.
</details>

<details>
<summary><b>¿Cuándo cookies en lugar de localStorage?</b></summary>

Tres casos:

1. **Cuando el servidor necesita el dato.** Las cookies viajan en cada petición;
   `localStorage` nunca sale del navegador. En una app con SSR esto es decisivo:
   es el único almacenamiento legible al renderizar.
2. **Cuando debe ser inaccesible para JavaScript** — tokens de sesión con
   `HttpOnly`.
3. **Cuando necesitas caducidad automática**, que `localStorage` no ofrece.

El coste es el tamaño (~4 KB) y que **viajan en todas las peticiones**, incluidas
las de imágenes y CSS. Son para identificadores y banderas, no para datos.
</details>

<details>
<summary><b>¿Por qué localStorage puede dañar el rendimiento?</b></summary>

Porque es **síncrono** y bloquea el hilo principal: cada lectura o escritura detiene
el renderizado y la respuesta a eventos. Leer un JSON grande al arrancar produce una
pausa perceptible y **degrada el INP**, la métrica de Core Web Vitals que sustituyó
a FID en 2024.

Para volúmenes reales hay que usar **IndexedDB**, que es asíncrona. Y nunca
`localStorage` dentro de un bucle o de un handler de scroll.
</details>

<details>
<summary><b>¿Dónde guardarías un token de sesión?</b></summary>

En una **cookie `HttpOnly` + `Secure` + `SameSite`**.

El contraste es entre dos vectores: `localStorage` es vulnerable a **XSS** —
cualquier script inyectado lo lee y lo exfiltra— mientras que una cookie `HttpOnly`
es invisible a JavaScript pero vulnerable a **CSRF**.

El consenso se decanta por la cookie porque el XSS es más frecuente y más grave, y
el CSRF tiene mitigaciones estándar y efectivas (`SameSite` + token anti-CSRF).

El matiz que remata: con un XSS activo estás comprometido en cualquier caso, pero
`HttpOnly` impide la exfiltración directa del token y eleva mucho el coste del
ataque.
</details>

<details>
<summary><b>Explica <code>SameSite</code></b></summary>

Controla si la cookie viaja en peticiones originadas en otro sitio, y es la
principal defensa contra CSRF.

- **`Lax`** — se envía en navegaciones de nivel superior (seguir un enlace) pero no
  en peticiones subordinadas. Es el **valor por defecto** en navegadores modernos.
- **`Strict`** — nunca en contexto de otro sitio. Muy seguro, pero el usuario que
  llega desde un buscador aparece deslogueado.
- **`None`** — se envía siempre, y **obliga** a `Secure`.
</details>

<details>
<summary><b>¿Cuándo IndexedDB en vez de localStorage?</b></summary>

Cuando se cumple alguna de estas: **volumen** (más de unos pocos MB),
**rendimiento** (localStorage bloquea el hilo), **estructura** (necesitas consultar
por índices en vez de leer una clave), o **tipos** (IndexedDB guarda objetos,
`Blob`, `File` y `Date` reales mediante clonado estructurado, sin serializar a
string).

Casos típicos: modo offline, caché de respuestas de API, archivos y medios.

Su punto débil es una API nativa verbosa y basada en eventos, por lo que en la
práctica se usa un envoltorio como `idb` o Dexie.
</details>

<details>
<summary><b>¿Por qué falla el almacenamiento con SSR y cómo se resuelve?</b></summary>

Porque `localStorage`, `sessionStorage` e `indexedDB` son APIs del navegador y el
render del servidor corre en Node, donde no existen: da
`ReferenceError: localStorage is not defined`.

De ahí sale la consecuencia arquitectónica clave: **las cookies son el único
almacenamiento que el servidor puede leer**, así que cualquier dato que deba
influir en el HTML del servidor —tema, idioma, sesión, variante A/B— **tiene que
ser una cookie**.

En Angular se resuelve con `isPlatformBrowser`, con `afterNextRender()` (que además
evita el desajuste de hidratación porque corre tras el render) y, en el servidor,
con el token `REQUEST` para leer las cabeceras.
</details>

<details>
<summary><b>Trampa: ¿qué pasa si guardas el tema en localStorage con SSR?</b></summary>

Un **destello**. El servidor no puede leer `localStorage`, así que emite el HTML con
el tema por defecto; el navegador lo pinta; luego Angular hidrata, lee la
preferencia y cambia el tema. El usuario ve un fogonazo blanco antes del tema
oscuro.

Y si el cambio ocurre durante el primer render, además provoca un **error de
hidratación**, porque el DOM del cliente deja de coincidir con el del servidor.

La solución es una **cookie**: el servidor la lee y emite el HTML ya correcto.
</details>

<details>
<summary><b>¿Cuánto duran realmente los datos que guardas?</b></summary>

Menos de lo que la gente cree, y esto sorprende en entrevistas.

**Safari (ITP) borra el almacenamiento escribible por scripts tras 7 días sin
interacción** del usuario con el sitio: afecta a `localStorage`, `IndexedDB` y las
cookies puestas con `document.cookie`, que además quedan limitadas a 7 días.

Lo que **no** cae en esa limitación son las cookies de primera parte establecidas
por el **servidor** con `Set-Cookie`. Por eso, si una preferencia debe durar de
verdad, conviene escribirla desde el servidor.

Además, la cuota es **best-effort** por defecto: el navegador puede expulsar datos
si necesita espacio, salvo que se conceda `navigator.storage.persist()`.
</details>

<details>
<summary><b>¿Puedes confiar en los datos del navegador?</b></summary>

**Nunca.** Todo lo que se guarda en el navegador es legible y **modificable** por el
usuario con las herramientas de desarrollo. Un `localStorage.setItem('rol','admin')`
está a dos clics.

El almacenamiento de navegador es una **caché o una comodidad**, jamás la fuente de
verdad ni una decisión de autorización. Todo lo que importe se valida en el
servidor.
</details>

<details>
<summary><b>¿El RGPD solo aplica a cookies?</b></summary>

No, y es un error común. La normativa europea habla de **acceder o almacenar
información en el dispositivo del usuario**, con independencia del mecanismo. Usar
`localStorage` o `IndexedDB` para lo mismo que harías con una cookie **no exime**
del consentimiento.

Quedan exentas las estrictamente necesarias para prestar el servicio: sesión,
seguridad, balanceo de carga. Las de analítica, personalización y publicidad
requieren consentimiento **previo**.
</details>

---

## Referencias

- [MDN — Web Storage API](https://developer.mozilla.org/es/docs/Web/API/Web_Storage_API)
- [MDN — IndexedDB](https://developer.mozilla.org/es/docs/Web/API/IndexedDB_API)
- [MDN — Set-Cookie](https://developer.mozilla.org/es/docs/Web/HTTP/Headers/Set-Cookie)
- [web.dev — Storage for the web](https://web.dev/articles/storage-for-the-web)
- [WebKit — Intelligent Tracking Prevention](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
- [Angular — `afterNextRender`](https://angular.dev/api/core/afterNextRender)
- [idb](https://github.com/jakearchibald/idb) · [Dexie.js](https://dexie.org/)
