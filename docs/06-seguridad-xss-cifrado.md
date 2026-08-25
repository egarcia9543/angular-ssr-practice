# 06 — Seguridad web: XSS y algoritmos de cifrado

> **Temas:** tipos de XSS · contextos de escapado · defensas de Angular · CSP · Trusted Types · familias de algoritmos criptográficos · cuándo aplicar cada uno · criptografía en el frontend y teatro de seguridad
> **Estado:** teoría y auditoría completas. **La implementación la hace Esteban** (Parte 2).

---

## Parte 1 — Teoría

# A · Cross-Site Scripting (XSS)

### 1.1 Qué es, en una frase

> **XSS es lograr que el navegador ejecute código del atacante dentro del origen de
> tu sitio, con todos los privilegios de tu aplicación.**

La causa raíz siempre es la misma: **se mezclan datos con código**. Un dato que
debía ser texto acaba interpretado como instrucción. Es la misma familia de fallo
que la inyección SQL, pero en el navegador.

**Qué gana el atacante** — conviene poder enumerarlo, porque justifica el esfuerzo:

- Leer `localStorage`, `sessionStorage` e `IndexedDB` → robo de tokens (tema 05)
- Hacer peticiones **como el usuario autenticado** (las cookies viajan solas)
- Registrar pulsaciones de teclado: capturar credenciales del formulario de login
- Modificar el DOM: falsificar la interfaz, insertar un login falso
- Persistirse y propagarse (los gusanos XSS clásicos de las redes sociales)

Y lo importante: **el navegador no puede distinguirlo de tu propio código**. Se
ejecuta en tu origen, con tu sesión.

---

### 1.2 Los tres tipos

| Tipo | Dónde vive el payload | Ejemplo |
|------|----------------------|---------|
| **Almacenado** (persistente) | En tu base de datos | Un comentario con `<script>` que se sirve a todos los visitantes |
| **Reflejado** | En la URL, devuelto en la respuesta | `?buscar=<script>…` y la página imprime el término sin escapar |
| **Basado en DOM** | **Nunca toca el servidor** | El JS del cliente lee `location.hash` y lo mete en `innerHTML` |

**El basado en DOM es el más relevante en una SPA**, y el más difícil de detectar:
el servidor jamás ve el payload, así que ningún WAF ni log del backend lo captura.
Todo ocurre entre `location` y un *sink* del navegador.

También conviene conocer el **mXSS** (*mutation XSS*): HTML que parece inofensivo
pero que el parser del navegador **reescribe** al insertarlo, produciendo algo
ejecutable. Es la razón por la que **no debes escribir tu propio sanitizador**.

---

### 1.3 Las fuentes y los sumideros

El modelo mental que hace falta: un XSS de DOM necesita una **fuente** (dato
controlable) que llegue a un **sumidero** (API que interpreta código).

**Fuentes:** `location.href`, `.search`, `.hash`, `document.referrer`,
`postMessage`, `localStorage`, respuestas de API, campos de formulario.

**Sumideros peligrosos:**

| Sumidero | Por qué |
|----------|---------|
| `innerHTML`, `outerHTML`, `insertAdjacentHTML` | Interpretan HTML |
| `document.write` | Idem |
| `eval`, `new Function` | Ejecutan cadenas como código |
| `setTimeout('…')` / `setInterval('…')` con string | Equivalen a `eval` |
| `location = …`, `location.href = …` | Permiten `javascript:` |
| `<iframe srcdoc>`, `<script src>` | Cargan código |
| `element.setAttribute('on…', …)` | Manejadores de evento |

**Auditar seguridad de front es, en gran medida, seguir el camino fuente → sumidero.**

---

### 1.4 El escapado depende del **contexto** ⭐

Este es el concepto que separa una respuesta superficial de una buena. **No existe
"escapar" a secas**: hay que escapar *para un contexto concreto*, y lo que es
seguro en uno es peligroso en otro.

| Contexto | Ejemplo | Qué hay que neutralizar |
|----------|---------|-------------------------|
| Cuerpo HTML | `<div>DATO</div>` | `< > & " '` |
| Atributo HTML | `<div title="DATO">` | Comillas, y **siempre entrecomillar** |
| URL | `<a href="DATO">` | Validar el **esquema**: bloquear `javascript:`, `data:` |
| Dentro de `<script>` | `var x = "DATO"` | Escapado JS **y** la secuencia `</script>` |
| CSS | `style="width: DATO"` | `expression()`, `url()` |

El caso de `<script>` es el más sutil, y **ya lo tienes resuelto en este proyecto**.
En `src/app/services/seo.ts`, el JSON-LD se serializa así:

```ts
JSON.stringify(schema)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026');
```

