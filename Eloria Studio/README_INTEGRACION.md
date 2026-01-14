# 🚀 GUÍA RÁPIDA DE INTEGRACIÓN

## ✅ RESPALDO COMPLETADO

**Ubicación:** `c:\Users\Empresa\Eloria Studio\`

**Estado:** ✅ Todo guardado correctamente (28 archivos)

## 📋 INTEGRACIÓN RÁPIDA (3 PASOS)

### 1️⃣ SUBIR ARCHIVOS A NETLIFY

**Opción más rápida:**
1. Ve a https://app.netlify.com/drop
2. Arrastra la carpeta `Eloria Studio`
3. ¡Listo!

### 2️⃣ CONFIGURAR SUPABASE

Ejecuta este SQL en https://supabase.com/dashboard/project/yhvsajcckskoachzstme/sql:

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

CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

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

CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid()::text = user_id);
```

### 3️⃣ CONFIGURAR NETLIFY

En **Netlify Dashboard** → **Environment Variables**, agrega:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_CREATOR=price_xxx
STRIPE_PRICE_BUSINESS=price_xxx
STRIPE_PRICE_AGENCY=price_xxx
```

## 🔗 ENLACES IMPORTANTES

- **Sitio Real:** https://studio.eloria.paris/
- **Supabase:** https://supabase.com/dashboard/project/yhvsajcckskoachzstme
- **Netlify:** https://app.netlify.com

## 📝 DOCUMENTACIÓN COMPLETA

- `INTEGRACION_SITIO_REAL.md` - Guía completa paso a paso
- `ESTADO_PROYECTO.md` - Estado actual del proyecto
- `BACKUP_INFO.md` - Información del respaldo

---

**¡Todo está listo para integrar!** ✅
