# Eloria Studio - Setup Guide

Sistema completo de autenticación y pagos para Eloria Studio, integrado con Firebase y Stripe.

## 📋 Prerrequisitos

- Node.js 18+ instalado
- Netlify CLI: `npm install -g netlify-cli`
- Cuentas creadas:
  - Firebase (https://firebase.google.com)
  - Stripe (https://stripe.com)

## 🚀 Instalación

### 0. Elegir flujo de trabajo (obligatorio)

Antes de continuar, responde:

**¿Quieres trabajar directamente en `main` o prefieres usar una rama temporal?**

- Si eliges `main`, seguimos con el flujo simple.
- Si eliges rama temporal, creamos `feature/tu-rama` y trabajamos ahí.

### 1. Clonar o navegar al proyecto

```bash
cd c:\Users\Empresa\eloria-studio
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **Project Settings** → **General** → **Your apps**
4. Agrega una web app
5. Copia la configuración y actualiza `js/firebase-init.js`:

```javascript
const firebaseConfig = {
  apiKey: "tu-api-key",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "tu-sender-id",
  appId: "tu-app-id"
};
```

6. Habilita **Authentication** → **Email/Password**
7. Crea la colección `users` en **Firestore Database**

### 4. Configurar Stripe

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com)
2. Copia tu **Publishable Key** y **Secret Key** (modo test)
3. Crea productos y precios:
   - Creator Plan: $29/month
   - Business Plan: $79/month
   - Agency Plan: $199/month
4. Copia los **Price IDs**

### 5. Configurar Variables de Entorno en Netlify

1. Ve a Netlify Dashboard → Tu sitio → **Site settings** → **Environment variables**
2. Agrega:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PUBLISHABLE_KEY` (para frontend)
   - `STRIPE_PRICE_CREATOR`
   - `STRIPE_PRICE_BUSINESS`
   - `STRIPE_PRICE_AGENCY`

### 6. Probar localmente

```bash
netlify dev
```

Visita `http://localhost:8888`

## 🌐 Configuración Post-Deployment

### 1. Configurar Webhooks de Stripe

1. Ve a **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. URL: `https://studio.eloria.paris/.netlify/functions/stripe-webhook`
4. Selecciona eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copia el **Webhook secret** y agrégalo a Netlify Environment Variables

## 🧪 Testing

### Tarjetas de prueba de Stripe

- **Éxito**: `4242 4242 4242 4242`
- **Declinada**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`
- **Cualquier fecha futura y CVC**

## 📁 Estructura de Archivos

```
eloria-studio/
├── signup.html
├── login.html
├── reset-password.html
├── checkout.html
├── dashboard.html
├── js/
│   ├── firebase-init.js
│   ├── auth-guard.js
│   ├── signup.js
│   ├── login.js
│   ├── reset-password.js
│   ├── checkout.js
│   └── dashboard.js
├── css/
│   ├── auth.css
│   ├── checkout.css
│   └── dashboard.css
├── netlify/
│   └── functions/
│       └── stripe-webhook.js
└── package.json
```

## ✅ Checklist Final

- [ ] Configurar Firebase con credenciales reales
- [ ] Habilitar Email/Password authentication
- [ ] Crear colección `users` en Firestore
- [ ] Configurar Stripe con Price IDs
- [ ] Agregar variables de entorno en Netlify
- [ ] Configurar webhooks en Stripe
- [ ] Probar flujo completo de registro → checkout → dashboard

---

**¡Listo para lanzar!** 🚀