Sin eso, un dato de la API que contuviera la cadena `</script>` **cerraría el
bloque** y todo lo posterior se interpretaría como HTML. Es un vector real, y es un
buen ejemplo para llevar a una entrevista: **escapado consciente, específico del
contexto, sobre datos de terceros**.

---

### 1.5 Las defensas de Angular (y sus límites)

Angular es de los frameworks más seguros por defecto, pero conviene saber
**exactamente** qué cubre.

#### Lo que hace por ti

**1. Interpolación auto-escapada.** `{{ dato }}` **siempre** se trata como texto:

```html
<!-- Si dato = '<img src=x onerror=alert(1)>' -->
<p>{{ dato }}</p>
<!-- Renderiza el texto literal. NO ejecuta nada. -->
```

**2. Sanitización por contexto de seguridad.** Angular define cinco:

| `SecurityContext` | Se aplica a | Comportamiento |
|-------------------|-------------|----------------|
| `HTML` | `[innerHTML]` | **Sanitiza**: elimina scripts y manejadores |
| `STYLE` | `[style]` | Sanitiza |
| `URL` | `[href]`, `[src]` | Bloquea `javascript:` y esquemas peligrosos |
| `RESOURCE_URL` | `<script src>`, `<iframe src>` | **No se puede sanitizar**: se rechaza salvo bypass explícito |
| `NONE` | — | Sin tratamiento |

`RESOURCE_URL` no se sanitiza por una razón de fondo: cargar un recurso ejecutable
desde una URL es **inherentemente** una decisión de confianza. No hay filtrado
posible; solo puedes decidir si confías o no.

#### Lo que NO cubre

| Angular no te protege de… | Detalle |
|---------------------------|---------|
| `bypassSecurityTrust*` | Es una **puerta de escape**: desactiva la protección a propósito |
| Manipulación directa del DOM | `nativeElement.innerHTML = …` esquiva todo el sistema |
| Plantillas construidas con datos | Compilar una plantilla desde entrada de usuario es ejecución de código |
| Librerías de terceros | Un componente que use `innerHTML` por dentro |
| XSS del lado del servidor | Si el backend inyecta HTML en `index.html` antes de servirlo |

**La regla sobre `bypassSecurityTrustHtml`:** solo con contenido de una fuente que
controlas o que ya has sanitizado con una librería probada (DOMPurify). Si el
argumento viene de una API o de un usuario, es una vulnerabilidad, no una
optimización.

> **Matiz para el assessment:** *"Angular escapa la interpolación y sanitiza por
> contexto de seguridad. Los agujeros aparecen cuando alguien usa
> `bypassSecurityTrust*` o toca el DOM directamente — la protección es buena, pero
> es renunciable."*

---

### 1.6 Content Security Policy (CSP)

La segunda línea de defensa: **asume que un XSS puede colarse** y limita lo que el
navegador está dispuesto a ejecutar.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'nonce-r4nd0m' 'strict-dynamic';
  object-src 'none';
  base-uri 'none';
```

#### Por qué las listas de permitidos fallan

El enfoque intuitivo —`script-src 'self' https://cdn.ejemplo.com`— **está
desaconsejado**. Investigación de Google sobre miles de políticas reales encontró
que la mayoría de listas de dominios son evadibles: basta con que un dominio
permitido aloje un endpoint JSONP o una copia de una librería con capacidad de
cargar código.

**El enfoque moderno es CSP estricta**, con dos piezas:

- **`nonce`** — un valor aleatorio **distinto en cada respuesta**, que se pone en
  la cabecera y en cada `<script>` legítimo. El atacante no puede adivinarlo.
- **`'strict-dynamic'`** — los scripts que ya confías pueden cargar otros. Esto es
  lo que hace viable la CSP en aplicaciones con carga dinámica de módulos, como
  Angular con `loadComponent`.

**Requisito no negociable:** el nonce debe **generarse por petición**. Un nonce fijo
en un archivo estático no aporta absolutamente nada.

#### Las dos directivas que todo el mundo olvida

- **`object-src 'none'`** — bloquea `<object>` y `<embed>`, vectores clásicos
- **`base-uri 'none'`** — impide que un `<base>` inyectado redirija todas las rutas
  relativas al servidor del atacante

#### Cómo desplegarla sin romper nada

Usa primero **`Content-Security-Policy-Report-Only`** con `report-to`. Recoges
violaciones reales durante unas semanas, ajustas, y solo entonces aplicas la
cabecera real.

#### En Angular

Angular necesita insertar estilos, y para eso existe el token **`CSP_NONCE`**
(verificado disponible en tu versión). También se puede pasar el nonce por el
atributo `ngCspNonce` en `<app-root>`.

---

