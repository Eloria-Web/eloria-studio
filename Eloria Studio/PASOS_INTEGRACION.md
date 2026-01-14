# 🎯 PASOS PARA INTEGRAR CON https://studio.eloria.paris/

## ✅ RESPALDO COMPLETADO

**Ubicación:** `c:\Users\Empresa\Eloria Studio\`  
**Total:** 33 archivos guardados  
**Estado:** ✅ Listo para integrar

---

## 📋 INTEGRACIÓN PASO A PASO

### PASO 1: Subir Archivos a Netlify (5 minutos)

#### Opción A: Netlify Drop (Más Rápido)
1. Ve a https://app.netlify.com/drop
2. Arrastra la carpeta `c:\Users\Empresa\Eloria Studio`
3. Espera a que Netlify procese
4. Copia la URL del deploy

#### Opción B: Netlify CLI
```powershell
cd "c:\Users\Empresa\Eloria Studio"
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

#### Opción C: Git (Si tienes repositorio)
```powershell
cd "c:\Users\Empresa\Eloria Studio"
git init
git add .
git commit -m "Add authentication and payment system"
# Conecta con tu repositorio y haz push
```

### PASO 2: Verificar que los Archivos Estén en Netlify

Después de subir, verifica en Netlify que existan:

**Páginas:**
- `/signup.html`
- `/login.html`
- `/reset-password.html`
- `/checkout.html`
- `/dashboard.html`

**JavaScript:**
- `/js/firebase-init.js`
- `/js/auth-guard.js`
- `/js/signup.js`
- `/js/login.js`
- `/js/reset-password.js`
- `/js/checkout.js`
- `/js/dashboard.js`
- `/js/payments.js`

**CSS:**
- `/css/auth.css`
- `/css/checkout.css`
- `/css/dashboard.css`
- `/css/pricing.css`

### PASO 3: Modificar index.html del Sitio Real

En tu `index.html` actual en Netlify, asegúrate de que:

1. **Botón "Create free account"** apunte a:
```html
<a href="/signup.html" class="btn btn--primary">Create free account</a>
```

2. **Botón "Log in"** apunte a:
```html
<a href="/login.html" class="btn btn--ghost">Log in</a>
```

3. **Botones "Start free" en pricing** apunten a:
```html
<!-- Plan Free -->
<a href="/signup.html?plan=free">Start free</a>

<!-- Plan Creator -->
<a href="/checkout.html?plan=creator">Start free</a>

<!-- Plan Business -->
<a href="/checkout.html?plan=business">Start free</a>

<!-- Plan Agency -->
<a href="/checkout.html?plan=agency">Start free</a>
```

4. **Agregar SDK de Supabase** antes de `</body>`:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/firebase-init.js"></script>
```

### PASO 4: Crear Tablas en Supabase (5 minutos)

1. Ve a https://supabase.com/dashboard/project/yhvsajcckskoachzstme/sql
2. Ejecuta este SQL completo:

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

3. Verifica que las tablas se crearon:
   - Ve a **Table Editor** en Supabase
   - Debes ver `users` y `payments`

### PASO 5: Configurar Variables de Entorno en Netlify (10 minutos)

1. Ve a **Netlify Dashboard** → Tu sitio → **Site settings** → **Environment variables**
2. Agrega estas variables (una por una):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_CREATOR=price_xxx
STRIPE_PRICE_BUSINESS=price_xxx
STRIPE_PRICE_AGENCY=price_xxx
```

**Nota:** Obtendrás estas credenciales cuando crees las cuentas de Stripe.

### PASO 6: Configurar Webhook de Stripe (5 minutos)

1. Ve a https://dashboard.stripe.com/test/webhooks
2. Click **Add endpoint**
3. URL: `https://studio.eloria.paris/.netlify/functions/stripe-webhook`
4. Selecciona estos eventos:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
5. Click **Add endpoint**
6. Copia el **Signing secret** (empieza con `whsec_`)
7. Agrégalo a Netlify Environment Variables como `STRIPE_WEBHOOK_SECRET`

### PASO 7: Probar la Integración (10 minutos)

1. **Registro:**
   - Ve a https://studio.eloria.paris/signup.html
   - Crea una cuenta de prueba
   - Verifica que recibas el email de confirmación

2. **Login:**
   - Ve a https://studio.eloria.paris/login.html
   - Inicia sesión con la cuenta creada
   - Debe redirigir a `/dashboard.html`

3. **Dashboard:**
   - Debe mostrar tu información
   - Debe mostrar tu plan (Free por defecto)

4. **Checkout:**
   - Ve a https://studio.eloria.paris/checkout.html?plan=creator
   - Debe mostrar el plan Creator ($20)
   - El botón funcionará después de configurar Stripe

## ✅ CHECKLIST DE INTEGRACIÓN

- [ ] Archivos subidos a Netlify
- [ ] Botones en index.html verificados
- [ ] SDK de Supabase agregado
- [ ] Tablas creadas en Supabase
- [ ] Variables de entorno configuradas
- [ ] Webhook de Stripe configurado
- [ ] Probar registro
- [ ] Probar login
- [ ] Probar dashboard
- [ ] Probar checkout

## 🆘 TROUBLESHOOTING

### Error: "Supabase not initialized"
- Verifica que el SDK esté cargado: `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`
- Verifica que `js/firebase-init.js` esté accesible

### Error: "Table does not exist"
- Ejecuta el SQL en Supabase SQL Editor
- Verifica en Table Editor que las tablas existan

### Error: "Webhook failed"
- Verifica que la URL del webhook sea correcta
- Verifica que el secret coincida en Netlify
- Revisa los logs en Netlify Functions

### Error: "Payment failed"
- Verifica que las credenciales de Stripe estén correctas
- Verifica que los Price IDs existan en Stripe

## 📝 NOTAS FINALES

- **El respaldo está seguro** en `c:\Users\Empresa\Eloria Studio\`
- **Todo el código está listo** - Solo falta configurar credenciales
- **Los precios coinciden** con tu sitio real ($20, $65, $180)
- **Las rutas son compatibles** con tu estructura actual

---

**¡Listo para integrar!** 🚀

**Siguiente paso:** Subir archivos a Netlify
