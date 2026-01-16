# ✅ ALCANCE CORREGIDO - Eloria Studio MVP

## 📋 REDES SOCIALES - ACTUALIZACIÓN

### REDES ACTIVAS (MVP - Fase 1): **6 REDES**

1. **Instagram** (Feed + Stories)
2. **Facebook Pages** (Feed + Stories)
3. **TikTok** (Feed + Stories)
4. **YouTube** (Shorts + Long-form videos)
5. **X (Twitter)**
6. **LinkedIn Pages**

### REDES DIFERIDAS (NO IMPLEMENTAR): **2 REDES**

- **Pinterest** - Fase 2 (6-12 meses)
- **Google Business Profile** - Fase 2 (6-12 meses)

---

## 🚫 REGLAS PARA REDES DIFERIDAS

### NO HACER:
- ❌ NO construir OAuth flow
- ❌ NO crear workflows de n8n
- ❌ NO exponer en UI como opción funcional
- ❌ NO crear validaciones
- ❌ NO crear previews
- ❌ NO crear analytics

### SÍ PERMITIDO:
- ✅ Mostrar "Coming Soon" en UI (opcional)
- ✅ Documentar en arquitectura como futuras
- ✅ Diseñar arquitectura extensible para agregar después

---

## ⏱️ TIEMPOS RECALCULADOS

### Antes (8 redes):
- MVP Mínimo: 8-10 semanas
- MVP Completo: 12-15 semanas
- Producto Completo: 20-26 semanas

### Ahora (6 redes):
- **MVP Mínimo: 6-8 semanas** ⬇️ (-2 semanas)
- **MVP Completo: 10-12 semanas** ⬇️ (-2-3 semanas)
- **Producto Completo: 18-22 semanas** ⬇️ (-2-4 semanas)

**Ahorro estimado:** 2-4 semanas totales

---

## 📊 DESGLOSE POR RED

### Redes Prioritarias (Primero - 3 redes):
1. Instagram (Feed + Stories) - 3-5 días
2. Facebook Pages (Feed + Stories) - 3-5 días
3. TikTok (Feed + Stories) - 3-5 días

**Total:** ~2 semanas

### Redes Adicionales MVP (Después - 3 redes):
4. YouTube (Shorts + Long-form) - 3-5 días
5. X (Twitter) - 2-3 días
6. LinkedIn Pages - 2-3 días

**Total:** ~1.5 semanas

### Redes Diferidas (NO implementar):
- Pinterest - 0 días (diferida)
- Google Business Profile - 0 días (diferida)

---

## 🏗️ ARQUITECTURA EXTENSIBLE

### Diseño Requerido:

```typescript
// Ejemplo: Network enum debe ser extensible
enum Network {
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  // Pinterest y Google Business NO agregar ahora
  // pero el enum debe permitir agregarlos después
}

// Validación debe ser por red activa
const ACTIVE_NETWORKS = [
  Network.INSTAGRAM,
  Network.FACEBOOK,
  Network.TIKTOK,
  Network.YOUTUBE,
  Network.TWITTER,
  Network.LINKEDIN
];

function canPublishTo(network: Network): boolean {
  return ACTIVE_NETWORKS.includes(network);
}
```

### Base de Datos:

```sql
-- Schema debe permitir agregar redes después
-- NO crear constraints que bloqueen Pinterest/Google Business
-- Pero NO crear registros para estas redes ahora

CREATE TABLE network_connections (
  network text NOT NULL CHECK (network IN (
    'instagram', 'facebook', 'tiktok', 'youtube', 
    'twitter', 'linkedin'
    -- Pinterest y google_business se agregarán en Fase 2
    -- NO agregar al CHECK constraint ahora
  ))
);
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1 - MVP (6 redes):
- [ ] Instagram OAuth + Feed + Stories
- [ ] Facebook OAuth + Feed + Stories
- [ ] TikTok OAuth + Feed + Stories
- [ ] YouTube OAuth + Shorts + Long-form
- [ ] X OAuth + Feed
- [ ] LinkedIn OAuth + Feed
- [ ] NO Pinterest
- [ ] NO Google Business Profile

### Fase 2 - Futuro (6-12 meses):
- [ ] Pinterest (cuando se decida)
- [ ] Google Business Profile (cuando se decida)

---

## ⚠️ IMPORTANTE

1. **Arquitectura extensible:** Diseñar para agregar 2 redes después sin refactor
2. **NO exponer en UI:** Pinterest y Google Business NO deben aparecer como opciones funcionales
3. **Documentación:** Marcar claramente qué redes están activas vs diferidas
4. **Testing:** Solo testear las 6 redes activas

---

**Fecha de actualización:** $(Get-Date -Format "yyyy-MM-dd")  
**Alcance:** 6 redes activas, 2 diferidas