### 1.7 Trusted Types — matar el XSS de DOM en el sumidero

El enfoque más avanzado disponible hoy. En lugar de intentar filtrar todas las
entradas, **cambia la regla del navegador**: los sumideros peligrosos dejan de
aceptar strings.

```
Content-Security-Policy: require-trusted-types-for 'script'
```

Con esto activo, `element.innerHTML = "texto"` **lanza una excepción**. Solo se
aceptan objetos `TrustedHTML` producidos por una *policy* que tú declaras y que
concentra toda la lógica de sanitización en un punto auditable.

**El cambio conceptual:** pasas de "revisar que ningún dato peligroso llegue a un
sumidero" a "es imposible que un string llegue a un sumidero". Deja de ser una
disciplina y pasa a ser una garantía.

**Limitación real:** soportado en navegadores basados en Chromium. Firefox y Safari
todavía no lo implementan, así que es **defensa en profundidad**, no sustituto de
lo demás. Angular es compatible con Trusted Types.

---

### 1.8 Las otras cabeceras

| Cabecera | Qué hace |
|----------|----------|
| `Strict-Transport-Security` | Fuerza HTTPS en visitas posteriores |
| `X-Content-Type-Options: nosniff` | Impide que el navegador adivine el tipo MIME |
| `Referrer-Policy` | Controla cuánta URL se filtra al navegar fuera |
| `Permissions-Policy` | Desactiva APIs que no usas (cámara, micrófono, geolocalización) |
| `X-Frame-Options` / `frame-ancestors` | Anti-clickjacking. `frame-ancestors` en CSP es el moderno |

> **Dato de actualidad:** `X-XSS-Protection` está **obsoleta y retirada** de los
> navegadores modernos. Su filtro heurístico llegó a introducir vulnerabilidades
> propias. Recomendarla hoy delata material antiguo; lo correcto es `0` u omitirla.

---

# B · Algoritmos de cifrado

### 1.9 El encuadre honesto

> **Como desarrollador frontend, tu trabajo casi nunca es *implementar*
> criptografía. Es saber *cuál* corresponde, *dónde* debe ejecutarse y *cuándo* no
> hace falta ninguna.**

La regla de oro del área: **no inventes criptografía y no implementes primitivas**.
Usa `crypto.subtle` en el navegador, la librería estándar en el servidor, y TLS
para el transporte. Los fallos criptográficos reales casi nunca son "rompieron
AES": son claves mal gestionadas, nonces reutilizados o el algoritmo equivocado
para el problema.

---

### 1.10 Las tres familias

#### a) Funciones hash — **de un solo sentido**

Convierten cualquier entrada en una huella de tamaño fijo. **No se pueden
revertir**, y no son cifrado: no hay nada que descifrar.

| Algoritmo | Estado |
|-----------|--------|
| **SHA-256 / SHA-384 / SHA-512** | ✅ Correctos para integridad |
| SHA-3 | ✅ Alternativa moderna |
| SHA-1 | ❌ Roto para resistencia a colisiones |
| MD5 | ❌ Completamente roto |

**Para qué:** verificar integridad, deduplicar, generar identificadores derivados,
**Subresource Integrity**.

**Para qué NO: contraseñas.** Y esta es una distinción que se pregunta mucho.

#### El caso especial: contraseñas

Un hash rápido es exactamente lo contrario de lo que quieres, porque permite probar
miles de millones de candidatos por segundo con GPU. Las contraseñas necesitan
funciones **deliberadamente lentas** y con **sal**:

| Algoritmo | Recomendación |
|-----------|---------------|
| **Argon2id** | ✅ El estándar actual (ganador del Password Hashing Competition) |
| **bcrypt** | ✅ Sólido y muy probado |
| **scrypt** | ✅ Resistente a memoria |
| **PBKDF2** | ⚠️ Aceptable con muchas iteraciones; requerido en entornos FIPS |
| SHA-256 a secas | ❌ **Error grave** |

**La sal** (única por usuario) impide las tablas precomputadas y que dos usuarios
con la misma contraseña tengan el mismo hash.

Y lo decisivo: **esto ocurre siempre en el servidor**. Nunca en el navegador
(§1.13).

#### b) Cifrado simétrico — una sola clave

La misma clave cifra y descifra. Rápido, apto para volúmenes grandes.

| Algoritmo | Nota |
|-----------|------|
| **AES-GCM** | ✅ La opción por defecto. Es **AEAD**: cifra *y* autentica |
| **ChaCha20-Poly1305** | ✅ Excelente donde no hay aceleración de AES por hardware |
| AES-CBC | ⚠️ Sin autenticación propia; exige un HMAC aparte. Fácil de usar mal |

