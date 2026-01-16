# 📋 PLAN DE ACCIÓN PRIORIZADO - studio.eloria.paris

## 🎯 OBJETIVO

Mejorar el sitio https://studio.eloria.paris/ siguiendo las recomendaciones de la auditoría.

---

## FASE 1: CRÍTICO (Semana 1) - 2-3 días

### Día 1: Autenticación y Rutas

**Tareas:**
1. ✅ Subir archivos de autenticación a Netlify
   - `signup.html`, `login.html`, `reset-password.html`, `dashboard.html`
   - Todos los JS y CSS relacionados
   - **Tiempo:** 30 minutos

2. ✅ Crear tablas en Supabase
   - Ejecutar SQL de `INTEGRACION_SITIO_REAL.md`
   - **Tiempo:** 10 minutos

3. ✅ Fix botones de pricing en index.html
   - Actualizar hrefs de "Start free"
   - **Tiempo:** 15 minutos

4. ✅ Agregar SDK de Supabase
   - Agregar scripts antes de `</body>`
   - **Tiempo:** 10 minutos

**Total Día 1:** ~1.5 horas

### Día 2: UX y Navegación

**Tareas:**
1. ✅ Implementar navegación mobile
   - Agregar hamburger menu
   - **Tiempo:** 1 hora

2. ✅ Fix toggle de pricing
   - Implementar funcionalidad mensual/anual
   - **Tiempo:** 1 hora

3. ✅ Agregar manejo de errores básico
   - Estados de error en formularios
   - **Tiempo:** 1 hora

4. ✅ Fix enlaces rotos
   - Verificar todos los "Explore [Feature]"
   - **Tiempo:** 30 minutos

**Total Día 2:** ~3.5 horas

### Día 3: Accesibilidad Básica

**Tareas:**
1. ✅ Agregar aria-labels
   - Iconos y botones sin texto
   - **Tiempo:** 1 hora

2. ✅ Fix contraste de colores
   - Verificar WCAG AA
   - **Tiempo:** 1 hora

3. ✅ Agregar focus visible
   - Outline para navegación por teclado
   - **Tiempo:** 30 minutos

4. ✅ Agregar skip link
   - Link para saltar navegación
   - **Tiempo:** 15 minutos

**Total Día 3:** ~3 horas

**Total Fase 1:** ~8 horas (1 día completo)

---

## FASE 2: ALTO (Semana 2) - 3-4 días

### Día 4-5: Sistema de Pagos

**Tareas:**
1. ⚠️ Configurar PayPal
   - Obtener Client ID
   - Agregar a `pricing.html` y `js/payments.js`
   - **Tiempo:** 2 horas

2. ⚠️ Configurar Stripe
   - Obtener Publishable Key
   - Crear productos y precios
   - Configurar webhook
   - **Tiempo:** 3 horas

3. ✅ Crear página de checkout
   - Ya está creada, solo verificar
   - **Tiempo:** 30 minutos

**Total Días 4-5:** ~5.5 horas

### Día 6: Sistema de Idiomas

**Tareas:**
1. ✅ Crear sistema i18n completo
   - Archivo `js/i18n.js`
   - **Tiempo:** 2 horas

2. ✅ Agregar data-i18n a elementos
   - Marcar todos los textos traducibles
   - **Tiempo:** 2 horas

3. ✅ Configurar español por defecto
   - Detección de idioma
   - **Tiempo:** 30 minutos

**Total Día 6:** ~4.5 horas

### Día 7: Página de Settings

**Tareas:**
1. ✅ Crear `settings.html`
   - Tabs: Account, Billing, Danger Zone
   - **Tiempo:** 3 horas

2. ✅ Integrar con Supabase
   - Actualizar perfil
   - Gestionar billing
   - **Tiempo:** 2 horas

**Total Día 7:** ~5 horas

**Total Fase 2:** ~15 horas (2 días completos)

---

## FASE 3: MEDIO (Semana 3) - 2-3 días

