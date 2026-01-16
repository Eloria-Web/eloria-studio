# 🔧 FIXES IMPLEMENTABLES - Código Listo para Copiar

## 🚨 CRÍTICOS (Implementar primero)

### FIX #1: Sistema de Autenticación
**Archivos a subir a Netlify:**
- `signup.html`
- `login.html`
- `reset-password.html`
- `dashboard.html`
- `js/firebase-init.js` (Supabase config)
- `js/auth-guard.js`
- `js/signup.js`
- `js/login.js`
- `js/reset-password.js`
- `js/dashboard.js`
- `css/auth.css`
- `css/dashboard.css`

### FIX #2: Botones de Pricing
**Modificar en index.html del sitio real:**

```html
<!-- Reemplazar botones "Start free" -->
<a href="/signup.html?plan=free" class="btn">Start free</a> <!-- Free -->
<a href="/checkout.html?plan=creator" class="btn">Start free</a> <!-- Creator -->
<a href="/checkout.html?plan=business" class="btn">Start free</a> <!-- Business -->
<a href="/checkout.html?plan=agency" class="btn">Start free</a> <!-- Agency -->
```

### FIX #3: Toggle de Pricing Funcional
**Agregar en pricing.html:**

```html
<div class="pricing-toggle">
  <span>Monthly</span>
  <label class="toggle-switch">
    <input type="checkbox" id="pricingToggle">
    <span class="slider"></span>
  </label>
  <span>Annual <span class="save-badge">Save 20%</span></span>
</div>

<script>
document.getElementById('pricingToggle').addEventListener('change', function(e) {
  const isAnnual = e.target.checked;
  const prices = {
    creator: { monthly: 20, annual: 192 },
    business: { monthly: 65, annual: 624 },
    agency: { monthly: 180, annual: 1728 }
  };
  
  document.querySelectorAll('.pricing-card').forEach(card => {
    const plan = card.dataset.plan;
    const priceEl = card.querySelector('.price-amount');
    const periodEl = card.querySelector('.price-period');
    
    if (plan && prices[plan]) {
      const price = isAnnual ? prices[plan].annual : prices[plan].monthly;
      priceEl.textContent = `$${price}`;
      periodEl.textContent = isAnnual ? '/year' : '/month';
    }
  });
  
  // Track
  if (window.gtag) {
    gtag('event', 'pricing_toggle', { billing: isAnnual ? 'annual' : 'monthly' });
  }
});
</script>

<style>
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #CBD5E0;
  transition: .4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #3B82F6;
}

input:checked + .slider:before {
  transform: translateX(26px);
}
</style>
```

### FIX #4: Navegación Mobile
**Agregar en header:**

```html
<button class="mobile-menu-toggle" aria-label="Toggle menu" aria-expanded="false">
  <span></span>
  <span></span>
  <span></span>
</button>

<nav class="main-nav" id="mainNav">
  <!-- Tu navegación aquí -->
</nav>

<script>
document.querySelector('.mobile-menu-toggle').addEventListener('click', function() {
  const nav = document.getElementById('mainNav');
  const isExpanded = this.getAttribute('aria-expanded') === 'true';
  
  this.setAttribute('aria-expanded', !isExpanded);
  nav.classList.toggle('nav--open');
});
</script>

<style>
@media (max-width: 768px) {
  .mobile-menu-toggle {
    display: block;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
  }
  
  .mobile-menu-toggle span {
    display: block;
    width: 25px;
    height: 3px;
    background: #0B1F3A;
    margin: 5px 0;
    transition: 0.3s;
  }
  
  .main-nav {
    position: fixed;
    top: 0;
    right: -100%;
    width: 80%;
    max-width: 300px;
    height: 100vh;
    background: #fff;
    box-shadow: -2px 0 10px rgba(0,0,0,0.1);
    transition: right 0.3s ease;
    z-index: 1000;
    padding: 2rem;
  }
  
  .main-nav.nav--open {
    right: 0;
  }
}
</style>
```

### FIX #5: Manejo de Errores en Formularios
**Agregar CSS:**

```css
.form-error {
  color: #F56565;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
  min-height: 1.25rem;
}

.form-success {
  color: #10B981;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
}

.input-error {
  border-color: #F56565 !important;
}

.input-success {
  border-color: #10B981 !important;
}
```

**Agregar JavaScript:**

