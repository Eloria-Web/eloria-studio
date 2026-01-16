# 🗺️ ROADMAP DEL PRODUCTO - Eloria Studio

## 🎯 VISIÓN DEL PRODUCTO

Plataforma SaaS que permite publicar contenido a 6 redes sociales (MVP) desde una interfaz única, con adaptación automática por red, soporte para Feed y Stories, y analytics históricos.

**Redes MVP (Fase 1):** Instagram, Facebook, TikTok, YouTube, X, LinkedIn  
**Redes Diferidas (Fase 2):** Pinterest, Google Business Profile

---

## 📅 FASE 1: MVP MÍNIMO (6-8 semanas) - **ACTUALIZADO: 6 redes**

### Sprint 1-2: Fundación (2 semanas)
**Objetivo:** Base técnica lista

- [ ] Schema de base de datos completo
- [ ] OAuth para Instagram, Facebook, TikTok (las 3 prioritarias)
- [ ] Storage de assets (Supabase Storage)
- [ ] Workspaces básicos
- [ ] Autenticación de usuarios (ya existe)

**Entregable:** Usuarios pueden crear brands y conectar 3 redes

### Sprint 3-4: Editor Básico (2 semanas)
**Objetivo:** Crear contenido

- [ ] Editor de texto (markdown o rich text)
- [ ] Upload de imágenes
- [ ] Selector de redes (Instagram, Facebook, TikTok)
- [ ] Selector Feed/Stories
- [ ] Preview básico por red
- [ ] Validación básica

**Entregable:** Usuarios pueden crear posts y ver preview

### Sprint 5-6: Publicación (2 semanas)
**Objetivo:** Publicar realmente

- [ ] Integración con n8n
- [ ] Workflows de n8n para Instagram Feed
- [ ] Workflows de n8n para Instagram Stories
- [ ] Workflows de n8n para Facebook Feed
- [ ] Workflows de n8n para Facebook Stories
- [ ] Workflows de n8n para TikTok Feed
- [ ] Workflows de n8n para TikTok Stories
- [ ] Estados UX (draft, publishing, published, failed)
- [ ] Manejo de errores

**Entregable:** Usuarios pueden publicar a 3 redes (Feed + Stories)

### Sprint 7-8: Calendario Básico (2 semanas)
**Objetivo:** Programar contenido

- [ ] Vista de calendario mensual
- [ ] Vista de calendario semanal
- [ ] Drag & drop de posts
- [ ] Programación por fecha/hora
- [ ] Jobs programados (cron)
- [ ] Timezone handling

**Entregable:** Usuarios pueden programar posts

### Sprint 9-10: Polish MVP (2 semanas)
**Objetivo:** MVP usable

- [ ] Hashtags básicos
- [ ] Empty states
- [ ] Onboarding básico
- [ ] Fixes de bugs
- [ ] Performance básico

**Entregable:** MVP funcional con 3 redes prioritarias

---

## 📅 FASE 2: REDES RESTANTES DEL MVP (3-4 semanas) - **ACTUALIZADO: 3 redes adicionales**

### Sprint 9-10: YouTube (2 semanas)
- [ ] OAuth YouTube
- [ ] Workflow Shorts
- [ ] Workflow Long-form videos
- [ ] Validación específica
- [ ] Preview específico

### Sprint 11: X (Twitter) (1 semana)
- [ ] OAuth X
- [ ] Workflow Feed
- [ ] Validación (280 caracteres)
- [ ] Preview

### Sprint 12: LinkedIn (1 semana)
- [ ] OAuth LinkedIn Pages
- [ ] Workflow Feed
- [ ] Validación profesional
- [ ] Preview

**Entregable:** Las 6 redes del MVP funcionando

---

## 📅 FASE 3: REDES DIFERIDAS (NO IMPLEMENTAR AHORA)

### Pinterest y Google Business Profile
- **Estado:** Diferidas para Fase 2 (6-12 meses)
- **Acción:** NO construir OAuth, workflows, ni UI
- **Arquitectura:** Debe ser extensible para agregar después sin refactor
- **UI:** Puede mostrar "Coming Soon" pero NO funcionalidad

---

## 📅 FASE 4: ANALYTICS (3-4 semanas)

### Sprint 17-18: Jobs de Métricas (2 semanas)
- [ ] Jobs programados por red
- [ ] Fetch de métricas vía APIs
- [ ] Almacenamiento histórico
- [ ] Manejo de rate limits
- [ ] "Last updated" timestamps

### Sprint 19-20: Dashboard de Analytics (2 semanas)
- [ ] Dashboard principal
- [ ] Gráficos por red
- [ ] Comparación Feed vs Stories
- [ ] Filtros por fecha/brand
- [ ] Export PDF/CSV

**Entregable:** Analytics completo

---

## 📅 FASE 5: FEATURES AVANZADAS (4-6 semanas)

### Sprint 21-22: Hashtags Avanzados (2 semanas)
- [ ] Presets por red
- [ ] Recomendaciones no vinculantes
- [ ] Biblioteca de hashtags
- [ ] Análisis de hashtags

### Sprint 23-24: Equipos y Permisos (2 semanas)
- [ ] Invitaciones a equipos
- [ ] Roles (admin, editor, viewer)
- [ ] Permisos por workspace
- [ ] Aprobaciones de contenido

### Sprint 25-26: Mejoras UX (2 semanas)
- [ ] Biblioteca de assets
- [ ] Templates de contenido
- [ ] Bulk actions
- [ ] Búsqueda avanzada

**Entregable:** Producto completo

---

## 🚫 NO IMPLEMENTAR (Fase 2 - 6-12 meses)

### Redes Diferidas (Pinterest, Google Business Profile):
- **NO construir OAuth** - No configurar credenciales
- **NO crear workflows** - No crear lógica de publicación
- **NO exponer en UI** - No mostrar como opción funcional
- **Arquitectura extensible** - Diseñar para agregar después sin refactor
- **UI opcional:** Puede mostrar "Coming Soon" pero NO funcionalidad

---

## 📊 MÉTRICAS DE ÉXITO DEL PRODUCTO

### MVP (Fase 1):
- ✅ Usuarios pueden publicar a 3 redes
- ✅ Feed y Stories funcionan
- ✅ Programación funciona
- ✅ Estados UX claros

### Fase 2:
- ✅ Las 8 redes funcionan
- ✅ Todas las validaciones correctas

### Fase 3:
- ✅ Analytics funcionando
- ✅ Métricas históricas disponibles

---

## ⚠️ DECISIONES PENDIENTES (Manual)

1. **Estrategia de Hashtags** - Marketing
2. **Límites de Publicación** - Product
3. **Política de Reintentos** - Engineering
4. **Estrategia de Timezones** - Product/UX
5. **Qué Métricas Mostrar** - Marketing/Analytics

---

**Tiempo Total Estimado:** 18-22 semanas (4.5-5.5 meses) para producto completo con 6 redes

**MVP Mínimo:** 6-8 semanas (1.5-2 meses) - **Reducido por 6 redes en lugar de 8**
