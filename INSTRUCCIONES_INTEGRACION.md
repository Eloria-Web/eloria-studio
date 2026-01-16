# 📋 INSTRUCCIONES PARA INTEGRAR CON EL SITIO REAL

## 🎯 OBJETIVO

Integrar el sistema de autenticación y pagos que he creado con tu sitio existente en **https://studio.eloria.paris/**

## ✅ LO QUE YA ESTÁ LISTO

He creado un sistema completo que:

1. ✅ **Usa Supabase** (no Firebase) con tus credenciales reales
2. ✅ **Precios correctos** según tu sitio ($20, $65, $180)
3. ✅ **Rutas compatibles** con tu estructura actual
4. ✅ **Estilos consistentes** con tu diseño

## 📦 ARCHIVOS A SUBIR A NETLIFY

### Opción A: Subir Todo el Proyecto

1. Ve a [Netlify Drop](https://app.netlify.com/drop)
2. Arrastra la carpeta `c:\Users\Empresa\eloria-studio`
3. Netlify detectará automáticamente los archivos

### Opción B: Subir Solo Archivos Nuevos

Sube estos archivos a tu proyecto Netlify existente:

**Páginas HTML:**
- `signup.html`
- `login.html`
- `reset-password.html`
- `checkout.html`
- `dashboard.html`

**JavaScript:**
- `js/firebase-init.js` (contiene config de Supabase)
- `js/auth-guard.js`
- `js/signup.js`
- `js/login.js`
- `js/reset-password.js`
- `js/checkout.js`
- `js/dashboard.js`
- `js/payments.js`

**CSS:**
- `css/auth.css`
- `css/checkout.css`
- `css/dashboard.css`
- `css/pricing.css`

**Netlify Functions:**
- `netlify/functions/stripe-webhook.js`

**Configuración:**
- `netlify.toml`

## 🔧 MODIFICACIONES EN TU SITIO EXISTENTE

### 1. Verificar Botones en index.html

Asegúrate de que los botones apunten a:

```html
<!-- Botón "Create free account" -->
<a href="/signup.html" class="btn btn--primary">Create free account</a>

<!-- Botón "Log in" -->
<a href="/login.html" class="btn btn--ghost">Log in</a>

<!-- Botones "Start free" en pricing -->
<a href="/signup.html?plan=free">Start free</a> <!-- Plan Free -->
<a href="/checkout.html?plan=creator">Start free</a> <!-- Plan Creator -->
<a href="/checkout.html?plan=business">Start free</a> <!-- Plan Business -->
<a href="/checkout.html?plan=agency">Start free</a> <!-- Plan Agency -->
```

### 2. Agregar SDK de Supabase

En todas las páginas que usen autenticación, agrega antes de `</body>`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/firebase-init.js"></script>
```

## ⚙️ CONFIGURACIÓN EN NETLIFY

### 1. Variables de Entorno

Ve a **Netlify Dashboard** → Tu sitio → **Site settings** → **Environment variables**

Agrega:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_... (para frontend)
STRIPE_PRICE_CREATOR=price_xxx
STRIPE_PRICE_BUSINESS=price_xxx
STRIPE_PRICE_AGENCY=price_xxx
```

### 2. Configurar Webhook de Stripe

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. **Add endpoint**
3. URL: `https://studio.eloria.paris/.netlify/functions/stripe-webhook`
4. Selecciona eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copia el **Signing secret** y agrégalo a Netlify como `STRIPE_WEBHOOK_SECRET`

## 🗄️ CREAR TABLAS EN SUPABASE

Ejecuta estos SQL en [Supabase SQL Editor](https://supabase.com/dashboard/project/yhvsajcckskoachzstme/sql):

### Tabla de Usuarios:

```sql
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  plan text DEFAULT 'free',
  subscription_status text,
  stripe_customer_id text,
  subscription_id text,
  trial_ends_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

### Tabla de Pagos:

```sql
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL,
  email text,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'EUR',
  status text NOT NULL,
  payment_method text NOT NULL,
  transaction_id text NOT NULL UNIQUE,
  plan_type text,
  created_at timestamp DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (auth.uid()::text = user_id);
```

## 🧪 PROBAR DESPUÉS DE INTEGRAR

1. **Registro:**
   - Ve a https://studio.eloria.paris/signup.html
   - Crea una cuenta
   - Verifica que recibas el email de confirmación

2. **Login:**
   - Ve a https://studio.eloria.paris/login.html
   - Inicia sesión
   - Debe redirigir a `/dashboard.html`

3. **Dashboard:**
   - Debe mostrar tu información
   - Debe mostrar tu plan actual

4. **Checkout:**
   - Ve a https://studio.eloria.paris/checkout.html?plan=creator
   - Debe mostrar el plan correcto
   - Debe funcionar el botón de Stripe (después de configurar)

## ⚠️ NOTAS IMPORTANTES

1. **Supabase ya está configurado** con tus credenciales reales
2. **Los precios coinciden** con tu sitio ($20, $65, $180)
3. **Las rutas son compatibles** con tu estructura actual
4. **Solo falta agregar** credenciales de PayPal/Stripe y crear tablas

## 🆘 SI ALGO NO FUNCIONA

1. Revisa la consola del navegador (F12)
2. Verifica que Supabase esté inicializado
3. Revisa los logs de Netlify Functions
4. Verifica que las tablas existan en Supabase

---

**¡Todo está listo para integrarse!** 🚀