**AEAD** (*Authenticated Encryption with Associated Data*) es el concepto que hay
que saber: garantiza **confidencialidad e integridad a la vez**. Sin autenticación,
un atacante puede alterar el texto cifrado sin que lo detectes.

**Regla crítica de AES-GCM:** **nunca reutilices un nonce/IV con la misma clave**.
Hacerlo rompe la seguridad por completo, no la degrada. Genera el IV con
`crypto.getRandomValues()` en cada operación.

**Su problema:** distribuir la clave. Si ambos extremos deben conocerla, ¿cómo
llega hasta allí de forma segura?

#### c) Cifrado asimétrico — par de claves

Clave pública (se reparte) y privada (se guarda). Lo cifrado con una solo se abre
con la otra. Resuelve la distribución de claves, pero es **órdenes de magnitud más
lento**.

| Uso | Algoritmos |
|-----|-----------|
| Firma digital | **Ed25519**, **ECDSA** (P-256), RSA-PSS |
| Intercambio de clave | **ECDH**, RSA-OAEP |

**En la práctica se combinan:** el asimétrico se usa para acordar una clave de
sesión, y a partir de ahí todo va con simétrico. **Eso es exactamente lo que hace
TLS**, y explicarlo así demuestra que entiendes por qué existen ambas familias.

#### Y dos piezas más que hay que nombrar

- **HMAC** — autentica un mensaje con una clave compartida. Prueba origen e
  integridad; no confidencialidad. Es lo que valida las firmas de los webhooks.
- **KDF** (`PBKDF2`, `HKDF`, Argon2) — deriva claves criptográficas a partir de
  material débil, como una contraseña.
- **Aleatoriedad** — `crypto.getRandomValues()` y `crypto.randomUUID()`.
  **`Math.random()` NO es criptográficamente seguro** y jamás debe usarse para
  tokens, IDs de sesión ni nonces.

---

### 1.11 La tabla de decisión ⭐

Esta responde literalmente el "sabe cuándo aplicar":

| Necesito… | Uso | Dónde |
|-----------|-----|-------|
| Verificar que algo no cambió | **SHA-256** | Cualquiera |
| Guardar contraseñas | **Argon2id** / bcrypt | **Solo servidor** |
| Proteger datos en reposo | **AES-GCM** | Servidor (o cliente si es E2EE) |
| Proteger datos en tránsito | **TLS** — no hagas nada más | Infraestructura |
| Probar que un mensaje viene de quien dice | **HMAC** (secreto compartido) o **firma** (asimétrica) | Servidor |
| Acordar una clave por canal inseguro | **ECDH** | Ambos |
| Generar un token aleatorio | **`crypto.getRandomValues()`** | Cualquiera |
| Verificar un script de un CDN | **SRI** (hash SHA-384) | Navegador |
| Autenticar sin contraseña | **WebAuthn / passkeys** | Ambos |

---

### 1.12 Las tres confusiones clásicas

**1. Codificación ≠ cifrado ≠ hash.**

| | Reversible | Necesita clave | Para qué |
|---|---|---|---|
| **Codificación** (Base64, URL-encode) | Sí, por cualquiera | No | **Transporte**, no seguridad |
| **Hash** (SHA-256) | No | No | Integridad |
| **Cifrado** (AES) | Sí, con la clave | Sí | Confidencialidad |

*"Lo guardé en Base64 para que no se vea"* no es seguridad: es codificación, y se
revierte con una función del navegador.

**2. Un JWT NO está cifrado.**

Es la confusión más frecuente y la más peligrosa. Un JWT estándar (JWS) está
**firmado**, no cifrado: el payload es Base64URL y **cualquiera con el token puede
leerlo**. La firma garantiza que no fue **alterado**, no que sea secreto.

**Nunca metas datos sensibles en el payload de un JWT.** Para cifrarlo de verdad
existe JWE, que casi nadie usa.

Dos ataques históricos que conviene citar: **`alg: none`**, donde el servidor
aceptaba tokens sin firma; y **confusión de algoritmo**, donde se hacía pasar
`RS256` por `HS256` usando la clave pública como secreto HMAC. Ambos se evitan
fijando el algoritmo esperado en el servidor en lugar de leerlo del token.

**3. HTTPS no cifra "todo".**

TLS protege el **transporte**. Los datos siguen en claro en ambos extremos: en tu
base de datos y en el navegador del usuario. HTTPS no protege contra XSS, ni contra
una BD comprometida.

---

### 1.13 Criptografía en el frontend: legítima vs. teatro ⭐

La sección más útil para el assessment, porque distingue criterio de repetición.

#### Cuándo SÍ tiene sentido

