# 02 — Accesibilidad y estándares ARIA

> **Temas:** WCAG · árbol de accesibilidad · HTML semántico · roles, estados y propiedades ARIA · nombres accesibles · live regions · gestión del foco en SPAs
> **Estado:** teoría y auditoría completas. **La implementación la hace Esteban** (Parte 2).

---

## Parte 1 — Teoría

### 1.1 Por qué importa

Tres razones, y conviene poder dar las tres:

**Legal.** Es la que mueve presupuestos. La *European Accessibility Act* es exigible
desde el 28 de junio de 2025 para productos y servicios digitales de consumo en la UE.
En EE. UU. operan la ADA y la Section 508. La norma técnica de referencia (EN 301 549
en Europa) apunta a **WCAG 2.1/2.2 nivel AA**.

**De alcance.** Alrededor del 15 % de la población mundial vive con alguna
discapacidad. Pero el alcance real es mayor: buen contraste, subtítulos y navegación
por teclado benefician también a quien usa el móvil bajo el sol, tiene un brazo
ocupado o simplemente prefiere el teclado.

**Técnica.** Un DOM accesible es un DOM bien estructurado. Accesibilidad y SEO
comparten raíz: ambos consisten en **exponer significado a un cliente que no ve la
pantalla**. Un rastreador y un lector de pantalla tienen el mismo problema.

> Es la misma idea del tema 01. Hay clientes de tu aplicación que no perciben el
> diseño visual: el SEO los llama rastreadores, la accesibilidad los llama
> tecnologías de asistencia.

---

### 1.2 WCAG: el estándar

*Web Content Accessibility Guidelines*, del W3C. Versión vigente: **2.2** (octubre 2023).

Cuatro principios, el acrónimo **POUR**:

| Principio | Significa | Ejemplo de criterio |
|-----------|-----------|---------------------|
| **P**erceptible | La información debe poder percibirse por algún sentido | Texto alternativo; contraste suficiente |
| **O**perable | La interfaz debe poder manejarse | Todo accesible por teclado; foco visible |
| **U**nderstandable | El contenido y la operación deben ser predecibles | Idioma declarado; errores explicados |
| **R**obust | Debe funcionar con tecnologías de asistencia presentes y futuras | Nombre, rol y valor expuestos correctamente |

**Niveles de conformidad:**

| Nivel | Qué es | En la práctica |
|-------|--------|----------------|
| **A** | Mínimo imprescindible | Sin esto la página es inutilizable para algunos usuarios |
| **AA** | **El objetivo estándar** | Lo que exigen las leyes y los contratos |
| **AAA** | Máximo | No se exige para sitios completos; ni el W3C lo recomienda como meta global |

**Si te preguntan a qué nivel apuntar, la respuesta es AA.**

Novedades de WCAG 2.2 que conviene conocer: `2.4.11 Foco no oscurecido`,
`2.5.8 Tamaño del objetivo (mínimo 24×24 px)`, `3.3.8 Autenticación accesible`.
Y el criterio `4.1.1 Análisis sintáctico` fue **eliminado** por obsoleto:
mencionarlo como vigente delata material desactualizado.

---

### 1.3 El árbol de accesibilidad — el modelo mental clave

Esto hay que entenderlo antes que cualquier atributo.

El navegador no construye **un** árbol a partir del HTML, construye **dos**:

```
        HTML
         │
    ┌────┴─────┐
    │          │
  DOM      ÁRBOL DE ACCESIBILIDAD
    │          │
 pantalla   lector de pantalla,
            navegación por voz,
            conmutadores…
```

El árbol de accesibilidad es una versión paralela del DOM donde cada nodo se reduce
a lo que una tecnología de asistencia necesita saber:

| Propiedad | Pregunta que responde | Ejemplo |
|-----------|----------------------|---------|
| **Rol** | ¿Qué **es** esto? | `button`, `link`, `heading`, `list` |
| **Nombre** | ¿Cómo se **llama**? | "Enviar formulario" |
| **Estado** | ¿En qué **situación** está? | expandido, marcado, deshabilitado |
| **Valor** | ¿Qué **contiene**? | el texto de un campo, el 40 % de una barra |

**Todo ARIA existe para una sola cosa: modificar ese árbol.** No cambia el aspecto,
ni el comportamiento, ni añade funcionalidad. Solo cambia lo que se le cuenta a la
tecnología de asistencia.

Corolario que hay que tener grabado:

> **Poner `role="button"` en un `<div>` NO lo convierte en un botón.**
> Le dice al lector de pantalla que es un botón, pero sigue sin recibir foco y sin
> responder a Enter ni a Espacio. Has creado una **mentira**: el usuario oye
> "botón", intenta activarlo y no pasa nada. Es peor que no haber puesto nada.

En Chrome DevTools se ve en *Elements* → panel *Accessibility*.

---

### 1.4 Regla cero: HTML semántico primero

La mayoría de los problemas se resuelven **sin escribir ni un atributo ARIA**,
usando el elemento correcto.

```html
<!-- MAL: hay que añadir rol, tabindex, manejadores de teclado, estado… -->
<div role="button" tabindex="0" (click)="save()" (keydown.enter)="save()">Guardar</div>

<!-- BIEN: foco, Enter, Espacio, rol y estado deshabilitado vienen gratis -->
<button (click)="save()">Guardar</button>
```

Un elemento nativo trae **cinco cosas** que un `div` no tiene:

1. Rol semántico correcto
2. Foco por teclado (entra en el orden de tabulación)
3. Comportamiento de teclado (Enter/Espacio en botones, Enter en enlaces)
4. Estados nativos (`disabled`, `checked`, `required`)
5. Integración con el sistema operativo (alto contraste, zoom, preferencias)

**`<a>` vs `<button>`** — la confusión más común:

| Usa | Cuando | Teclado |
|-----|--------|---------|
| `<a href>` | **Navegas** a otra URL | Enter |
| `<button>` | **Ejecutas una acción** en la página | Enter **y** Espacio |

Si lleva `routerLink`, es navegación: **es un `<a>`**. Y ojo: un `<a>` sin `href`
(ni `routerLink`) **no es enfocable** — es tan inaccesible como un `div`.

Los landmarks estructurales son los que permiten **saltar** por la página:

```html
<header>   <nav>   <main>   <aside>   <footer>   <section>   <article>
```

Un usuario de lector de pantalla navega por landmarks y encabezados igual que tú
escaneas visualmente. Sin ellos, solo le queda leer todo en orden.

