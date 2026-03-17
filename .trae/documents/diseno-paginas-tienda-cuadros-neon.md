# Diseño de páginas — Tienda de cuadros neón (desktop-first)

## Estilos globales
- Layout base: contenedor centrado (max-width 1200px), grid de 12 columnas, espaciado 8/16/24/32.
- Tipografía: Inter / system-ui. Escala: 14 (base), 16, 20, 24, 32, 40.
- Colores (tokens):
  - Background: #0B0B12
  - Surface: #121225
  - Text primary: #F5F7FF
  - Text secondary: #B7B9D3
  - Accent neon: #7CFFB2 (verde) y #8A5CFF (morado)
  - Danger: #FF4D6D
- Botones: primario (accent + glow suave), secundario (outline), disabled (opacidad 40%). Hover con transición 150ms.
- Links: subrayado en hover, color accent.
- Componentes reutilizables: Navbar, Footer, GalleryCard, ImageCarousel, StatusBadge, UploadBox, FormSection, NotificationBell, DataTable.

## Página: Inicio / Galería
**Meta**
- Title: “Cuadros Neón Personalizados | Brilla Eso”
- Description: “Cuadros neón 100% personalizados. Mirá trabajos reales y pedí tu cotización subiendo una referencia.”
- OG: título + imagen destacada de un trabajo real.

**Layout & estructura**
- Header fijo (sticky) + contenido en secciones apiladas.
- Sección Hero (2 columnas): izquierda texto/CTA, derecha imagen mockup.
- Grid tipo galería (masonry o cards) con trabajos reales (3–4 columnas desktop, 2 tablet, 1 mobile).

**Secciones & componentes**
1) Navbar: logo, links (Personalizar, Mis pedidos), login/avatar, campana de notificaciones (si logueado).
2) Hero: titular, bullets (tiempos/garantía si existe), CTA “Personalizar y cotizar”.
3) Galería (tipo productos): grid de cards. Cada card muestra:
   - imagen de portada
   - título opcional
   - tags opcionales
   - al click: abre el detalle del trabajo (/trabajos/:id)
4) Proceso: 3 pasos (Subí referencia -> Recibí presupuesto -> Producción y entrega), con microcopy de notificaciones.
5) Footer: contacto, legales básicos.

## Página: Trabajo (detalle)
**Meta**
- Title: “Trabajo | Brilla Eso”
- Description: “Galería de imágenes del trabajo y CTA para cotizar uno similar.”

**Layout & estructura**
- Contenido centrado, 2 columnas en desktop: carrusel a la izquierda, info/CTA a la derecha.

**Secciones & componentes**
1) ImageCarousel: imágenes (portada + adicionales), navegación por thumbnails, zoom.
2) Info: título/tags, descripción opcional.
3) CTA: botón “Quiero uno así / Cotizar” que precarga el formulario (opcional) o navega a /personalizar.

## Página: Personalizar y Cotizar
**Meta**
- Title: “Personaliza tu cuadro neón | Cotización”
- Description: “Sube una imagen y define medidas/estilo para cotizar.”

**Layout & estructura**
- Two-panel: izquierda subida + preview, derecha formulario.
- Formulario en secciones con estados (validación inline).

**Secciones & componentes**
1) UploadBox: drag&drop, botón “Subir”, helper de formatos/tamaño, preview con opción “reemplazar”.
2) FormSection “Especificaciones”: medidas aproximadas, colores/estilo, texto opcional, notas.
3) FormSection “Contacto”: email, teléfono.
4) CTA: botón primario “Enviar solicitud” + estado loading + mensaje de éxito con número de solicitud.

## Página: Mis pedidos y Notificaciones
**Meta**
- Title: “Mis pedidos y notificaciones”
- Description: “Sigue el estado de tus solicitudes y pedidos.”

**Layout & estructura**
- Tabs en desktop: “Solicitudes/Pedidos” y “Notificaciones”.
- DataTable + panel lateral de detalle (opcional) o navegación a detalle.

**Secciones & componentes**
1) Lista: filas con ID corto, fecha, estado (StatusBadge), acción “Ver detalle”.
2) Notificaciones: lista por fecha, estado leído/no leído, acción “Marcar como leída”, deep-link al detalle.

## Página: Acceso (Login/Registro)
**Meta**
- Title: “Acceso” / “Crear cuenta”
- Description: “Inicia sesión para gestionar tus solicitudes y notificaciones.”

**Layout & estructura**
- Card centrada (max 420px) sobre fondo con gradiente sutil.

**Secciones & componentes**
1) Form: email, contraseña, CTA primario.
2) Aux: “Olvidé mi contraseña”, switch login/registro.

## Página: Admin (Cotizaciones/Pedidos)
**Meta**
- Title: “Admin | Cotizaciones y pedidos”
- Description: “Panel interno para gestionar estados y notificaciones.”

**Layout & estructura**
- Dashboard: sidebar izquierda + contenido principal.
- Tablas con acciones por fila + drawer/modal para edición.

**Secciones & componentes**
1) Sidebar: Cotizaciones, Pedidos, (Salir).
2) DataTable Cotizaciones: búsqueda por email/ID, estados, abrir detalle.
3) Detalle cotización: preview de imagen, specs, input de precio, nota, selector de estado, botón “Notificar”.
4) DataTable Pedidos: estado, total, acciones “Cambiar estado” y “Notificar”.

## Página: Admin (Galería)
**Meta**
- Title: “Admin | Galería”
- Description: “Gestión de trabajos y sus imágenes.”

**Layout & estructura**
- Misma sidebar. Pantalla principal con tabla/grid y editor en drawer/modal.

**Secciones & componentes**
1) Lista de trabajos: portada, título, publicado (toggle), destacado (toggle), fecha.
2) Acciones: crear, editar, eliminar (confirmación).
3) Editor de trabajo:
   - campos: título, descripción, tags, publicado, destacado
   - imágenes: subir múltiples, elegir portada, ordenar (drag & drop), eliminar

## Responsive (resumen)
- <= 1024px: catálogo a 2 columnas, personalizar pasa a layout apilado.
- <= 640px: navbar colapsa, tablas pasan a cards/stacked rows, botones full-width.