```javascript
function showError(inputId, message) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(inputId + 'Error') || 
                   input.nextElementSibling;
  
  if (input) {
    input.classList.add('input-error');
    input.classList.remove('input-success');
  }
  
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.className = 'form-error';
  }
}

function showSuccess(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.classList.remove('input-error');
    input.classList.add('input-success');
  }
}

function clearErrors() {
  document.querySelectorAll('.input-error').forEach(el => {
    el.classList.remove('input-error');
  });
  document.querySelectorAll('.form-error').forEach(el => {
    el.textContent = '';
  });
}
```

---

## 🟡 MEDIOS (Implementar después)

### FIX #6: Sistema de Idiomas Completo
**Crear archivo `js/i18n.js`:**

```javascript
const translations = {
  es: {
    'nav.product': 'Producto',
    'nav.pricing': 'Precios',
    'nav.agencies': 'Agencias',
    'nav.academy': 'Academia',
    'cta.create': 'Crear cuenta gratis',
    'cta.login': 'Iniciar sesión',
    'hero.title': 'Todo tu social, en una pestaña',
    'hero.subtitle': 'Planifica, mide y colabora sin complicaciones.',
    // ... más traducciones
  },
  en: {
    'nav.product': 'Product',
    'nav.pricing': 'Pricing',
    'nav.agencies': 'Agencies',
    'nav.academy': 'Academy',
    'cta.create': 'Create free account',
    'cta.login': 'Log in',
    'hero.title': 'All your social, in one tab',
    'hero.subtitle': 'Plan, measure, and collaborate without the hassle.',
    // ... más traducciones
  }
};

// Detectar idioma por defecto
const defaultLang = 'es';
const browserLang = navigator.language.split('-')[0];
const savedLang = localStorage.getItem('eloria_lang');
const currentLang = savedLang || (browserLang === 'es' ? 'es' : defaultLang);

// Aplicar idioma
function applyLanguage(lang) {
  document.documentElement.lang = lang;
  document.body.dataset.lang = lang;
  localStorage.setItem('eloria_lang', lang);
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });
}

// Inicializar
applyLanguage(currentLang);

// Selector de idioma
document.querySelectorAll('.lang-switcher').forEach(btn => {
  btn.addEventListener('click', () => {
    const newLang = currentLang === 'es' ? 'en' : 'es';
    applyLanguage(newLang);
  });
});
```

**Agregar data-i18n a elementos:**

```html
<nav data-i18n="nav.product">Product</nav>
<h1 data-i18n="hero.title">All your social, in one tab</h1>
```

### FIX #7: Accesibilidad - Aria Labels
**Agregar a todos los iconos y botones:**

```html
<!-- Iconos -->
<span class="icon" aria-label="Calendar icon">📅</span>
<span class="icon" aria-label="Analytics icon">📊</span>

<!-- Botones sin texto -->
<button aria-label="Close menu">
  <span aria-hidden="true">×</span>
</button>

<!-- Enlaces de imagen -->
<a href="/product" aria-label="View product features">
  <img src="product.jpg" alt="Eloria Studio dashboard showing calendar and analytics">
</a>
```

### FIX #8: Skip Link
**Agregar al inicio de cada página:**

```html
<a href="#main-content" class="skip-link">Skip to main content</a>

<style>
.skip-link {
  position: absolute;
  left: -999px;
  top: 0;
  z-index: 999;
  padding: 1rem;
  background: #0B1F3A;
  color: #fff;
  text-decoration: none;
  font-weight: 600;
}

.skip-link:focus {
  left: 0;
  top: 0;
}
</style>
```

### FIX #9: Focus Visible
**Agregar CSS:**

```css
*:focus-visible {
  outline: 3px solid #3B82F6;
  outline-offset: 2px;
  border-radius: 4px;
}

*:focus:not(:focus-visible) {
  outline: none;
}
```

---

## 🟢 BAJOS (Nice to have)

### FIX #10: Dark Mode
**Ver código completo en AUDITORIA_COMPLETA.md sección 9**

### FIX #11: Lazy Loading de Imágenes
**Reemplazar todas las imágenes:**

```html
<!-- Above the fold -->
<img src="hero.jpg" alt="Hero" loading="eager">

<!-- Below the fold -->
<img src="feature.jpg" alt="Feature" loading="lazy" decoding="async">
```

### FIX #12: Optimización de Imágenes
**Usar WebP con fallback:**

```html
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description" loading="lazy">
</picture>
```

---

## 📝 NOTAS DE IMPLEMENTACIÓN

1. **Todos los fixes están listos para copiar y pegar**
2. **Adapta los selectores CSS/JS a tu estructura HTML actual**
3. **Prueba cada fix individualmente antes de continuar**
4. **Mantén un backup antes de hacer cambios**

---

**Prioridad:** Implementa primero los CRÍTICOS, luego MEDIOS, y finalmente BAJOS.