---

### 1.5 Qué es ARIA — y qué NO es

**ARIA** = *Accessible Rich Internet Applications*. Especificación del W3C que
define atributos para describir componentes que el HTML nativo no cubre: pestañas,
acordeones, menús, combos, diálogos, árboles.

**Lo que ARIA NO hace** — fuente de casi todos los errores:

| ARIA no… | Consecuencia |
|----------|--------------|
| …añade comportamiento de teclado | Lo implementas tú, siempre |
| …hace nada enfocable | Necesitas `tabindex` |
| …cambia el aspecto visual | Ni un píxel |
| …arregla HTML mal estructurado | Solo lo disfraza |

> **La primera regla de ARIA es no usar ARIA.**
> Está en la propia especificación. Es la herramienta para lo que el HTML no puede
> expresar, no un atajo para evitar aprender HTML.

Y el dato que remata la respuesta:

> **"Ningún ARIA es mejor que mal ARIA."**
> Los análisis anuales de WebAIM sobre el millón de páginas más visitadas
> encuentran de forma consistente que las páginas **con** ARIA presentan **más**
> errores detectados que las que no lo usan. No porque ARIA sea malo, sino porque
> se aplica sin entenderlo.

---

### 1.6 Las cinco reglas de ARIA

De la especificación *Using ARIA* del W3C. Merece la pena poder citarlas:

1. **Si existe un elemento HTML nativo con la semántica que necesitas, úsalo.**
2. **No cambies la semántica nativa** salvo que no haya alternativa.
   (`<h2 role="button">` es un error: pierdes el encabezado.)
3. **Todo control ARIA interactivo debe poder usarse con el teclado.**
4. **No pongas `role="presentation"` ni `aria-hidden="true"` en un elemento
   enfocable.** Creas un foco invisible: el usuario tabula hacia algo que el lector
   no anuncia.
5. **Todo elemento interactivo debe tener un nombre accesible.**

---

### 1.7 Roles, estados y propiedades

**Roles** — *qué es*. Se asigna una vez y no cambia.

```html
<div role="tablist">    <div role="tab">    <div role="dialog">
```

Categorías: de widget (`button`, `checkbox`, `tab`), de estructura (`article`,
`list`, `heading`), de landmark (`navigation`, `main`, `search`) y de live region
(`alert`, `status`, `log`).

**Estados** — *en qué situación está*. **Cambian dinámicamente** y hay que
mantenerlos sincronizados con la UI:

| Atributo | Para qué |
|----------|----------|
| `aria-expanded` | Acordeones, menús desplegables |
| `aria-selected` | Pestañas, opciones |
| `aria-checked` | Casillas y radios personalizados |
| `aria-disabled` | Deshabilitado sin perder el foco |
| `aria-hidden` | Ocultar del árbol de accesibilidad |
| `aria-current` | **Elemento actual dentro de un conjunto** — `page`, `step`, `date` |
| `aria-busy` | La región se está actualizando |
| `aria-invalid` | Campo con error de validación |

**Propiedades** — *características estables*:

| Atributo | Para qué |
|----------|----------|
| `aria-label` | Nombre accesible cuando no hay texto visible |
| `aria-labelledby` | Nombre tomado de **otro elemento** (por `id`) |
| `aria-describedby` | Descripción adicional (ayuda, mensaje de error) |
| `aria-controls` | Qué elemento controla este |
| `aria-live` | Región que anuncia sus cambios |

**El error más frecuente con los estados:** ponerlos y no actualizarlos. Un
`aria-expanded="false"` que nunca pasa a `true` es peor que no tenerlo: miente
sobre el estado real.

---

### 1.8 El nombre accesible y su orden de cálculo

Cada elemento interactivo necesita un **nombre accesible**: la cadena que anuncia
el lector. El navegador la calcula buscando **en este orden** y se queda con la
primera que encuentra:

```
1. aria-labelledby   ← gana siempre
2. aria-label
3. atributo nativo    (<label for>, alt de una img, <caption>…)
4. contenido de texto del elemento
5. title              ← último recurso, no confiar
```

Consecuencias prácticas:

```html
<!-- Anuncia "Cerrar". El texto visible "X" se IGNORA. -->
<button aria-label="Cerrar">X</button>

<!-- PELIGRO: anuncia "Ayuda", NO "Guardar cambios".
     aria-label pisa el texto visible, y quien usa control por voz dice
     "haz clic en Guardar cambios" y no funciona. -->
<button aria-label="Ayuda">Guardar cambios</button>
```

Esa segunda trampa tiene nombre en WCAG: **2.5.3 Etiqueta en el nombre**. Si hay
texto visible, el nombre accesible debe **contenerlo**.

**Regla práctica:** si ya hay texto visible que sirve como nombre, **no pongas
`aria-label`**. Se usa solo cuando el control no tiene texto (un icono solo) o
cuando el texto visible es ambiguo fuera de contexto ("Leer más", "Ver", "Editar"
repetidos por la página).

---

### 1.9 Live regions — anunciar cambios sin mover el foco

Problema: en una SPA el contenido cambia sin recargar. Visualmente lo ves; con un
lector de pantalla **no pasa absolutamente nada**. Cargó una lista, apareció un
error, se guardó algo: silencio.

Las *live regions* marcan una zona del DOM cuyos cambios deben anunciarse **sin
robar el foco**.

```html
<div aria-live="polite">Se cargaron 20 personajes.</div>
```

| Valor | Cuándo se anuncia | Úsalo para |
|-------|-------------------|------------|
| `aria-live="polite"` | Al terminar lo que el lector esté diciendo | Casi todo |
| `aria-live="assertive"` | **Interrumpe inmediatamente** | Solo errores críticos |
| `aria-live="off"` | No se anuncia | Por defecto |

Roles con live region implícita, más legibles que el atributo:

| Rol | Equivale a | Para |
|-----|-----------|------|
| `role="status"` | `aria-live="polite"` + `aria-atomic="true"` | Estados, "cargando", confirmaciones |
| `role="alert"` | `aria-live="assertive"` + `aria-atomic="true"` | Errores |

Atributos complementarios:

- **`aria-atomic="true"`** → lee la región **entera** al cambiar, no solo el
  fragmento modificado. Imprescindible en mensajes tipo "Página 3 de 42".
- **`aria-busy="true"`** → "estoy actualizando, no anuncies todavía". Se pone antes
  de un cambio grande y se quita al terminar.

