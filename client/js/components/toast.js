function showToast(message, variant = 'error') {
  let container = document.querySelector('[data-toast-container]');
  if (!container) {
    container = document.createElement('div');
    container.setAttribute('data-toast-container', '');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${variant}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.setAttribute('data-visible', 'true'));

  setTimeout(() => {
    toast.setAttribute('data-visible', 'false');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

export { showToast };