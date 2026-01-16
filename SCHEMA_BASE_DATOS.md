# 🗄️ SCHEMA DE BASE DE DATOS - Eloria Studio

## 📋 TABLAS REQUERIDAS

### 1. brands (Workspaces)
```sql
CREATE TABLE brands (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own brands"
  ON brands FOR ALL
  USING (auth.uid() = user_id);
```

### 2. brand_members (Roles por marca)
```sql
CREATE TABLE brand_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at timestamp DEFAULT now(),
  UNIQUE(brand_id, user_id)
);

ALTER TABLE brand_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brand memberships"
  ON brand_members FOR SELECT
  USING (user_id = auth.uid());
```

### 3. network_connections (OAuth Tokens)
```sql
CREATE TABLE network_connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  network text NOT NULL CHECK (network IN (
    'instagram', 'facebook', 'tiktok', 'youtube', 
    'twitter', 'linkedin'
    -- Pinterest y google_business diferidas para Fase 2 (NO implementar ahora)
  )),
  account_id text NOT NULL, -- ID de la cuenta en la red social
  account_name text,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamp,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(brand_id, network, account_id)
);

ALTER TABLE network_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections"
  ON network_connections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = network_connections.brand_id 
      AND brands.user_id = auth.uid()
    )
  );
```

### 4. posts (Contenido Master)
```sql
CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  
  -- Contenido master
  content_text text,
  content_html text,
  
  -- Assets
  image_urls text[], -- Array de URLs de imágenes
  video_url text,
  
  -- Metadata
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  status text DEFAULT 'draft' CHECK (status IN (
    'draft', 'scheduled', 'publishing', 'published', 
    'partially_published', 'failed'
  ))
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own posts"
  ON posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = posts.brand_id 
      AND brands.user_id = auth.uid()
    )
  );
```

### 5. post_adaptations (Adaptaciones por Red)
```sql
CREATE TABLE post_adaptations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  network text NOT NULL CHECK (network IN (
    'instagram', 'facebook', 'tiktok', 'youtube', 
    'twitter', 'linkedin'
    -- Pinterest y google_business diferidas para Fase 2 (NO implementar ahora)
  )),
  
  -- Tipo de publicación
  publish_type text NOT NULL CHECK (publish_type IN (
    'feed', 'stories', 'shorts', 'long_video'
  )),
  
  -- Contenido adaptado
  adapted_text text,
  hashtags text[], -- Array de hashtags
  link_url text,
  
  -- Validación
  is_valid boolean DEFAULT false,
  validation_errors text[],
  
  -- Estado
  should_publish boolean DEFAULT true,
  status text DEFAULT 'draft' CHECK (status IN (
    'draft', 'scheduled', 'publishing', 'published',
    'partially_published', 'failed'
  )),
  retry_count integer DEFAULT 0,
  last_attempt_at timestamp,
  published_at timestamp,
  last_error text,
  
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  
  UNIQUE(post_id, network, publish_type)
);

ALTER TABLE post_adaptations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own adaptations"
  ON post_adaptations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_adaptations.post_id
      AND EXISTS (
        SELECT 1 FROM brands 
        WHERE brands.id = posts.brand_id 
        AND brands.user_id = auth.uid()
      )
    )
  );
```

### 6. schedules (Programación)
```sql
CREATE TABLE schedules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  scheduled_at timestamp NOT NULL,
  timezone text DEFAULT 'UTC',
  is_published boolean DEFAULT false,
  published_at timestamp,
  created_at timestamp DEFAULT now()
);

CREATE INDEX idx_schedules_scheduled_at ON schedules(scheduled_at) 
WHERE is_published = false;

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedules"
  ON schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = schedules.post_id
      AND EXISTS (
        SELECT 1 FROM brands 
        WHERE brands.id = posts.brand_id 
        AND brands.user_id = auth.uid()
      )
    )
  );
```

