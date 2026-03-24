# Brilla Eso

Aplicación web para gestión de cotizaciones y pedidos de cuadros neón, con panel de cliente y panel de administración.  
Stack principal: React + TypeScript + Vite + Supabase.

## Requisitos

- Node.js 18+
- npm 9+
- Proyecto de Supabase
- Cuenta de Mercado Pago para pagos
- Cuenta de Resend para notificaciones por email

## Instalación

```bash
npm install
```

## Configuración local

1. Crear `.env` basado en `.env.example`.
2. Configurar variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ALLOWED_HOSTS`

## Uso

```bash
npm run dev
```

Build de producción:

```bash
npm run build
```

Previsualizar build:

```bash
npm run preview
```

## Testing y chequeos

```bash
npm run test
npm run test:run
npm run check
npm run lint
```

## Deploy en Cloudflare Pages

- Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en **Settings → Environment variables**.
- `VITE_SUPABASE_URL` debe incluir protocolo y dominio completo.
- Después de editar variables, lanzar un nuevo deploy para regenerar el bundle.

## Supabase Edge Functions

### Secrets requeridos

En Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets**:

- `MP_ACCESS_TOKEN`
- `RESEND_API_KEY`
- `MAIL_SENDER` (ej: `Brilla Eso <noreply@notificaciones.brillaeso.com.ar>`)
- `APP_BASE_URL` (ej: `https://brillaeso.com.ar`)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Deploy de funciones

```bash
npx -y supabase link --project-ref ypdyadhdyftmudtguhuj
npx -y supabase functions deploy mp-create-preference
npx -y supabase functions deploy quote-reject
npx -y supabase functions deploy mp-webhook
npx -y supabase functions deploy send-notification-email
```

## Migraciones SQL

Aplicar migraciones pendientes en tu proyecto remoto para habilitar RPCs nuevas:

```bash
npx -y supabase db push
```

Si no usás CLI para migraciones, ejecutar manualmente en SQL Editor los archivos de `supabase/migrations/`.