**Los dos errores clásicos, y son sutiles:**

1. **La región debe existir en el DOM ANTES de que cambie su contenido.** Si
   insertas un elemento nuevo que ya trae el texto dentro, muchos lectores **no lo
   anuncian**: no había región que observar. El contenedor vacío tiene que estar
   desde el render inicial.
2. **Varias live regions compitiendo se pisan entre sí.** Ocho `role="status"`
   simultáneos no anuncian ocho veces de forma ordenada: producen ruido
   impredecible. Una región por propósito.

---

### 1.10 Gestión del foco: el problema específico de las SPAs

En una web tradicional, navegar recarga la página: el foco vuelve al inicio del
documento y el lector anuncia el nuevo título. **En una SPA no ocurre nada de eso.**

Al cambiar de ruta con `routerLink`:

- La URL cambia ✅
- El `<title>` cambia (si lo gestionas, como en el tema 01) ✅
- **El foco se queda donde estaba** ❌
- **Nada se anuncia** ❌

El usuario activó un enlace y, hasta donde percibe, no pasó nada. Es probablemente
**el fallo de accesibilidad más extendido en aplicaciones Angular y React**.

Las dos soluciones aceptadas, combinables:

**A. Anunciar el cambio** con una live region a nivel de aplicación que reciba el
título de la ruta nueva.

**B. Mover el foco** al encabezado principal de la página nueva. Requiere
`tabindex="-1"` en el destino, que lo hace enfocable **por programa** sin meterlo
en el orden de tabulación.

```
tabindex="0"   → enfocable por teclado, en el orden natural
tabindex="-1"  → enfocable solo por .focus(), fuera de la tabulación
tabindex="1+"  → NUNCA. Rompe el orden natural del documento
```

Otros momentos que exigen mover el foco: abrir un diálogo (el foco entra y queda
**atrapado** dentro), cerrarlo (vuelve al elemento que lo abrió) y borrar un
elemento de una lista (el foco va al siguiente, no al `<body>`).

---

### 1.11 Lo específico de Angular

**`<html lang>`** — ya está en `index.html` desde el tema 01. Es criterio WCAG 3.1.1
(nivel A) y afecta a la pronunciación del sintetizador. Si una parte del contenido
está en otro idioma, se marca con `lang` en ese fragmento (criterio 3.1.2).

**`@angular/cdk/a11y`** — el paquete oficial. **No está instalado en este proyecto**
(`npm i @angular/cdk`). Ofrece:

| Herramienta | Para qué |
|-------------|----------|
| `LiveAnnouncer` | Servicio que anuncia mensajes en una live region gestionada |
| `cdkTrapFocus` | Atrapa el foco dentro de un contenedor (diálogos) |
| `FocusMonitor` | Distingue si el foco llegó por teclado, ratón o programa |
| `InteractivityChecker` | Comprueba si un elemento es realmente enfocable |

**Conviene implementarlo a mano al menos una vez antes de usar el CDK:** si no
entiendes qué hace `LiveAnnouncer` por dentro, no sabrás depurarlo.

**Enlaces del Router:** `routerLinkActive` aplica clases CSS pero **no expone el
estado al árbol de accesibilidad**. Para eso está `aria-current`, y la directiva
ofrece la entrada `ariaCurrentWhenActive`.

**Detalle de SSR:** manipular el foco toca el DOM y solo tiene sentido en el
navegador. Igual que con `DOCUMENT` en el tema 01, hay que cuidar qué se ejecuta
en el servidor.

---

## Parte 2 — Práctica (la implementación es tuya)

Auditoría del laboratorio. Cada hallazgo explica **qué está mal y por qué**; la
corrección es el ejercicio.

Marca cada casilla al completarla y anota debajo lo que aprendiste — así este
documento se convierte también en tu registro.

---

### 2.0 Método de trabajo

Aplica siempre estos cinco pasos, en este orden. Saltarse el primero es la causa
del 90 % del ARIA mal puesto.

```
1. OBSERVAR   → reproduce el problema con teclado y con el árbol de accesibilidad
2. DECIDIR    → ¿hay un elemento nativo que lo resuelva? (casi siempre sí)
3. IMPLEMENTAR→ empieza por HTML; ARIA solo para lo que el HTML no exprese
4. VERIFICAR  → teclado + árbol de accesibilidad + herramienta automática
5. REGISTRAR  → anota qué aprendiste bajo el ejercicio
```

#### Checklist de decisión: ¿necesito ARIA?

Recórrela de arriba abajo y para en la primera respuesta afirmativa.

| Pregunta | Si es «sí»… |
|----------|-------------|
| ¿Existe un elemento HTML nativo con esta semántica? | **Úsalo. No añadas ARIA.** |
| ¿El elemento es puramente decorativo? | `aria-hidden="true"` y listo |
| ¿Es interactivo pero no tiene texto visible? | Necesita `aria-label` o `aria-labelledby` |
| ¿Su estado cambia (abierto/cerrado, actual/no actual)? | Necesita un **estado** ARIA, y hay que **actualizarlo** |
| ¿Su contenido cambia solo y hay que avisar? | Necesita una **live region** |
| Ninguna de las anteriores | **No pongas nada** |

#### Tabla de referencia: elemento nativo por caso de uso

Consúltala antes de escribir un `role`.

| Necesito… | Elemento correcto | Trae gratis |
|-----------|-------------------|-------------|
| Navegar a otra URL | `<a href>` / `<a routerLink>` | Foco, Enter, rol `link` |
| Ejecutar una acción | `<button>` | Foco, Enter, Espacio, `disabled` |
| Agrupar navegación | `<nav>` | Landmark navegable |
| Contenido principal | `<main>` | Landmark, destino del skip link |
| Una lista de cosas | `<ul>` / `<li>` | Rol `list`, conteo de elementos |
| Un título de sección | `<h1>`…`<h6>` | Rol `heading` con nivel |
| Una imagen informativa | `<img alt="…">` | Nombre accesible |
| Una imagen decorativa | `<img alt="">` | Se omite del árbol |

#### Reglas de oro mientras implementas

1. **Primero borra, luego añade.** En varios ejercicios la solución correcta
   *elimina* atributos en lugar de sumarlos.
2. **Un cambio, una verificación.** No acumules cinco cambios y pruebes al final:
   no sabrás cuál rompió qué.
3. **Si añades un estado ARIA, busca dónde lo vas a actualizar** antes de
   escribirlo. Un estado que no cambia es una mentira.