### 7. publications (Historial de Publicaciones)
```sql
CREATE TABLE publications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  adaptation_id uuid REFERENCES post_adaptations(id),
  network text NOT NULL,
  publish_type text NOT NULL,
  
  -- Resultado
  status text NOT NULL CHECK (status IN (
    'success', 'failed', 'partial'
  )),
  external_post_id text, -- ID en la red social
  external_url text, -- URL del post publicado
  
  -- Errores
  error_message text,
  error_code text,
  
  -- Metadata
  published_at timestamp,
  created_at timestamp DEFAULT now()
);

ALTER TABLE publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own publications"
  ON publications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = publications.post_id
      AND EXISTS (
        SELECT 1 FROM brands 
        WHERE brands.id = posts.brand_id 
        AND brands.user_id = auth.uid()
      )
    )
  );
```

### 8. metrics (Métricas Históricas)
```sql
CREATE TABLE metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  network text NOT NULL,
  publish_type text, -- feed, stories, etc.
  external_post_id text NOT NULL,
  
  -- Métricas (varían por red)
  followers integer,
  impressions integer,
  reach integer,
  engagement integer,
  likes integer,
  comments integer,
  shares integer,
  clicks integer,
  views integer, -- Para videos/stories
  
  -- Metadata
  metric_date date NOT NULL,
  last_updated timestamp DEFAULT now(),
  
  created_at timestamp DEFAULT now(),
  
  UNIQUE(brand_id, network, external_post_id, metric_date, publish_type)
);

CREATE INDEX idx_metrics_brand_date ON metrics(brand_id, metric_date);

ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics"
  ON metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = metrics.brand_id 
      AND brands.user_id = auth.uid()
    )
  );
```

### 9. hashtag_presets (Presets de Hashtags)
```sql
CREATE TABLE hashtag_presets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  network text NOT NULL,
  name text NOT NULL, -- Nombre del preset
  hashtags text[] NOT NULL, -- Array de hashtags
  is_default boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE hashtag_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own presets"
  ON hashtag_presets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = hashtag_presets.brand_id 
      AND brands.user_id = auth.uid()
    )
  );
```

### 10. n8n_executions (Logs de n8n)
```sql
CREATE TABLE n8n_executions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  adaptation_id uuid REFERENCES post_adaptations(id),
  n8n_execution_id text NOT NULL, -- ID de ejecución en n8n
  status text NOT NULL CHECK (status IN (
    'running', 'success', 'error', 'waiting'
  )),
  started_at timestamp,
  finished_at timestamp,
  error_message text,
  created_at timestamp DEFAULT now()
);

ALTER TABLE n8n_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own executions"
  ON n8n_executions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = n8n_executions.post_id
      AND EXISTS (
        SELECT 1 FROM brands 
        WHERE brands.id = posts.brand_id 
        AND brands.user_id = auth.uid()
      )
    )
  );
```

### 11. usage_counters (Límites por mes)
```sql
CREATE TABLE usage_counters (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  posts_published integer DEFAULT 0,
  active_networks integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(brand_id, period_start, period_end)
);

ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage counters"
  ON usage_counters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = usage_counters.brand_id 
      AND brands.user_id = auth.uid()
    )
  );
```

### 12. oauth_states (OAuth PKCE + CSRF)
```sql
CREATE TABLE oauth_states (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  network text NOT NULL,
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect text,
  code_verifier text,
  created_at timestamp DEFAULT now()
);

ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
```

---

## 🔄 RELACIONES ENTRE TABLAS

```
users (auth.users)
  └── brands (workspaces)
       ├── brand_members (roles por marca)
       ├── network_connections (OAuth tokens)
       ├── posts (contenido master)
       │    ├── post_adaptations (por red)
       │    ├── schedules (programación)
       │    ├── publications (historial)
       │    └── n8n_executions (logs)
       ├── metrics (métricas históricas)
       ├── hashtag_presets (presets)
       ├── usage_counters (límites)
       └── oauth_states (OAuth)
```

---

## 📝 NOTAS IMPORTANTES

1. **Stories separados:** `publish_type` diferencia feed, stories, shorts, long_video
2. **Validación:** `post_adaptations.is_valid` y `validation_errors` para validar antes de publicar
3. **Historial completo:** `publications` guarda todo lo publicado
4. **Métricas históricas:** `metrics` con fecha para comparar períodos
5. **RLS activado:** Todas las tablas tienen Row Level Security

---

**Ejecutar este SQL en Supabase SQL Editor después de crear las tablas de usuarios y pagos.**
