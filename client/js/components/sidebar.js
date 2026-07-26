function initSidebar() {
  const toggle = document.querySelector('[data-sidebar-toggle]');
  const sidebar = document.querySelector('[data-sidebar]');

  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    const isOpen = sidebar.getAttribute('data-open') === 'true';
    sidebar.setAttribute('data-open', String(!isOpen));
  });

  sidebar.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => sidebar.setAttribute('data-open', 'false'));
  });
}

export { initSidebar };