4. **No elimines el `outline` del foco** sin poner un reemplazo visible.
5. **Cuidado con SSR:** todo lo que toque `document` o el foco debe protegerse
   para no ejecutarse en el servidor.

#### Orden recomendado

```
1 → 2 → 3 → 6      estructurales, rápidos, alto impacto
      4 → 5        conceptualmente más ricos (live regions y foco)
          7 → 8    decisión de producto y auditoría autónoma
```

---

### Ejercicio 1 — La tarjeta de personaje no funciona con teclado 🔴 Crítico

**Archivo:** `src/app/components/character-card/character-card.html`

```html
<div [routerLink]="['/character', character().id]" class="… cursor-pointer">
```

**El problema.** Un `<div>` con `routerLink` responde al clic del ratón, pero:
no recibe foco al tabular, no responde a Enter, y el lector de pantalla lo anuncia
como un contenedor genérico, no como un enlace. **Un usuario de teclado no puede
abrir ningún personaje.**

Es la aplicación directa de §1.4: `routerLink` es navegación, así que el elemento
correcto existe y es nativo.

**Criterios WCAG:** 2.1.1 Teclado (A) · 4.1.2 Nombre, rol y valor (A)

**Lineamientos:**

1. **Reproduce el fallo primero.** `npm start`, y con Tab intenta llegar a una
   tarjeta. Confirma que es imposible antes de tocar nada.
2. **Consulta la tabla de elementos nativos** (§2.0): "navegar a otra URL".
3. **Decide el alcance del enlace.** Hay dos patrones válidos y el trade-off es real:
   - *Toda la tarjeta es el enlace* → área de clic grande, pero el nombre
     accesible será **todo** el texto de dentro ("Rick Sanchez Human - Alive").
   - *Solo el título es el enlace* → nombre limpio, pero el área de clic se
     reduce y hay que recuperar el clic en el resto con CSS.

   Elige uno y **escribe en una frase por qué**. No hay respuesta única.
4. **Al sustituir el elemento, revisa el layout.** Un `<a>` es `inline` por
   defecto; el `<div>` era `block`. Mira qué clase de Tailwind ya está presente
   en el elemento y si sigue haciendo falta.
5. **Revisa qué sobra.** Con el elemento correcto, ¿sigue teniendo sentido
   `cursor-pointer`? ¿Hace falta algún `role` o `tabindex`?
6. **Verifica** con Tab + Enter, y luego en DevTools → Accessibility que el rol
   sea `link` y el nombre sea útil.

**Criterios de aceptación:**
- [ ] Se puede llegar a cada tarjeta con Tab
- [ ] Enter abre la ficha
- [ ] El foco es visible (no lo elimines con `outline: none` sin reemplazo)
- [ ] El lector la anuncia como enlace con un nombre útil
- [ ] No has añadido `role`, `tabindex` ni manejadores de teclado — no hacen falta

**Pista:** hay una razón por la que la solución correcta **quita** código en lugar
de añadirlo.

---

### Ejercicio 2 — La paginación tiene el mismo problema, y además un bug 🔴 Crítico

**Archivo:** `src/app/pages/characters-page/characters-page.html`

```html
<span class="…" aria-label="Previous page" [routerLink]="['/characters/page/', currentPage()! - 1]">
```

**Problema A.** Igual que el ejercicio 1: un `<span>` no es enfocable ni activable
por teclado. Y aquí hay un matiz importante — el `aria-label` **no sirve de nada**:
un `span` sin rol no es un elemento interactivo, así que el nombre accesible no
tiene a qué adherirse. Es un ejemplo perfecto de la §1.5: ARIA aplicado sobre HTML
mal elegido no arregla nada.

**Problema B (funcional).** En la página 1, "anterior" apunta a
`/characters/page/0`. Existiendo ya la 404 real del tema 01, eso es una URL rota
enlazada desde tu propio sitio. Lo mismo en la última página con "siguiente".

**Problema C.** Los dos `<svg>` son decorativos: el nombre lo aporta el control.
Sin `aria-hidden="true"` pueden anunciarse como contenido.

**Problema D.** La paginación es un bloque de navegación y no está marcado como tal.

**Lineamientos:**

1. **Sustituye los `<span>`** aplicando lo aprendido en el ejercicio 1.
2. **Resuelve los extremos.** Tienes tres estrategias; cada una comunica algo
   distinto:

   | Estrategia | Qué percibe el usuario | Coste |
   |------------|------------------------|-------|
   | No renderizar el control | Desaparece; el layout puede saltar | Pierde la referencia visual |
   | `<a>` sin `routerLink` | No enfocable, pero visible | El lector lo anuncia raro o no lo anuncia |
   | Control con `aria-disabled="true"` | Enfocable y anunciado como deshabilitado | Hay que impedir la navegación tú |

   **Pista conceptual:** `disabled` nativo saca el elemento de la tabulación;
   `aria-disabled` lo mantiene enfocable y anunciable. Para paginación suele
   preferirse lo segundo, porque el usuario de teclado *encuentra* el control y
   entiende por qué no puede usarlo, en lugar de que se desvanezca.

   Elige, impleméntalo y **justifícalo en una frase**.
3. **Oculta los SVG.** Son decorativos: el nombre lo aporta el control que los
   contiene. Consulta la fila "imagen decorativa" de la tabla de §2.0.
4. **Envuelve el bloque en un landmark de navegación con nombre propio.** Ojo:
   ya habrá otro `<nav>` en la página (el del ejercicio 3). Por eso el nombre
   importa — sin él, el usuario oye "navegación" dos veces sin poder
   distinguirlas.
5. **Arregla el indicador `{{ currentPage() }}/{{ totalPages() }}`.** Dos números
   separados por una barra no comunican nada fuera de contexto. Piensa en un
   texto completo, y en si conviene que el texto visible y el anunciado difieran
   (revisa §1.8 antes de decidirlo: hay una trampa).
6. **Verifica** navegando toda la paginación solo con teclado, incluidos los
   extremos.

**Criterios de aceptación:**
- [ ] Ambos controles son alcanzables y activables con teclado
- [ ] En la primera página, "anterior" no es activable; en la última, "siguiente" tampoco
- [ ] Investiga la diferencia entre **ocultar**, usar `aria-disabled` y renderizar
      un elemento no interactivo. Justifica en una frase cuál elegiste
