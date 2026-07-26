function showAlertModal(message, title = 'Something went wrong') {
  const existing = document.querySelector('[data-alert-modal]');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('data-alert-modal', '');

  overlay.innerHTML = `
    <div class="modal-card">
      <div class="modal-card__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8V13M12 16H12.01" stroke-linecap="round"/></svg>
      </div>
      <h3>${title}</h3>
      <p>${message}</p>
      <button type="button" class="btn btn--primary" data-alert-ok>OK</button>
    </div>
  `;

  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKeydown);
  }

  function onKeydown(event) {
    if (event.key === 'Escape') close();
  }

  overlay.querySelector('[data-alert-ok]').addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener('keydown', onKeydown);
}

export { showAlertModal };