| Caso | Por qué |
|------|---------|
| **Cifrado extremo a extremo** | Mensajería, gestores de contraseñas: el servidor **no debe poder** leer |
| **Arquitecturas de conocimiento cero** | La clave se deriva de la contraseña del usuario y nunca sale del dispositivo |
| **WebAuthn / passkeys** | La clave privada vive en el hardware y nunca se transmite |
| **Subresource Integrity** | Verificar que un script de un CDN no fue alterado |
| **Aleatoriedad** | `crypto.getRandomValues()` para nonces e identificadores |
| **Firmar con clave de hardware** | Certificados, llaves de seguridad |

#### Cuándo es teatro de seguridad

| Antipatrón | Por qué no sirve |
|------------|------------------|
| "Cifrar" `localStorage` con una clave que va en el bundle | La clave está en el mismo sitio que el candado. Un XSS lee ambos |
| Hashear la contraseña en el navegador y enviar el hash | **El hash se convierte en la contraseña.** Quien lo intercepte entra igual |
| Ofuscar el JavaScript | Ralentiza a un curioso; no detiene a nadie |
| Validar solo en el cliente | Es **usabilidad**, no seguridad. Se salta con `curl` |
| Cifrar antes de enviar por HTTPS | TLS ya lo hace, y mejor |

> **El principio que lo resume:** en el navegador, **el usuario —y cualquier XSS—
> controla el entorno de ejecución**. Cualquier secreto que le entregues deja de ser
> secreto. La criptografía en el cliente solo aporta valor cuando la clave **no está
> en el cliente**: viene del usuario o de un hardware seguro.

#### La API: Web Crypto

`crypto.subtle` está en todos los navegadores modernos, es asíncrona y **solo
funciona en contextos seguros** (HTTPS o localhost). Ofrece AES-GCM, ECDSA, ECDH,
RSA, HMAC, SHA-2 y PBKDF2.

Que exija contexto seguro es una decisión de diseño coherente: no tiene sentido
hacer criptografía en una página que pudo ser manipulada en tránsito.

---

## Parte 2 — Práctica (la implementación es tuya)

### Ejercicio 1 — Auditar y **demostrar** las defensas actuales 🟢 Empieza aquí

#### El contexto

Auditado el proyecto: **no hay ningún sumidero peligroso**. Ni `innerHTML`, ni
`bypassSecurityTrust*`, ni `eval`. El punto de partida es bueno — y una auditoría
que confirma que algo está bien es un resultado válido.

Pero "no encontré nada" solo vale si sabes **demostrar** por qué está bien.

#### Lineamientos

1. **Escribe la lista de fuentes de datos no confiables** de esta aplicación.
   Pista: la API de Rick and Morty es un tercero. Que sea conocida no la hace
   confiable — la postura correcta es tratar **todo** dato externo como hostil.
2. **Demuestra el auto-escapado de Angular.** Simula un personaje cuyo `name` sea
   `<img src=x onerror="alert(1)">` (intercéptalo en el servicio o falsea la
   respuesta) y comprueba que se pinta como texto literal.
3. **Analiza el enlace de imagen.** `[src]="character().image"` viene de la API.
   ¿Qué contexto de seguridad aplica Angular? ¿Qué pasaría si la API devolviera
   `javascript:alert(1)`? **Pruébalo.**
4. **Estudia el escapado del JSON-LD** en `seo.ts` (§1.4). Explica por escrito por
   qué `JSON.stringify` **no basta** y qué ataque concreto detiene ese `.replace`.
   Es el mejor ejemplo del repo para llevar a una entrevista.
5. **Sigue el camino fuente → sumidero** para al menos dos datos, y documéntalo.

#### Criterios de aceptación
- [ ] Lista de fuentes no confiables documentada
- [ ] Auto-escapado demostrado con un payload real, no solo afirmado
- [ ] Sabes decir qué `SecurityContext` aplica a cada binding de la app
- [ ] Explicas el ataque que detiene el escapado del JSON-LD

---

### Ejercicio 2 — Provocar un XSS y arreglarlo 🔴 El que más enseña

#### El planteamiento

Vas a **introducir la vulnerabilidad a propósito** en una ruta local, verla
funcionar, y luego corregirla bien. Entender un ataque ejecutándolo en tu propia
máquina es la forma más rápida de no volver a escribirlo.

> **Ámbito:** solo en local. No lo despliegues. Cuando termines, o lo eliminas o lo
> dejas documentado como laboratorio explícito, nunca alcanzable desde la
> navegación normal.

#### Lineamientos

1. **Crea una ruta de laboratorio** (por ejemplo `/lab/xss`) con un `<textarea>`
   cuyo contenido se pinte con `[innerHTML]`.
2. **Prueba primero SIN bypass.** Introduce `<img src=x onerror="alert(1)">` y
   observa que Angular **lo sanitiza**. Anota exactamente qué eliminó.