- [ ] Los SVG están ocultos al árbol de accesibilidad
- [ ] El bloque es un landmark de navegación con nombre propio
- [ ] El indicador "1/42" comunica su significado (no solo dos números sueltos)

**Pista para el punto 2:** un `<a>` sin `href` no es enfocable. Eso puede jugar a
tu favor, pero piensa qué anuncia el lector en ese caso.

---

### Ejercicio 3 — La aplicación no tiene estructura de landmarks 🟠 Alto

**Archivos:** `src/app/app.html`, `src/app/components/navbar/navbar.html`

```html
<app-navbar />
<div class="max-w-7xl m-auto px-2">
  <router-outlet />
</div>
```

**El problema.** No hay `<main>`. Un usuario de lector de pantalla no puede saltar
al contenido principal: tiene que atravesar la navegación entera en **cada** cambio
de página. Tampoco hay enlace para saltar la navegación.

**Criterios WCAG:** 2.4.1 Evitar bloques (A) · 1.3.1 Información y relaciones (A)

**Lineamientos:**

1. **Empieza por el `<main>`**, que es el cambio más simple: envuelve el
   `<router-outlet>`. Solo puede haber **uno** por página. Dale un `id` — lo vas
   a necesitar en el paso 3.
2. **Nombra el `<nav>`** de la barra de navegación.
3. **Construye el enlace de salto.** Es el que más matices tiene:
   - Debe ser el **primer elemento tabulable** del documento, así que va antes
     que la barra de navegación en el DOM.
   - Apunta al `id` del `<main>`.
   - **Trampa de Angular:** un `href="#contenido"` es interpretado por el Router
     como una navegación con fragmento y puede no hacer lo esperado. Investiga
     `withInMemoryScrolling` / `anchorScrolling`, o resuélvelo con un manejador
     que mueva el foco por programa. Cualquiera de las dos vías es válida —
     documenta cuál elegiste.
   - Si mueves el foco por programa, el destino necesita ser enfocable. Repasa
     `tabindex="-1"` en §1.10.
4. **Ocúltalo visualmente sin sacarlo del árbol.** Busca la técnica `sr-only`
   (ya se usa en `products-skeleton.html`) y hazla reversible en `:focus`.
   **Comprueba por qué `display: none` y `visibility: hidden` NO sirven aquí** —
   entender eso es la mitad del ejercicio.
5. **Expón el enlace activo** con `aria-current`. Mira la entrada
   `ariaCurrentWhenActive` de `routerLinkActive`: no hace falta hacerlo a mano.
6. **Verifica:** recarga la página, pulsa Tab **una sola vez**. Debe aparecer el
   enlace de salto, y Enter debe llevarte al contenido.

**Criterios de aceptación:**
- [ ] Existe un landmark `main` que envuelve el contenido enrutado
- [ ] Existe un enlace "saltar al contenido" que es el primer elemento tabulable
- [ ] Ese enlace está oculto visualmente hasta recibir foco, y entonces **se ve**
- [ ] El `<nav>` tiene nombre accesible
- [ ] El enlace activo expone `aria-current="page"`, no solo un color

**Pistas:**
- Para el enlace de salto, busca la técnica de la clase `sr-only` (ya se usa en
  `products-skeleton.html`) y cómo revertirla en `:focus`.
- Para `aria-current`, mira la entrada `ariaCurrentWhenActive` de `routerLinkActive`.
- Cuidado: `sr-only` con `display: none` **no** funciona; investiga por qué.

---

### Ejercicio 4 — El estado de carga es ruido 🟠 Alto

**Archivo:** `src/app/components/products-skeleton/products-skeleton.html`

```html
@for (item of '12345678'; track $index) {
  <div role="status" …>
    <div role="status" …>
      <span class="sr-only">Loading...</span>
    </div>
    …
    <span class="sr-only">Loading...</span>
  </div>
}
```

**El problema.** Cuenta las live regions: 8 iteraciones × 2 `role="status"`
anidados = **16 regiones**, cada una con el texto "Loading...". Y hay un
`role="status"` **dentro de otro**, que es anidamiento inválido de live regions.

Resultado: en lugar de un aviso claro, el lector emite ruido impredecible. Es el
error 2 de la §1.9 en estado puro, y también ilustra el "ningún ARIA es mejor que
mal ARIA".

**Lineamientos:**

1. **Cuenta las regiones actuales** y bórralas todas. Este ejercicio empieza
   quitando, no añadiendo.
2. **Marca el esqueleto como decorativo.** Las barras grises no son contenido:
   son un placeholder visual. Consulta la checklist de §2.0, fila "puramente
   decorativo".
3. **Decide dónde vive la única región que quede.** Esta es la parte importante,
   así que razónala con el error 1 de §1.9:
   - El esqueleto **solo existe mientras carga**. Cuando llegan los datos,
     desaparece del DOM.
   - Una live region debe existir **antes** de que cambie su contenido.
   - Pregunta guía: *si la región nace y muere junto con el estado que quiere
     anunciar, ¿llega a anunciar algo?*

   La conclusión debería llevarte a un archivo distinto del que estás editando.
4. **Redacta el mensaje.** "Loading..." es pobre y está en inglés (ver ejercicio
   7). Piensa qué necesita saber alguien que no ve la pantalla, y recuerda que
   hay **dos** momentos que anunciar: cuando empieza a cargar y cuando terminó.
5. **Evalúa `aria-busy`** en el contenedor del listado. Lee §1.9 y decide si
   aporta o si es redundante con lo que ya hiciste.
6. **Verifica** con el lector de pantalla, o al menos inspeccionando que solo
   exista una región en el árbol de accesibilidad.

**Criterios de aceptación:**
- [ ] Existe **una sola** live region para todo el estado de carga
- [ ] Las barras decorativas del esqueleto no aportan nada al árbol de accesibilidad
- [ ] El anuncio es informativo (no un "Loading" repetido)
- [ ] Investiga si la región debe estar en el esqueleto o en la página que lo
      muestra, y justifícalo con el error 1 de la §1.9

**Pregunta para pensar:** el esqueleto solo existe **mientras** carga. ¿Puede una
live region anunciar algo si nace y muere con el contenido que quiere anunciar?

---

### Ejercicio 5 — Cambiar de ruta es silencioso 🟠 Alto

**Archivos:** a decidir por ti (`src/app/app.ts` es el punto natural)

**El problema.** El de la §1.10. Al pulsar "Characters" en la navegación, un
usuario de lector de pantalla no percibe **nada**: el foco no se mueve y no hay
anuncio. Ya resolvimos la mitad en el tema 01 — el `<title>` sí cambia — pero el
`<title>` no se anuncia automáticamente en una SPA.

