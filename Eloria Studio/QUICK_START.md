# 🚀 QUICK START - Eloria Studio

## ✅ RESUMEN DE LO IMPLEMENTADO

### ✅ COMPLETADO:

1. **Sistema de Autenticación (Firebase)**
   - ✅ `signup.html` - Registro con validación
   - ✅ `login.html` - Login funcional
   - ✅ `reset-password.html` - Recuperación de contraseña
   - ✅ `js/firebase-init.js` - Inicialización Firebase
   - ✅ `js/auth-guard.js` - Protección de rutas
   - ✅ `js/signup.js` - Lógica de registro
   - ✅ `js/login.js` - Lógica de login
   - ✅ `js/reset-password.js` - Reset password

2. **Sistema de Pagos (Stripe)**
   - ✅ `checkout.html` - Página de checkout
   - ✅ `js/checkout.js` - Integración Stripe Checkout
   - ✅ `netlify/functions/stripe-webhook.js` - Webhooks

3. **Dashboard de Usuario**
   - ✅ `dashboard.html` - Dashboard completo
   - ✅ `js/dashboard.js` - Funcionalidad del dashboard
   - ✅ `css/dashboard.css` - Estilos del dashboard

4. **Estilos CSS**
   - ✅ `css/auth.css` - Estilos de autenticación
   - ✅ `css/checkout.css` - Estilos de checkout
   - ✅ `css/dashboard.css` - Estilos del dashboard

### ⚠️ PENDIENTE DE CONFIGURAR:

1. **Firebase Configuration**
   - Actualizar `js/firebase-init.js` con tus credenciales reales
   - Habilitar Email/Password authentication en Firebase Console
   - Crear colección `users` en Firestore

2. **Stripe Configuration**
   - Agregar `STRIPE_PUBLISHABLE_KEY` en `js/checkout.js`
   - Crear productos en Stripe Dashboard
   - Configurar webhooks en Stripe

3. **Netlify Environment Variables**
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_CREATOR`
   - `STRIPE_PRICE_BUSINESS`
   - `STRIPE_PRICE_AGENCY`

## 🧪 CÓMO PROBAR LA PÁGINA

### Opción 1: Servidor Local Simple (Rápido)

1. Abre PowerShell en `c:\Users\Empresa\eloria-studio`
2. Ejecuta:
```powershell
python -m http.server 8000
```
O si tienes Node.js:
```powershell
npx http-server -p 8000
```

3. Abre tu navegador en: **http://localhost:8000**

### Opción 2: Netlify Dev (Recomendado)

1. Instala Netlify CLI:
```powershell
npm install -g netlify-cli
```

2. En el directorio del proyecto:
```powershell
netlify dev
```

3. Abre: **http://localhost:8888**

### Opción 3: Deploy a Netlify (Producción)

1. Conecta tu repositorio a Netlify
2. O arrastra la carpeta a [Netlify Drop](https://app.netlify.com/drop)

## 📝 PASOS PARA CONFIGURAR

### Paso 1: Configurar Firebase (5 minutos)

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea proyecto nuevo o selecciona existente
3. Ve a **Project Settings** → **General**
4. Baja hasta **Your apps** → Click **Web** (</>)
5. Registra la app y copia la configuración
6. Pega en `js/firebase-init.js` reemplazando `YOUR_API_KEY`, etc.
7. Ve a **Authentication** → **Sign-in method** → Habilita **Email/Password**
8. Ve a **Firestore Database** → **Create database** → Modo test
9. Crea colección `users` (se creará automáticamente cuando alguien se registre)

### Paso 2: Configurar Stripe (10 minutos)

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/test/dashboard)
2. Copia tu **Publishable key** (pk_test_...)
3. Actualiza `js/checkout.js` línea 3:
```javascript
const stripePublishableKey = 'pk_test_tu_key_aqui';
```

4. Crea productos:
   - **Products** → **Add product**
   - Creator: $29/month, recurring, trial 14 days
   - Business: $79/month, recurring, trial 14 days
   - Agency: $199/month, recurring, trial 14 days
5. Copia los **Price IDs** (price_xxx)

### Paso 3: Configurar Netlify (5 minutos)

1. Ve a [Netlify Dashboard](https://app.netlify.com)
2. Tu sitio → **Site settings** → **Environment variables**
3. Agrega:
   - `STRIPE_SECRET_KEY` = sk_test_...
   - `STRIPE_WEBHOOK_SECRET` = whsec_... (después de configurar webhook)
   - `STRIPE_PRICE_CREATOR` = price_xxx
   - `STRIPE_PRICE_BUSINESS` = price_xxx
   - `STRIPE_PRICE_AGENCY` = price_xxx

### Paso 4: Configurar Webhook de Stripe (5 minutos)

1. En Stripe Dashboard → **Developers** → **Webhooks**
2. **Add endpoint**
3. URL: `https://studio.eloria.paris/.netlify/functions/stripe-webhook`
4. Selecciona eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copia el **Signing secret** (whsec_...)
6. Agrégalo a Netlify Environment Variables como `STRIPE_WEBHOOK_SECRET`

## 🎯 FLUJO DE PRUEBA

1. **Registro:**
   - Ve a `/signup.html`
   - Completa el formulario
   - Deberías ser redirigido a `/dashboard.html`

2. **Login:**
   - Ve a `/login.html`
   - Ingresa tus credenciales
   - Deberías ver el dashboard

3. **Checkout:**
   - Ve a `/checkout.html?plan=creator`
   - Debe mostrar el plan seleccionado
   - Click en "Start Free Trial"
   - Serás redirigido a Stripe Checkout

4. **Dashboard:**
   - Después del pago, serás redirigido a `/dashboard.html?payment=success`
   - Deberías ver tu plan actualizado

## 🔗 ENLACES DIRECTOS PARA PROBAR

Si ya tienes el servidor corriendo:

- **Registro:** http://localhost:8000/signup.html
- **Login:** http://localhost:8000/login.html
- **Dashboard:** http://localhost:8000/dashboard.html
- **Checkout:** http://localhost:8000/checkout.html?plan=creator
- **Reset Password:** http://localhost:8000/reset-password.html

## ⚠️ NOTAS IMPORTANTES

1. **Firebase debe estar configurado** antes de probar registro/login
2. **Stripe debe estar configurado** antes de probar checkout
3. Los webhooks solo funcionan en producción (Netlify)
4. Para desarrollo local, usa Stripe CLI: `stripe listen --forward-to localhost:8888/.netlify/functions/stripe-webhook`

## 🆘 SI ALGO NO FUNCIONA

1. Abre la consola del navegador (F12)
2. Revisa errores en la consola
3. Verifica que Firebase esté inicializado correctamente
4. Verifica que las variables de entorno estén configuradas
5. Revisa los logs de Netlify Functions en el dashboard

---

**¡Listo para probar!** 🚀