3. **Ahora sí, rompe la protección** con `bypassSecurityTrustHtml` y comprueba que
   el payload se ejecuta. **Ese es el momento del aprendizaje**: la vulnerabilidad
   no la introdujo Angular, la introdujo la llamada al bypass.
4. **Arréglalo, y elige entre dos caminos**, justificando:
   - ¿De verdad necesitas HTML? Si basta texto, `{{ }}` resuelve todo.
   - Si necesitas HTML enriquecido, **sanitiza con DOMPurify** antes de confiar en
     él. **No escribas tu sanitizador** — recuerda el mXSS del §1.2.
5. **Documenta cuándo `bypassSecurityTrustHtml` sería aceptable.** Existe por algo;
   saber su caso legítimo es parte de la respuesta.

#### Criterios de aceptación
- [ ] Reprodujiste el XSS y lo viste ejecutarse
- [ ] Sabes explicar por qué Angular no te protegió en ese caso
- [ ] La corrección está justificada frente a la alternativa
- [ ] La ruta no es alcanzable desde la navegación normal

---

### Ejercicio 3 — CSP y cabeceras de seguridad 🟠 El más "de producción"

#### El contexto

`netlify.toml` ya tiene un bloque `[[headers]]` (lo añadiste para `robots.txt`),
pero **no hay ninguna cabecera de seguridad**. Es un despliegue real, así que esto
es trabajo aplicable, no un ejercicio de juguete.

#### Lineamientos

1. **Empieza por las fáciles**, que no rompen nada: `X-Content-Type-Options`,
   `Referrer-Policy`, `Permissions-Policy` y `Strict-Transport-Security`.
2. **NO añadas `X-XSS-Protection`** (§1.8). Si la ves en un tutorial, es viejo.
3. **La CSP va en modo informe primero.** Usa
   `Content-Security-Policy-Report-Only`, despliega, navega por la app y **mira la
   consola**. Aplicar una CSP a ciegas rompe la aplicación.
4. **No uses lista de dominios** (§1.6). Apunta a CSP estricta con `nonce` y
   `'strict-dynamic'`.
5. **Aquí está la dificultad real, y es la parte valiosa:** el nonce debe ser
   **distinto en cada respuesta**, y `netlify.toml` sirve cabeceras **estáticas**.
   Investiga si tu función SSR puede emitirlo (recuerda `RESPONSE_INIT` del
   tema 05) y cómo se lo pasarías a Angular con `CSP_NONCE` o `ngCspNonce`.
   **Si concluyes que no es viable con tu configuración actual, escríbelo y
   explica qué haría falta** — un análisis honesto de una limitación vale tanto
   como una implementación.
6. **No olvides `object-src 'none'` y `base-uri 'none'`.**
7. **Verifica** con `curl -I` y con securityheaders.com.

#### Criterios de aceptación
- [ ] Cabeceras básicas desplegadas y verificadas con `curl -I`
- [ ] CSP en modo informe, con violaciones revisadas
- [ ] `object-src` y `base-uri` incluidas
- [ ] El problema del nonce por petición está resuelto **o** documentado
- [ ] Ninguna cabecera obsoleta

---

### Ejercicio 4 — Decidir dónde NO usar criptografía 🟡 El de criterio

#### El planteamiento

El enunciado pide *"sabe cuándo aplicar algoritmos de cifrado"*. Para esta
aplicación, la respuesta correcta es en su mayor parte **"en ningún sitio"** — y
argumentarlo bien demuestra más criterio que añadir un AES decorativo.

#### Lineamientos

Escribe un análisis que responda, para los datos del tema 05:

1. **Los favoritos en `localStorage`:** ¿deberían cifrarse? Recorre el §1.13 y
   explica qué protegería exactamente ese cifrado, y de quién. Pista: ¿dónde
   estaría la clave?
2. **La cookie de tema:** ¿necesita firma o cifrado? ¿Cambia la respuesta si la
   cookie guardara el identificador de sesión?
3. **La caché de IndexedDB:** son datos públicos de una API pública. ¿Aporta algo
   cifrarlos?
4. **El escenario hipotético:** si esta aplicación tuviera cuentas de usuario,
   **enumera** qué usarías y dónde, apoyándote en la tabla del §1.11 — contraseñas,
   sesión, datos en tránsito, datos en reposo.
5. **Identifica al menos un antipatrón** del §1.13 que sería tentador aplicar aquí
   y explica por qué no funcionaría.

#### Criterios de aceptación
- [ ] Cada decisión dice **de qué amenaza** protege (o admite que de ninguna)
- [ ] Se aborda explícitamente dónde estaría la clave
- [ ] El escenario con cuentas nombra algoritmos concretos y su ubicación
- [ ] Se identifica y descarta un antipatrón

