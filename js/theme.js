export const THEMES = [
  { id: '',      label: 'Sombre', color: '#c9a84c' },
  { id: 'clair', label: 'Clair',  color: '#9a7428' },
];

export function applyTheme(id) {
  document.documentElement.dataset.theme = id;
  localStorage.setItem('mhw-theme', id);
}

export function themePickerHtml() {
  const cur = document.documentElement.dataset.theme || '';
  return `<div class="theme-picker">${THEMES.map(t => `
    <div class="theme-swatch ${t.id === cur ? 'active' : ''}" data-theme-id="${t.id}">
      <div class="theme-swatch-dot" style="background:${t.color}"></div>
      <span class="theme-swatch-label">${t.label}</span>
    </div>`).join('')}</div>`;
}

export function bindThemePicker(root) {
  root.querySelectorAll('.theme-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      applyTheme(sw.dataset.themeId);
      root.querySelectorAll('.theme-swatch').forEach(s =>
        s.classList.toggle('active', s.dataset.themeId === sw.dataset.themeId));
    });
  });
}

// Restore saved theme on load
applyTheme(localStorage.getItem('mhw-theme') || '');
