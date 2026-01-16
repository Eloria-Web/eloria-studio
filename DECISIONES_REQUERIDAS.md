# ⚠️ DECISIONES REQUERIDAS ANTES DE CONSTRUIR

## 🎯 DECISIONES CRÍTICAS (Resolver ANTES de empezar)

Estas decisiones afectan el diseño técnico y deben tomarse primero.

---

## 1️⃣ LÍMITES DE PUBLICACIÓN

### Pregunta:
¿Cuántos posts por día/red/plan permitir?

### Opciones:

**Opción A: Sin límite técnico**
- Confiar en los límites de las APIs de cada red
- Pros: Más simple, menos código
- Contras: Usuarios pueden abusar, problemas con rate limits

**Opción B: Límite por plan**
- Free: 10 posts/día total
- Creator: 50 posts/día total
- Business: 200 posts/día total
- Agency: Sin límite
- Pros: Control, diferenciación de planes
- Contras: Más complejo, necesita tracking

**Opción C: Límite por red**
- Respetar límites conocidos de cada API
- Instagram: ~25 posts/día
- Facebook: ~50 posts/día
- TikTok: ~10 videos/día
- Pros: Realista, evita errores
- Contras: Necesita mantenimiento cuando cambian límites

### Recomendación:
**Opción C (Límite por red)** - Más realista y evita problemas

### Quién decide:
**Founder/Product Manager**

### Riesgo si no se decide:
- Código mal diseñado
- Necesidad de refactor después
- Posibles abusos del sistema

---

## 2️⃣ POLÍTICA DE REINTENTOS

### Pregunta:
Si falla una publicación, ¿cuántas veces reintentar?

### Opciones:

**Opción A: 1 reintento inmediato**
- Si falla, reintentar una vez inmediatamente
- Pros: Simple, rápido
- Contras: Puede fallar de nuevo si es error persistente

**Opción B: 3 reintentos con backoff**
- Reintentar 3 veces con delays: 1min, 5min, 15min
- Pros: Maneja errores temporales
- Contras: Más complejo, delays pueden ser largos

**Opción C: Reintento manual solo**
- Si falla, marcar como "failed" y usuario decide
- Pros: Usuario tiene control
- Contras: Más trabajo para usuario

**Opción D: Híbrido**
- 1 reintento inmediato automático
- Si falla, marcar como "failed" y permitir reintento manual
- Pros: Balance entre automatización y control
- Contras: Más lógica

### Recomendación:
**Opción D (Híbrido)** - Mejor balance

### Quién decide:
**Engineering Lead + Product Manager**

### Riesgo si no se decide:
- Publicaciones perdidas
- Spam de reintentos
- Mala experiencia de usuario

---

## 3️⃣ ESTRATEGIA DE TIMEZONES

### Pregunta:
¿Cómo manejar timezones para publicación programada?

### Opciones:

**Opción A: Timezone del usuario**
- Todos los posts se programan en timezone del usuario
- Pros: Simple, predecible
- Contras: No funciona para marcas globales

**Opción B: Timezone por brand**
- Cada brand tiene su timezone configurado
- Pros: Útil para marcas con ubicación específica
- Contras: Más complejo, necesita UI para configurar

**Opción C: Timezone por red social**
- Cada red social tiene su timezone (del público objetivo)
- Pros: Más preciso para engagement
- Contras: Muy complejo, confuso para usuarios

**Opción D: Timezone del público objetivo**
- Usuario especifica timezone del público objetivo
- Pros: Más preciso para engagement
- Contras: Requiere que usuario sepa su público

### Recomendación:
**Opción B (Timezone por brand)** - Balance entre simplicidad y utilidad

### Quién decide:
**Product Manager/UX Designer**

### Riesgo si no se decide:
- Publicaciones en horarios incorrectos
- Mala experiencia de usuario
- Necesidad de refactor después

---

## 4️⃣ RECOMENDACIONES DE HASHTAGS

### Pregunta:
¿Qué recomendaciones mostrar por red?

### Necesita contenido:

**Instagram:**
- Recomendación: 5-8 hashtags
- Ejemplos de hashtags por industria (opcional)
- ¿Mostrar hashtags trending? (requiere API adicional)

**TikTok:**
- Recomendación: 3-5 hashtags
- ¿Mostrar hashtags virales? (requiere API adicional)

**LinkedIn:**
- Recomendación: Tono profesional, hashtags mínimos (1-3)
- ¿Mostrar hashtags profesionales? (requiere investigación)

**X (Twitter):**
- Recomendación: No usar hashtags (o máximo 1-2)
- Enfoque en copy corto + link

**Facebook:**
- Recomendación: Hashtags opcionales, menos importantes

