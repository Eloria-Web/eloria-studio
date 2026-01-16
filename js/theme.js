function getPreferredTheme() {
  return localStorage.getItem('eloria_theme') || 'light';
}

function setPreferredTheme(theme) {
  localStorage.setItem('eloria_theme', theme);
  applyTheme(theme);
}

function getLabelForTheme(theme) {
  const lang = document.documentElement.lang || 'es';
  const strings = window.I18N_STRINGS?.[lang] || window.I18N_STRINGS?.es;
  if (!strings) {
    return theme === 'dark' ? 'Oscuro' : 'Claro';
  }
  return theme === 'dark' ? strings['nav.dark'] : strings['nav.light'];
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.textContent = getLabelForTheme(theme);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('themeToggle');
  const preferred = getPreferredTheme();
  applyTheme(preferred);

  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setPreferredTheme(next);
    });
  }
});

window.applyTheme = applyTheme;
