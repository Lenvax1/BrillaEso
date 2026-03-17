# 🧠 Agent de Prácticas Saludables para Programar

> Guía compacta y accionable para escribir mejor código, mantener salud mental y crecer como desarrollador.

---

## 1. MENTALIDAD Y FILOSOFÍA

### Principios Fundamentales
- **Claridad sobre cleverness**: Código legible > código ingenioso. Tu yo del futuro te lo agradecerá.
- **YAGNI** (You Aren't Gonna Need It): No implementes lo que no necesitas hoy.
- **KISS** (Keep It Simple, Stupid): La solución más simple que funcione es generalmente la correcta.
- **DRY** (Don't Repeat Yourself): Si copias y pegas, algo está mal.
- **Fail fast**: Detecta y reporta errores lo antes posible en el flujo de ejecución.

### Actitud ante los Problemas
- Entiende el problema completamente antes de escribir una sola línea.
- Si no puedes explicarlo con palabras simples, no lo entiendes aún.
- Un error no es un fracaso; es información valiosa.
- Busca la causa raíz, no solo apagues el síntoma.

---

## 2. ESTRUCTURA Y ORGANIZACIÓN DEL CÓDIGO

### Nomenclatura
```
✅ getUserById(id)         ❌ getU(x)
✅ isEmailValid(email)     ❌ check(e)
✅ MAX_RETRY_COUNT = 3     ❌ n = 3
✅ userList / users        ❌ data / stuff / temp
```

- Usa nombres que revelen intención.
- Verbos para funciones (`get`, `set`, `fetch`, `calculate`, `validate`).
- Sustantivos para clases y variables.
- Booleanos con prefijo `is`, `has`, `can`, `should`.
- Evita abreviaciones salvo las universales (`id`, `url`, `img`).

### Funciones
- **Una función = una responsabilidad** (Single Responsibility Principle).
- Máximo ~20 líneas por función; si crece más, divide.
- Máximo 3 parámetros; si necesitas más, usa un objeto.
- Evita efectos secundarios ocultos.
- Retorna pronto (early return) para reducir anidamiento.

```js
// ❌ Difícil de leer
function process(user) {
  if (user) {
    if (user.active) {
      if (user.role === 'admin') {
        // lógica
      }
    }
  }
}

// ✅ Claro y plano
function process(user) {
  if (!user) return;
  if (!user.active) return;
  if (user.role !== 'admin') return;
  // lógica
}
```

### Comentarios
- Comenta el **por qué**, no el **qué** (el código ya dice qué hace).
- Un buen nombre elimina la necesidad de comentario.
- Elimina el código comentado; para eso existe git.

```js
// ❌ Comentario inútil
// incrementa i en 1
i++;

// ✅ Comentario valioso
// Usamos índice base-1 por compatibilidad con la API legacy
const startIndex = 1;
```

---

## 3. CONTROL DE VERSIONES (GIT)

### Commits
- **Un commit = un cambio lógico** (no mezcles refactor con feature).
- Usa mensajes descriptivos en imperativo:
  ```
  ✅ Add email validation to registration form
  ✅ Fix null pointer in user service
  ❌ fix stuff
  ❌ wip
  ❌ asdfgh
  ```
- Formato recomendado (Conventional Commits):
  ```
  type(scope): short description

  feat(auth): add JWT refresh token support
  fix(api): handle empty response from payment service
  refactor(db): extract query builder to separate module
  docs(readme): update installation steps
  test(user): add unit tests for password validation
  ```

### Ramas
- `main` / `master`: solo código producción.
- `develop`: integración continua.
- `feature/nombre-descriptivo`: nuevas funcionalidades.
- `fix/descripcion-del-bug`: correcciones.
- `refactor/que-se-refactoriza`: mejoras de código.

### Buenas Prácticas Git
- Haz pull antes de empezar a trabajar.
- Commits pequeños y frecuentes > un commit gigante al final del día.
- Nunca hagas force push en ramas compartidas.
- Revisa tu diff antes de commitear.

---

## 4. TESTING

### La Pirámide de Tests
```
        /\
       /  \   E2E (pocos, lentos, caros)
      /----\
     /      \  Integración (algunos)
    /--------\
   /          \ Unitarios (muchos, rápidos, baratos)
  /____________\
```

### Reglas de Oro
- Escribe tests antes o junto al código, no después.
- Cada bug corregido debe tener su test de regresión.
- Un test debe verificar una sola cosa.
- Los tests deben ser deterministas (mismo input → mismo output siempre).
- Nombra los tests describiendo el comportamiento esperado:
  ```
  ✅ should_return_error_when_email_is_invalid()
  ✅ given_active_user_when_login_then_returns_token()
  ❌ test1()
  ❌ testLogin()
  ```

### Cobertura
- Apunta a 70–80% de cobertura útil, no al 100% artificial.
- Prioriza: lógica de negocio crítica, casos edge, funciones con historial de bugs.

---

## 5. SEGURIDAD

### Reglas Básicas Innegociables
- **Nunca** hardcodees credenciales, tokens ni API keys en el código.
- Usa variables de entorno (`.env`) y asegúrate de que están en `.gitignore`.
- Valida y sanitiza **todo** input del usuario (no confíes en el frontend).
- Usa HTTPS siempre.
- Mantén dependencias actualizadas (`npm audit`, `pip check`).

### Contraseñas y Auth
- Nunca almacenes contraseñas en texto plano.
- Usa bcrypt, argon2 o scrypt para hashear.
- Implementa rate limiting en endpoints de autenticación.
- Tokens con expiración corta + refresh tokens.

### Datos Sensibles
- Cifra datos sensibles en reposo y en tránsito.
- Aplica principio de mínimo privilegio (cada servicio/usuario solo accede a lo que necesita).
- Nunca loggees información sensible (contraseñas, tarjetas, tokens).

---

## 6. MANEJO DE ERRORES Y LOGS

### Errores
- Nunca silencies errores con `catch` vacío.
- Errores específicos > errores genéricos.
- Proporciona mensajes útiles al usuario y detalle técnico en logs.

```js
// ❌ Peligroso
try {
  await saveUser(data);
} catch (e) {}

// ✅ Correcto
try {
  await saveUser(data);
} catch (error) {
  logger.error('Failed to save user', { userId: data.id, error });
  throw new DatabaseError('Could not save user. Please try again.');
}
```

### Logs
- Usa niveles: `DEBUG`, `INFO`, `WARN`, `ERROR`.
- Loggea eventos de negocio importantes (login, pago procesado, etc.).
- Incluye contexto suficiente para reproducir el problema.
- No loggees datos sensibles.
- Usa un sistema centralizado de logs en producción.

---

## 7. RENDIMIENTO

### Principios
- **No optimices prematuramente.** Primero haz que funcione, luego mide, luego optimiza.
- Mide con profiler real antes de asumir dónde está el cuello de botella.
- El 80% de problemas de performance vienen del 20% del código.

### Patrones Comunes
- Evita N+1 queries (usa joins o eager loading).
- Usa paginación para listados grandes.
- Cachea resultados costosos y poco cambiantes.
- Lazy loading para recursos pesados.
- Índices en columnas que filtras/ordenas frecuentemente.

---

## 8. CODE REVIEW

### Como Autor
- Revisa tu propio PR antes de pedirlo a otros.
- El PR debe tener descripción clara: qué cambia y por qué.
- PRs pequeños y enfocados (< 400 líneas idealmente).
- Responde a los comentarios con apertura, no defensivamente.

### Como Revisor
- Revisa la lógica, no solo el estilo.
- Pregunta antes de asumir malas intenciones: "¿Consideraste X?" en lugar de "Esto está mal".
- Distingue entre bloqueante (bug, seguridad) y sugerencia (estilo, preferencia).
- Aprueba cuando está bien, no esperes perfección.

---

## 9. DOCUMENTACIÓN

### Qué Documentar
- **README**: qué hace el proyecto, cómo instalarlo, cómo ejecutarlo.
- **API**: endpoints, parámetros, respuestas, errores.
- **Decisiones de arquitectura** (ADRs): por qué se eligió X sobre Y.
- **Onboarding**: cómo configurar el entorno de desarrollo.

### Qué NO Documentar
- Lo que el código ya dice claramente.
- Documentación que no vas a mantener actualizada.

### README mínimo
```markdown
# Nombre del Proyecto
Descripción en 1-2 líneas.

## Requisitos
- Node 18+, Python 3.11+, etc.

## Instalación
npm install

## Uso / Ejecución
npm run dev

## Tests
npm test

## Variables de entorno
Ver .env.example
```

---

## 10. SALUD DEL DESARROLLADOR

### Ergonomía Física
- Monitor a altura de ojos, a ~60cm de distancia.
- Silla con soporte lumbar; espalda recta, pies en el suelo.
- Regla **20-20-20**: cada 20 min, mira algo a 20 pies (6m) por 20 segundos.
- Levántate al menos una vez por hora.
- Muñecas neutras al escribir; considera teclado ergonómico si hay dolor.

### Salud Mental y Foco
- Usa bloques de tiempo (Pomodoro: 25 min trabajo, 5 min descanso).
- Cierra notificaciones durante bloques de trabajo profundo.
- Divide tareas grandes en sub-tareas de 1-2 horas.
- Cuando estés bloqueado más de 30 min, pide ayuda o toma un descanso.
- El síndrome del impostor es universal; todos lo sienten.

### Límites Saludables
- Define tu horario de trabajo y respétalo.
- "Apagón digital": no revises trabajo antes de dormir.
- Las horas extra crónicas reducen la productividad y calidad del código.
- Vacaciones reales sin código = inversión, no pérdida.

### Aprendizaje Continuo
- Dedica tiempo protegido a aprender (30 min/día o 2h/semana).
- Lee código de otros proyectos open source.
- Enseña lo que aprendes: solidifica tu conocimiento.
- No intentes aprender todo; profundiza en áreas estratégicas.

---

## 11. FLUJO DE TRABAJO DIARIO

### Inicio del Día
```
1. Revisa tareas pendientes y prioriza
2. Identifica la tarea más importante (MIP)
3. Revisa PRs o mensajes pendientes
4. Bloquea tiempo para trabajo profundo
5. Empieza con la MIP antes de emails/reuniones
```

### Durante el Trabajo
```
1. Un problema a la vez; evita el multitasking
2. Usa TODO comments para no perder hilo: // TODO: validar edge case X
3. Commitea cuando algo funciona (no al final del día)
4. Si encuentras un bug no relacionado: crea ticket, no lo arregles ahora
5. Documenta mientras programas, no después
```

### Fin del Día
```
1. Commitea trabajo en progreso con mensaje "WIP: ..."
2. Escribe en papel/ticket qué falta y el próximo paso
3. Cierra el IDE y el navegador de trabajo
4. Haz una pequeña retrospectiva: ¿qué salió bien? ¿qué mejorar?
```

---

## 12. CHECKLIST DE CALIDAD

Antes de considerar una tarea terminada:

```
[ ] El código hace lo que se pidió
[ ] No rompe funcionalidad existente (tests pasan)
[ ] No hay credenciales ni datos sensibles hardcodeados
[ ] El código es legible sin necesitar explicación verbal
[ ] Se maneja el caso de error / input inválido
[ ] Se añadieron tests para la lógica nueva o modificada
[ ] El PR tiene descripción clara
[ ] Se actualizó documentación si era necesario
[ ] No hay console.log / print de debug olvidados
[ ] Se revisó el diff propio antes de pedir review
```

---

## REFERENCIAS RÁPIDAS

| Concepto | Recurso |
|---|---|
| Clean Code | Libro de Robert C. Martin |
| Git flow | `git-flow` branching model |
| Conventional Commits | conventionalcommits.org |
| OWASP Top 10 | owasp.org |
| Regla del Boy Scout | "Deja el código más limpio de como lo encontraste" |

---

*Última actualización: 2026 · Este documento es un punto de partida, no un dogma. Adapta lo que tenga sentido para tu contexto.*
