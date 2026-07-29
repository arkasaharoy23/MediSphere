function initTheme() {
  const root = document.documentElement;
  const stored = localStorage.getItem('MediSphere-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = stored || (prefersDark ? 'dark' : 'light');

  root.setAttribute('data-theme', initial);

  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const current = root.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('MediSphere-theme', next);
    });
  });
}

export { initTheme };