### Día 8: Performance

**Tareas:**
1. ✅ Optimizar imágenes
   - Convertir a WebP/AVIF
   - **Tiempo:** 2 horas

2. ✅ Lazy loading
   - Agregar loading="lazy"
   - **Tiempo:** 1 hora

3. ✅ Minificar CSS/JS
   - Configurar en Netlify
   - **Tiempo:** 30 minutos

**Total Día 8:** ~3.5 horas

### Día 9: Dark Mode

**Tareas:**
1. ✅ Implementar dark mode
   - CSS variables
   - Toggle button
   - **Tiempo:** 3 horas

**Total Día 9:** ~3 horas

### Día 10: UX Improvements

**Tareas:**
1. ✅ Empty states
   - Mensajes cuando no hay contenido
   - **Tiempo:** 2 horas

2. ✅ Onboarding post-signup
   - Tour o checklist
   - **Tiempo:** 3 horas

3. ✅ Confirmaciones de acciones
   - Modales de confirmación
   - **Tiempo:** 1 hora

**Total Día 10:** ~6 horas

**Total Fase 3:** ~12.5 horas (1.5 días)

---

## FASE 4: CONTENIDO (Ongoing) - Manual

### Tareas Manuales (No técnicas)

1. ⚠️ **Testimonios reales**
   - Obtener testimonios con fotos y nombres reales
   - **Quién:** Marketing/Founder
   - **Tiempo:** 1-2 semanas

2. ⚠️ **Logos de partners**
   - Obtener logos oficiales con permisos
   - **Quién:** Diseñador
   - **Tiempo:** 1 semana

3. ⚠️ **Casos de estudio**
   - Crear contenido con métricas reales
   - **Quién:** Marketing/Content
   - **Tiempo:** 2-3 semanas

4. ⚠️ **Página de seguridad**
   - Crear contenido sobre seguridad
   - **Quién:** Legal + Marketing
   - **Tiempo:** 1 semana

---

## 📊 RESUMEN DE TIEMPOS

| Fase | Tiempo Técnico | Tiempo Manual | Total |
|------|----------------|---------------|-------|
| Fase 1: Crítico | 8 horas | 0 | 1 día |
| Fase 2: Alto | 15 horas | 0 | 2 días |
| Fase 3: Medio | 12.5 horas | 0 | 1.5 días |
| Fase 4: Contenido | 0 | 4-6 semanas | Ongoing |
| **TOTAL** | **35.5 horas** | **4-6 semanas** | **~1 semana técnica** |

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1 (Crítico)
- [ ] Subir archivos de autenticación
- [ ] Crear tablas en Supabase
- [ ] Fix botones de pricing
- [ ] Agregar SDK Supabase
- [ ] Navegación mobile
- [ ] Toggle de pricing funcional
- [ ] Manejo de errores
- [ ] Fix enlaces rotos
- [ ] Aria-labels
- [ ] Fix contraste
- [ ] Focus visible
- [ ] Skip link

### Fase 2 (Alto)
- [ ] Configurar PayPal
- [ ] Configurar Stripe
- [ ] Sistema i18n completo
- [ ] Español por defecto
- [ ] Página de settings

### Fase 3 (Medio)
- [ ] Optimizar imágenes
- [ ] Lazy loading
- [ ] Minificar assets
- [ ] Dark mode
- [ ] Empty states
- [ ] Onboarding
- [ ] Confirmaciones

### Fase 4 (Contenido - Manual)
- [ ] Testimonios reales
- [ ] Logos partners
- [ ] Casos de estudio
- [ ] Página seguridad

---

## 🎯 PRÓXIMO PASO INMEDIATO

**AHORA MISMO:**
1. Subir archivos de `Eloria Studio/` a Netlify
2. Crear tablas en Supabase
3. Fix botones de pricing en index.html

**Esto tomará ~1 hora y hará el sitio funcional básico.**

---

**Siguiente:** Seguir con Fase 1, Día 2 (UX y Navegación)