---

### Ejercicio 5 — Un uso legítimo de Web Crypto 🟢 Opcional

Si quieres tener código criptográfico que enseñar, que sea de los legítimos del
§1.13, no de los teatrales.

**Lineamientos:** elige **uno** y justifícalo.

- **Identificador anónimo de sesión** con `crypto.randomUUID()`, y explica por qué
  `Math.random()` no vale.
- **Clave de caché por hash** para el IndexedDB del tema 05: deriva la clave de la
  URL con SHA-256 vía `crypto.subtle.digest()`. Uso legítimo de hash — integridad y
  derivación, sin pretender confidencialidad.
- **Subresource Integrity**: si añades cualquier recurso externo, calcula su hash
  SHA-384 y ponlo en `integrity`.

**Criterio de aceptación:** puedes explicar **qué amenaza concreta** mitiga. Si no
mitiga ninguna, es teatro — y reconocerlo también es un resultado.

---

## Parte 3 — Preguntas de assessment

<details>
<summary><b>¿Qué es XSS y cuáles son sus tipos?</b></summary>

Lograr que el navegador ejecute código del atacante **dentro del origen de tu
sitio**, con los privilegios de tu aplicación. La causa raíz es mezclar datos con
código.

Tres tipos: **almacenado** (el payload vive en tu BD y se sirve a todos),
**reflejado** (viaja en la URL y la respuesta lo devuelve) y **basado en DOM** (el
JS del cliente lleva un dato controlable hasta un sumidero peligroso).

**El de DOM es el más relevante en una SPA** y el más difícil de detectar, porque el
payload **nunca llega al servidor**: ningún WAF ni log del backend lo ve.
</details>

<details>
<summary><b>¿Cómo protege Angular contra XSS, y dónde falla?</b></summary>

Escapa **toda interpolación** `{{ }}` como texto, y sanitiza según **contexto de
seguridad**: `HTML` en `[innerHTML]`, `URL` en `[href]`/`[src]`, `STYLE`, y
`RESOURCE_URL`, que no puede sanitizarse y por eso se rechaza salvo bypass
explícito.

Falla cuando alguien **renuncia** a la protección: `bypassSecurityTrust*`,
manipulación directa del DOM con `nativeElement.innerHTML`, plantillas construidas
a partir de datos, o librerías de terceros que usen `innerHTML` por dentro.

Resumen: la protección por defecto es buena, pero es **renunciable**.
</details>

<details>
<summary><b>¿Por qué el escapado depende del contexto?</b></summary>

Porque lo que neutraliza un carácter en un sitio lo deja peligroso en otro. Escapar
`< >` sirve en el cuerpo HTML, pero dentro de un atributo el vector son las
comillas, en una URL es el esquema (`javascript:`), y dentro de un `<script>` hay
que neutralizar además la secuencia `</script>`.

Un ejemplo real: en este proyecto, el JSON-LD del servicio SEO escapa `<`, `>` y
`&` a secuencias unicode. Sin eso, un dato que contuviera `</script>` **cerraría el
bloque** y el resto se interpretaría como HTML.
</details>

<details>
<summary><b>¿Por qué no se recomiendan las listas de dominios en CSP?</b></summary>

Porque en la práctica son evadibles: basta con que un dominio permitido aloje un
endpoint JSONP o una copia de una librería capaz de cargar código. Análisis de
Google sobre políticas reales encontraron que la mayoría de listas de permitidos
eran superables.

El enfoque moderno es **CSP estricta**: un **`nonce` distinto en cada respuesta**
más `'strict-dynamic'`, que permite a los scripts ya confiados cargar otros — algo
necesario en apps con carga dinámica de módulos como Angular.

Y dos directivas que casi siempre se olvidan: `object-src 'none'` y
`base-uri 'none'`.
</details>

<details>
<summary><b>¿Qué son Trusted Types?</b></summary>

Un mecanismo que **cambia la regla del navegador**: con
`require-trusted-types-for 'script'`, los sumideros peligrosos dejan de aceptar
strings y solo admiten objetos producidos por una *policy* declarada.

El cambio conceptual es grande: pasas de "vigilar que ningún dato peligroso llegue a
un sumidero" a "es imposible que un string llegue a un sumidero". Elimina el XSS de
DOM por construcción y concentra la sanitización en un punto auditable.

Limitación: solo en navegadores Chromium. Es defensa en profundidad, no sustituto.
</details>

<details>
<summary><b>Diferencia entre hash, cifrado y codificación</b></summary>

- **Codificación** (Base64, URL-encode): reversible **por cualquiera**, sin clave.
  Es para **transporte**, no aporta seguridad.