**Lineamientos:**

1. **Elige el punto de montaje.** Tiene que ser un componente que **no se
   destruya** al cambiar de ruta — si se destruye, la región desaparece y
   volvemos al error 1 de §1.9. En esta aplicación solo hay un candidato.
2. **Renderiza la región vacía desde el primer render.** Live region `polite`,
   oculta visualmente (reutiliza la técnica del ejercicio 3).
3. **Escucha las navegaciones.** `Router.events` emite muchos tipos de evento;
   te interesa solo el que indica que la navegación **terminó**. Fíltralo.
4. **Decide de dónde sale el texto.** El servicio `Title` ya contiene el título
   correcto porque el servicio `Seo` lo fijó (tema 01). Léelo de ahí en lugar de
   mantener una segunda lista de nombres.
5. **Cuidado con el timing — esto es lo interesante del ejercicio.** En
   `character-details`, el título no se fija en `ngOnInit`: se fija **cuando
   responde la petición HTTP**. El evento de navegación llega antes. Comprueba
   qué anuncia tu implementación al entrar a una ficha y decide cómo resolverlo:
   - ¿Un pequeño retardo? (frágil, pero simple)
   - ¿Que la fuente del anuncio no sea el título sino algo que la página
     controle explícitamente?
   - ¿Anunciar dos veces?

   No hay una respuesta obvia. **Documenta tu decisión y su límite** — eso vale
   más en el assessment que una solución perfecta.
6. **Protege el SSR.** Esto no debe ejecutarse en el servidor. Revisa cómo se
   hace en `pricing-page.ts`.
7. **Limpia la suscripción** al destruir el componente, o usa el mecanismo que
   prefieras para evitar la fuga.
8. **Después, y solo después**, mira `LiveAnnouncer` del CDK (§1.11) y anota en
   dos líneas qué hace igual y qué hace mejor que lo tuyo.

**Criterios de aceptación:**
- [ ] Al completar una navegación se anuncia la página nueva
- [ ] El anuncio usa el título que ya gestiona el servicio `Seo` (no dupliques la fuente)
- [ ] La live region existe en el DOM desde el render inicial
- [ ] No se ejecuta en el servidor durante el SSR
- [ ] El anuncio no interrumpe: es `polite`

**Pistas:**
- Los eventos del Router y el operador `filter` sobre `NavigationEnd`.
- Para no ejecutarlo en SSR, revisa cómo lo hicimos en `pricing-page.ts`.
- **Hazlo a mano primero.** Después, si quieres, compara con `LiveAnnouncer` del
  CDK (§1.11) y anota qué hace igual y qué hace mejor.

---

### Ejercicio 6 — Jerarquía de encabezados rota 🟡 Medio

**Archivos:** `characters-page.html`, `character-details.html`, `character-card.html`

**El problema.** Ninguna de esas páginas tiene `<h1>`. `characters-page` empieza en
`<h2>` ("Characters Collection") y las tarjetas usan `<h3>`. Los encabezados son el
principal mecanismo de navegación de un lector de pantalla: saltar de encabezado en
encabezado es su equivalente a escanear la página con la vista.

Las páginas que sí escribimos en el tema 01 (`about`, `contact`, `pricing`) tienen
`<h1>` — compáralas.

**Lineamientos:**

1. **Haz el inventario primero.** Recorre cada página y anota qué niveles usa.
   En DevTools, o con la extensión *HeadingsMap*, se ve el esquema de un vistazo.
2. **Aplica la regla:** un solo `<h1>` por página, que describa su contenido y
   guarde relación con el `<title>` que fija el servicio `Seo`.
3. **En `characters-page`:** el `<h2>` "Characters Collection" es claramente el
   título de la página. Decide si lo promueves o si añades un `<h1>` por encima.
4. **En `character-details`:** el nombre del personaje es el título de la página.
5. **En la tarjeta, piensa en el contexto.** El componente no sabe dónde lo van a
   incrustar. Si la página tiene `h1` y la lista va debajo, ¿qué nivel le
   corresponde a cada tarjeta? Ten en cuenta que **no se puede saltar de `h1` a
   `h3`**.
6. **Verifica** que el esquema resultante se lea como un índice coherente.

**Criterios de aceptación:**
- [ ] Exactamente un `<h1>` por página, que describe su contenido
- [ ] No se salta ningún nivel (no pasar de `h1` a `h3`)
- [ ] El nivel de la tarjeta es coherente con su contexto
- [ ] El `<h1>` guarda relación con el `<title>` que fija el servicio `Seo`

**Nota:** esto beneficia a la accesibilidad **y** al SEO. Buen ejemplo del §1.1.

---

### Ejercicio 7 — Contenido en inglés declarado como español 🟡 Medio

**El problema.** `index.html` declara `lang="es"` (lo pusimos en el tema 01), pero
la navegación dice "About / Contact / Pricing", el listado dice "Characters
Collection" y las tarjetas muestran datos en inglés desde la API. Un sintetizador
de voz leerá el inglés con fonética española: incomprensible.

**Criterios WCAG:** 3.1.1 Idioma de la página (A) · 3.1.2 Idioma de las partes (AA)

**Lineamientos:**

1. **Haz el inventario de idiomas.** Separa tres grupos: interfaz propia
   (navegación, títulos, botones), contenido que escribimos en el tema 01
   (`about`, `contact`, `pricing` — ya están en español) y **datos de la API**
   (nombres, especies, estados — siempre en inglés, no lo controlas).
2. **Elige una estrategia:**

   | Estrategia | Ventaja | Coste |
   |------------|---------|-------|
   | Traducir la interfaz al español | Coherente con `lang="es"` y con el SEO del tema 01 | Hay que tocar varias plantillas |
   | Cambiar el documento a `lang="en"` | Cambio de una línea | Contradice el contenido en español ya escrito, y el `og:locale` |
   | Marcar cada fragmento con `lang` | Máxima precisión | Verboso y fácil de olvidar |

3. **Lo más probable es que necesites combinar.** Aunque traduzcas toda la
   interfaz, los datos de la API seguirán llegando en inglés: ahí el fragmento
   sí hay que marcarlo.
4. **Sé coherente con el tema 01.** `SITE_LOCALE` es `es_CO` y las descripciones
   del servicio `Seo` están en español. La decisión debe encajar con eso.