**Pinterest:**
- Recomendación: Hashtags en descripción, no en título

**YouTube:**
- Recomendación: Tags en metadata, no hashtags visibles

**Google Business:**
- Recomendación: Sin hashtags

### Quién decide:
**Marketing/Content Strategy**

### Riesgo si no se decide:
- Recomendaciones incorrectas
- Confusión de usuarios
- Mala práctica de hashtags

---

## 5️⃣ MENSAJES DE ERROR

### Pregunta:
¿Cómo comunicar errores de forma clara?

### Necesita copywriting:

**Errores de Validación:**
- "Esta imagen es muy grande para Instagram Stories"
- "Falta texto para publicar en X (mín. 1 carácter)"
- "TikTok requiere video, no imagen estática"
- "YouTube Shorts debe ser vertical (9:16)"

**Errores de Publicación:**
- "Error al publicar en Instagram. Verifica tu conexión."
- "Facebook rechazó esta publicación. Revisa el contenido."
- "TikTok está experimentando problemas. Intenta más tarde."

**Errores de Conexión:**
- "Tu conexión con Instagram expiró. Reconecta tu cuenta."
- "No tienes permisos para publicar en esta página de Facebook."

### Quién decide:
**UX Writer/Product Manager**

### Riesgo si no se decide:
- Mensajes técnicos confusos
- Usuarios no saben qué hacer
- Mala experiencia de usuario

---

## 6️⃣ QUÉ MÉTRICAS MOSTRAR

### Pregunta:
¿Qué métricas son más importantes por red?

### Necesita decisión:

**Instagram Feed:**
- ¿Mostrar: Reach, Impressions, Engagement, Likes, Comments, Shares?
- ¿Cuáles son prioritarias?

**Instagram Stories:**
- ¿Mostrar: Views, Replies, Exits, Forward, Back?
- ¿Cuáles son más importantes?

**Facebook:**
- ¿Mostrar: Reach, Impressions, Engagement, Reactions, Comments, Shares, Clicks?

**TikTok:**
- ¿Mostrar: Views, Likes, Comments, Shares, Profile Views?

**YouTube:**
- ¿Mostrar: Views, Watch Time, Subscribers, Likes, Comments?

**X (Twitter):**
- ¿Mostrar: Impressions, Engagement, Retweets, Likes, Replies, Clicks?

**LinkedIn:**
- ¿Mostrar: Impressions, Engagement, Reactions, Comments, Shares, Clicks?

**Pinterest:**
- ¿Mostrar: Impressions, Saves, Clicks, Outbound Clicks?

**Google Business:**
- ¿Mostrar: Views, Actions (Calls, Directions, Website)?

### Quién decide:
**Marketing/Analytics Team**

### Riesgo si no se decide:
- Dashboard confuso
- Métricas irrelevantes mostradas
- Falta de métricas importantes

---

## 7️⃣ ESTRATEGIA DE PRECIOS DEL PRODUCTO

### Pregunta:
¿Los límites de publicación varían por plan de pago?

### Opciones:

**Opción A: Sin límites por plan**
- Todos los planes tienen mismos límites técnicos
- Diferenciación solo en número de brands/users
- Pros: Simple
- Contras: Menos incentivo para upgrade

**Opción B: Límites por plan**
- Free: 10 posts/día
- Creator: 50 posts/día
- Business: 200 posts/día
- Agency: Sin límite
- Pros: Mejor diferenciación
- Contras: Más complejo

### Quién decide:
**Founder/Finance**

### Riesgo si no se decide:
- No se puede diseñar la lógica de límites
- Necesidad de refactor después

---

## 📋 CHECKLIST DE DECISIONES

Antes de empezar a construir, necesitas:

- [ ] Decidir límites de publicación
- [ ] Decidir política de reintentos
- [ ] Decidir estrategia de timezones
- [ ] Crear recomendaciones de hashtags
- [ ] Escribir mensajes de error
- [ ] Decidir qué métricas mostrar
- [ ] Decidir si límites varían por plan

---

## ⚠️ RIESGO DE NO DECIDIR

Si no tomas estas decisiones antes de construir:

1. **Código mal diseñado** - Necesitarás refactor después
2. **Features incompletas** - Falta lógica importante
3. **Mala UX** - Usuarios confundidos
4. **Pérdida de tiempo** - Rehacer trabajo

---

## 🎯 RECOMENDACIÓN

**Toma estas decisiones en 1-2 días** antes de empezar a construir.

**Prioridad:**
1. Límites de publicación (afecta schema DB)
2. Política de reintentos (afecta lógica de publicación)
3. Timezones (afecta calendario)
4. Resto (puede iterarse después)

---

**Una vez decidido, documenta todo en este archivo y procede con la construcción.**
