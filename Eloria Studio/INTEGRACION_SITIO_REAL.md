# 🔗 INTEGRACIÓN CON SITIO REAL - https://studio.eloria.paris/

## ✅ RESPALDO COMPLETADO

**Ubicación del Respaldo:** `c:\Users\Empresa\Eloria Studio\`

**Total de Archivos:** 28 archivos guardados

## 📋 PASOS PARA INTEGRAR CON EL SITIO REAL

### PASO 1: Acceder a Netlify (2 minutos)

1. Ve a https://app.netlify.com
2. Inicia sesión en tu cuenta
3. Selecciona el sitio: **studio.eloria.paris** (o cosmic-starlight-ee0110)

### PASO 2: Subir Archivos Nuevos (5 minutos)

**Opción A: Netlify Drop (Más Rápido)**
1. Ve a https://app.netlify.com/drop
2. Arrastra la carpeta `c:\Users\Empresa\Eloria Studio`
3. Netlify detectará y desplegará automáticamente

**Opción B: Git Repository (Recomendado)**
1. Si tu sitio está conectado a Git:
   ```bash
   cd "c:\Users\Empresa\Eloria Studio"
   git init
   git add .
   git commit -m "Add authentication and payment system"
   git remote add origin [tu-repositorio]
   git push -u origin main
   ```

**Opción C: Netlify CLI**
```bash
cd "c:\Users\Empresa\Eloria Studio"
netlify deploy --prod
```

### PASO 3: Verificar Archivos Subidos

Asegúrate de que estos archivos estén en tu sitio:

**Páginas HTML:**
- ✅ `/signup.html`
- ✅ `/login.html`
- ✅ `/reset-password.html`
- ✅ `/checkout.html`
- ✅ `/dashboard.html`
- ✅ `/pricing.html` (o actualizar la existente)

**JavaScript:**
- ✅ `/js/firebase-init.js`
- ✅ `/js/auth-guard.js`
- ✅ `/js/signup.js`
- ✅ `/js/login.js`
- ✅ `/js/reset-password.js`
- ✅ `/js/checkout.js`
- ✅ `/js/dashboard.js`
- ✅ `/js/payments.js`

**CSS:**
- ✅ `/css/auth.css`
- ✅ `/css/checkout.css`
- ✅ `/css/dashboard.css`
- ✅ `/css/pricing.css`

**Netlify Functions:**
- ✅ `/netlify/functions/stripe-webhook.js`

**Configuración:**
- ✅ `/netlify.toml`

### PASO 4: Modificar index.html del Sitio Real

En tu `index.html` actual, verifica que los botones apunten a:

```html
<!-- Botón "Create free account" en header -->
<a href="/signup.html" class="btn btn--primary">Create free account</a>

<!-- Botón "Log in" en header -->
<a href="/login.html" class="btn btn--ghost">Log in</a>

<!-- Botones "Start free" en sección de pricing -->
<a href="/signup.html?plan=free">Start free</a> <!-- Plan Free -->
<a href="/checkout.html?plan=creator">Start free</a> <!-- Plan Creator -->
<a href="/checkout.html?plan=business">Start free</a> <!-- Plan Business -->
<a href="/checkout.html?plan=agency">Start free</a> <!-- Plan Agency -->
```

### PASO 5: Agregar SDK de Supabase

En tu `index.html` actual, agrega antes de `</body>`:

```html
<!-- Supabase SDK -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/firebase-init.js"></script>
```

### PASO 6: Configurar Variables de Entorno en Netlify

1. Ve a **Netlify Dashboard** → Tu sitio → **Site settings** → **Environment variables**
2. Agrega estas variables:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_CREATOR=price_xxx
STRIPE_PRICE_BUSINESS=price_xxx
STRIPE_PRICE_AGENCY=price_xxx
```

### PASO 7: Crear Tablas en Supabase

1. Ve a https://supabase.com/dashboard/project/yhvsajcckskoachzstme/sql
2. Ejecuta este SQL:

```sql
-- Tabla de usuarios
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

-- Tabla de pagos
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

### PASO 8: Configurar Webhook de Stripe

1. Ve a https://dashboard.stripe.com/test/webhooks
2. Click **Add endpoint**
3. URL: `https://studio.eloria.paris/.netlify/functions/stripe-webhook`
4. Selecciona eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copia el **Signing secret** (whsec_...)
6. Agrégalo a Netlify Environment Variables como `STRIPE_WEBHOOK_SECRET`

### PASO 9: Probar la Integración

1. **Registro:**
   - Ve a https://studio.eloria.paris/signup.html
   - Crea una cuenta de prueba
   - Verifica que recibas el email de confirmación

2. **Login:**
   - Ve a https://studio.eloria.paris/login.html
   - Inicia sesión
   - Debe redirigir a `/dashboard.html`

3. **Dashboard:**
   - Debe mostrar tu información
   - Debe mostrar tu plan (Free por defecto)

4. **Checkout:**
   - Ve a https://studio.eloria.paris/checkout.html?plan=creator
   - Debe mostrar el plan Creator ($20)
   - El botón de Stripe funcionará después de configurar credenciales

## ✅ CHECKLIST DE INTEGRACIÓN

- [ ] Archivos subidos a Netlify
- [ ] Botones en index.html apuntan correctamente
- [ ] SDK de Supabase agregado
- [ ] Variables de entorno configuradas
- [ ] Tablas creadas en Supabase
- [ ] Webhook de Stripe configurado
- [ ] Probar registro
- [ ] Probar login
- [ ] Probar dashboard
- [ ] Probar checkout

## 🆘 SI ALGO NO FUNCIONA

1. **Revisa la consola del navegador (F12)**
   - Busca errores de JavaScript
   - Verifica que Supabase se inicialice

2. **Revisa los logs de Netlify**
   - Ve a **Netlify Dashboard** → **Functions** → **Logs**
   - Busca errores en el webhook

3. **Verifica Supabase**
   - Ve a **Supabase Dashboard** → **Authentication** → **Users**
   - Verifica que los usuarios se creen correctamente

4. **Verifica las tablas**
   - Ve a **Supabase Dashboard** → **Table Editor**
   - Verifica que las tablas `users` y `payments` existan

## 📝 NOTAS FINALES

- **El respaldo está seguro** en `c:\Users\Empresa\Eloria Studio\`
- **Todo el código está listo** - Solo falta configurar credenciales
- **Los precios coinciden** con tu sitio real
- **Las rutas son compatibles** con tu estructura actual

---

**¡Listo para integrar!** 🚀