- **Hash** (SHA-256): **no reversible**, sin clave. Para integridad.
- **Cifrado** (AES): reversible **solo con la clave**. Para confidencialidad.

*"Lo guardé en Base64 para que no se vea"* es el error clásico: eso es codificación
y se revierte con una función del navegador.
</details>

<details>
<summary><b>¿Por qué no se guardan contraseñas con SHA-256?</b></summary>

Porque SHA-256 está diseñado para ser **rápido**, y eso es justo lo contrario de lo
que se necesita: permite probar miles de millones de candidatos por segundo con GPU.

Las contraseñas requieren funciones **deliberadamente lentas** y con **sal** única
por usuario: **Argon2id** (el estándar actual), bcrypt o scrypt. PBKDF2 es aceptable
con muchas iteraciones y es el requerido en entornos FIPS.

La sal impide tablas precomputadas y evita que dos usuarios con la misma contraseña
compartan hash. Y todo esto ocurre **en el servidor**, nunca en el navegador.
</details>

<details>
<summary><b>¿Un JWT está cifrado?</b></summary>

**No.** Un JWT estándar (JWS) está **firmado**, no cifrado: el payload es Base64URL
y **cualquiera que tenga el token lo lee**. La firma garantiza que no fue
**alterado**, no que sea secreto.

Por eso nunca deben ponerse datos sensibles en el payload. Para cifrarlo existe JWE,
que apenas se usa.

Dos ataques históricos que conviene citar: **`alg: none`**, donde el servidor
aceptaba tokens sin firma, y la **confusión de algoritmo** (`RS256` → `HS256`). Se
evitan fijando el algoritmo esperado en el servidor en lugar de leerlo del token.
</details>

<details>
<summary><b>¿Cuándo tiene sentido cifrar en el navegador?</b></summary>

Solo cuando **la clave no está en el cliente**: viene del usuario o de hardware
seguro. Casos legítimos: cifrado extremo a extremo (mensajería, gestores de
contraseñas), arquitecturas de conocimiento cero, **WebAuthn/passkeys**, SRI, y
generación de aleatoriedad con `crypto.getRandomValues()`.

Es **teatro de seguridad** cuando la clave viaja en el bundle: "cifrar"
`localStorage` con una clave que está en el mismo JavaScript no protege de nada,
porque un XSS lee ambas cosas.

El principio: en el navegador, el usuario —y cualquier XSS— **controla el entorno de
ejecución**. Cualquier secreto que le entregues deja de serlo.
</details>

<details>
<summary><b>¿Sirve hashear la contraseña en el cliente antes de enviarla?</b></summary>

No, y es un antipatrón muy repetido: **el hash se convierte en la contraseña**.
Quien lo intercepte puede reenviarlo y autenticarse igual, así que no has ganado
nada — y has perdido la posibilidad de aplicar políticas de contraseña en el
servidor.

Lo correcto: **TLS** protege el envío, y el **servidor** aplica Argon2id o bcrypt
con sal.

Excepción real: en arquitecturas de conocimiento cero se **deriva una clave** en el
cliente con un KDF, pero eso no es "hashear la contraseña para enviarla" — es que
el servidor **nunca** llega a ver el secreto.
</details>

<details>
<summary><b>¿Por qué simétrico y asimétrico se usan juntos?</b></summary>

Porque resuelven problemas distintos y sus costes son complementarios. El simétrico
(AES-GCM) es rápido y apto para volumen, pero exige que ambos extremos ya compartan
la clave. El asimétrico resuelve esa distribución, pero es órdenes de magnitud más
lento.

La combinación estándar: se usa asimétrico (ECDH) para **acordar** una clave de
sesión, y a partir de ahí todo viaja con simétrico. **Es exactamente lo que hace
TLS.**
</details>

<details>
<summary><b>¿HTTPS es suficiente para proteger los datos?</b></summary>

No. TLS protege el **transporte**: confidencialidad e integridad entre navegador y
servidor, más autenticación del servidor.

No protege los datos **en reposo** —siguen en claro en tu BD y en el navegador—, ni
contra XSS, ni contra una base de datos comprometida, ni contra un backend con
fallos de autorización.

Es imprescindible y es solo una capa.
</details>

---

## Referencias

- [OWASP — XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP — DOM-based XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Angular — Security](https://angular.dev/best-practices/security)
- [web.dev — Strict CSP](https://web.dev/articles/strict-csp)
- [MDN — Web Crypto API](https://developer.mozilla.org/es/docs/Web/API/Web_Crypto_API)
- [DOMPurify](https://github.com/cure53/DOMPurify) — el sanitizador de referencia
- [securityheaders.com](https://securityheaders.com/) — verificación rápida de cabeceras