5. **Verifica** con un lector de pantalla si puedes: la diferencia de
   pronunciación al marcar el `lang` de un fragmento es inmediatamente audible.

**Criterios de aceptación:**
- [ ] Decide una estrategia y déjala escrita: ¿traducir la interfaz, cambiar el
      `lang` del documento, o marcar los fragmentos en inglés?
- [ ] Aplícala de forma coherente en toda la aplicación
- [ ] Si eliges marcar fragmentos, recuerda que los datos de la API **siempre**
      llegan en inglés

**Nota:** hay una decisión de producto aquí, no solo técnica. Justificarla vale
tanto como implementarla.

---

### Ejercicio 8 — Encuéntralos tú 🟢 Verificación

Estos no te los detallo: el objetivo es que practiques la auditoría. Usa las
herramientas de la Parte 3.

**Lineamientos generales para auditar algo por tu cuenta:**

1. **Pregúntale al elemento las cuatro preguntas del árbol** (§1.3): ¿qué rol
   tiene?, ¿qué nombre?, ¿qué estado?, ¿qué valor? Si alguna respuesta es "nada"
   o "algo raro", ahí está el problema.
2. **Pruébalo con teclado** antes que con ninguna herramienta.
3. **Compáralo contra la checklist de decisión** de §2.0.
4. **Contrástalo con axe DevTools**, pero recuerda que no detecta más del ~30 %:
   que no marque nada no significa que esté bien.
5. **Para el contraste**, usa el cuentagotas del panel de estilos de Chrome, que
   calcula la ratio y te dice si cumple AA y AAA.

- [ ] El spinner de `character-details.html` (los tres puntos animados) tiene un
      problema de la §1.9. Identifícalo y corrígelo
- [ ] El `<svg>` de `empty-content.html` es decorativo. Compruébalo en el árbol de
      accesibilidad y actúa
- [ ] Mide el contraste del enlace activo de la navegación (`text-blue-500` sobre
      `bg-slate-900`). Anota la ratio y si cumple AA para texto normal (4.5:1)
- [ ] El componente `EmptyContent` **no se usa en ninguna parte**. La página de
      personajes muestra el esqueleto cuando la lista está vacía, confundiendo
      "cargando" con "sin resultados". ¿Qué implica eso para un lector de pantalla?
- [ ] Revisa si `characters-page.html` distingue realmente entre esos dos estados

---

### Extra — Deuda técnica detectada de paso

No es accesibilidad, pero lo encontré auditando y afecta al resultado visual:

- `character-card.html` usa `h-87.5`, `sm:h-112.5` y `border-1`; `navbar.html` usa
  `position-absolute` y `justify-content-between`. **Ninguna es una clase válida de
  Tailwind** (las dos últimas son de Bootstrap). Verificado contra el CSS
  compilado: generan cero reglas. Como consecuencia, las imágenes de las tarjetas
  no tienen altura reservada → **layout shift (CLS)**.
- `tailwind.config.js` tiene `content: ["./src/**/*.{html,js}"]` — **no incluye
  `.ts`**. Cualquier clase escrita en un componente TypeScript se purgaría.
- `@for (character of …; track $index)` debería trazar por `character.id`. Con
  `$index`, al cambiar de página Angular reutiliza los nodos y puede emparejar mal
  los datos.
- **Pendiente del tema 01:** la ruta `/` devuelve **404**. Al convertir el comodín
  en una 404 real, la raíz dejó de estar cubierta. Falta declarar `path: ''`.

---

## Parte 3 — Cómo verificar

Ninguna herramienta automática detecta más del ~30 % de los problemas reales. Son
un filtro previo, no un certificado.

### Prueba de teclado (la más valiosa, y es gratis)

Suelta el ratón y recorre la aplicación entera:

| Tecla | Debe hacer |
|-------|-----------|
| `Tab` / `Shift+Tab` | Avanzar y retroceder por los elementos interactivos |
| `Enter` | Activar enlaces y botones |
| `Espacio` | Activar botones y marcar casillas |
| `Esc` | Cerrar diálogos y menús |

Preguntas de control: ¿ves **siempre** dónde está el foco? ¿El orden sigue al orden
visual? ¿Puedes llegar a todo? ¿Te quedas atrapado en algún sitio?

> Con el estado actual del laboratorio, no podrás abrir ninguna ficha de personaje
> ni cambiar de página. Ese es el ejercicio 1 y el 2.

### El árbol de accesibilidad

Chrome DevTools → *Elements* → panel **Accessibility**. Ahí ves el rol, el nombre
calculado y los estados de cada nodo. Es la forma de comprobar si tu ARIA hizo lo
que creías.

### Herramientas automáticas

| Herramienta | Para qué |
|-------------|----------|
| **Lighthouse** (DevTools) | Auditoría rápida. `npx lighthouse http://localhost:4200 --only-categories=accessibility` |
| **axe DevTools** (extensión) | Más preciso que Lighthouse; explica cada regla |
| **WAVE** (extensión) | Visualiza los problemas sobre la propia página |
| **eslint-plugin-jsx-a11y** | No aplica a Angular; el equivalente es el linter de plantillas de Angular ESLint |

### Lector de pantalla

Ninguna auditoría es completa sin escuchar la página. Windows trae **Narrador**
(`Ctrl+Win+Enter`), pero el estándar de facto en Windows es **NVDA** (gratuito).
Practica con la vista de exploración y con la navegación por encabezados (`H`) y
landmarks (`D`).

---

## Parte 4 — Preguntas de assessment

<details>
<summary><b>¿Qué es el árbol de accesibilidad?</b></summary>

Una estructura paralela al DOM que el navegador construye para las tecnologías de
asistencia. Cada nodo se reduce a **rol** (qué es), **nombre** (cómo se llama),
**estado** (en qué situación está) y **valor** (qué contiene).

Es importante porque **ARIA no hace ninguna otra cosa que modificar ese árbol**: no
cambia el aspecto, ni el comportamiento, ni añade funcionalidad.
</details>

<details>
<summary><b>¿Cuál es la primera regla de ARIA?</b></summary>

**No usar ARIA.** Si existe un elemento HTML nativo con la semántica y el
comportamiento que necesitas, úsalo en lugar de recrearlo con roles y atributos.

Un `<button>` nativo trae gratis el rol, el foco, el manejo de Enter y Espacio, el
estado `disabled` y la integración con el sistema operativo. Un
`<div role="button">` no trae **nada** de eso: solo la etiqueta.
</details>

<details>
<summary><b>¿Por qué <code>role="button"</code> en un div no basta?</b></summary>

Porque ARIA solo cambia lo que se **anuncia**, no lo que el elemento **hace**. El
div sigue sin recibir foco al tabular y sin responder a Enter o Espacio.

El resultado es peor que no poner nada: el lector anuncia "botón", el usuario
intenta activarlo y no ocurre nada. Has creado una promesa falsa. Para que
funcionara harían falta, como mínimo, `tabindex="0"` y manejadores de teclado para
Enter y Espacio — es decir, reimplementar a mano lo que `<button>` ya hace.
</details>

<details>
<summary><b>¿Cuándo <code>&lt;a&gt;</code> y cuándo <code>&lt;button&gt;</code>?</b></summary>

`<a href>` cuando **navegas** a otra URL; `<button>` cuando **ejecutas una acción**
en la página. Se diferencian también en el teclado: el enlace se activa con Enter,
el botón con Enter **y** Espacio.

Regla práctica en Angular: si lleva `routerLink`, es navegación, así que es un
`<a>`. Y ojo — un `<a>` sin `href` ni `routerLink` **no es enfocable**: es tan
inaccesible como un `div`.
</details>

<details>
<summary><b>¿Cómo se calcula el nombre accesible?</b></summary>

Por orden de prioridad, quedándose con el primero que exista:

1. `aria-labelledby`
2. `aria-label`
3. atributo nativo (`<label for>`, `alt`, `<caption>`…)
4. contenido de texto
5. `title`

La consecuencia importante: **`aria-label` pisa el texto visible**. Si un botón
dice "Guardar" y le pones `aria-label="Enviar"`, el lector dice "Enviar" y quien usa
control por voz no puede activarlo diciendo "Guardar". Eso incumple el criterio
WCAG 2.5.3 *Etiqueta en el nombre*.
</details>

<details>
<summary><b>¿Qué es una live region y cuándo se usa <code>assertive</code>?</b></summary>

Una zona del DOM cuyos cambios se anuncian **sin mover el foco**. Resuelve el
problema de las SPAs: el contenido cambia y el usuario de lector de pantalla no se
entera.

`polite` espera a que el lector termine lo que está diciendo, y es lo correcto casi
siempre. `assertive` **interrumpe** y se reserva para errores críticos: usarlo por
defecto convierte la aplicación en algo inutilizable.

Atajos: `role="status"` equivale a `polite` + `atomic`, y `role="alert"` a
`assertive` + `atomic`.
</details>

<details>
<summary><b>Trampa: ¿por qué a veces una live region no anuncia nada?</b></summary>

Porque **debe existir en el DOM antes de que cambie su contenido**. Si insertas un
elemento nuevo que ya trae el texto dentro, muchos lectores no lo anuncian: no había
región que observar.

La solución es renderizar el contenedor vacío desde el inicio y escribir el mensaje
dentro después.

El segundo motivo habitual es tener varias live regions compitiendo: se pisan y
producen ruido impredecible en lugar de anuncios ordenados.
</details>

<details>
<summary><b>¿Qué problema de accesibilidad tienen todas las SPAs?</b></summary>

Al cambiar de ruta no se recarga la página, así que **el foco no se mueve y nada se
anuncia**. El usuario activa un enlace y, hasta donde percibe, no ha pasado nada.

Se resuelve de dos formas, combinables: anunciar el cambio con una live region a
nivel de aplicación, o mover el foco al `<h1>` de la página nueva (que necesita
`tabindex="-1"` para ser enfocable por programa sin entrar en el orden de
tabulación).

Cambiar el `<title>` — como hicimos por SEO en el tema 01 — **no** es suficiente:
no se anuncia automáticamente.
</details>

<details>
<summary><b>Diferencia entre <code>tabindex="0"</code>, <code>"-1"</code> y valores positivos</b></summary>

- `0`: enfocable por teclado, en el orden natural del documento.
- `-1`: enfocable **solo por programa** (`.focus()`), fuera de la tabulación. Es lo
  que se usa para mover el foco a un encabezado o a un diálogo.
- Positivos: **nunca**. Rompen el orden natural, crean un orden paralelo imposible
  de mantener y son un antipatrón reconocido.
</details>

<details>
<summary><b>¿A qué nivel de WCAG hay que apuntar?</b></summary>

**AA.** Es el nivel que exigen las leyes (European Accessibility Act, ADA,
EN 301 549) y los contratos. El nivel A es el mínimo sin el cual la página es
inutilizable para algunos usuarios, y AAA no se exige para sitios completos — ni el
propio W3C lo recomienda como meta global.

La versión vigente es WCAG 2.2, de octubre de 2023.
</details>

<details>
<summary><b>¿Por qué se dice que "ningún ARIA es mejor que mal ARIA"?</b></summary>

Porque ARIA **modifica lo que se anuncia sin modificar lo que el elemento hace**.
Un atributo incorrecto no degrada: miente. Un `aria-expanded="false"` que nunca se
actualiza, o un `role="button"` sin manejo de teclado, dejan al usuario peor que si
no hubiera nada.

Los análisis anuales de WebAIM lo confirman: las páginas con ARIA presentan de
forma consistente **más** errores detectados que las que no lo usan.
</details>

<details>
<summary><b>¿Qué relación hay entre accesibilidad y SEO?</b></summary>

Comparten la misma raíz: ambos consisten en **exponer significado a un cliente que
no percibe el diseño visual**. Un rastreador y un lector de pantalla tienen el mismo
problema.

Por eso se solapan tanto: HTML semántico, jerarquía correcta de encabezados, texto
alternativo en imágenes, `lang` declarado y enlaces con texto descriptivo mejoran
las dos cosas a la vez.

No son idénticos —el contraste de color no afecta al SEO, y los canonicals no
afectan a la accesibilidad— pero el HTML bien estructurado es la base común.
</details>

---

## Referencias

- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) — patrones de referencia para cada componente
- [Using ARIA — las cinco reglas](https://www.w3.org/TR/using-aria/)
- [WCAG 2.2 (Quick Reference)](https://www.w3.org/WAI/WCAG22/quickref/)
- [Angular CDK a11y](https://material.angular.dev/cdk/a11y/overview)
- [MDN — ARIA](https://developer.mozilla.org/es/docs/Web/Accessibility/ARIA)
- [WebAIM Million](https://webaim.org/projects/million/) — el informe anual
