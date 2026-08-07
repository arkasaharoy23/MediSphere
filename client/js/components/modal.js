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

function showPromptModal({ title = 'Are you sure?', message = '', placeholder = '', confirmLabel = 'Confirm', tone = 'primary' } = {}) {
  return new Promise((resolve) => {
    const existing = document.querySelector('[data-prompt-modal]');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('data-prompt-modal', '');

    overlay.innerHTML = `
      <div class="modal-card modal-card--prompt">
        <div class="modal-card__icon${tone === 'danger' ? ' modal-card__icon--danger' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke-linejoin="round"/></svg>
        </div>
        <h3>${title}</h3>
        ${message ? `<p>${message}</p>` : ''}
        <textarea class="modal-card__input" data-prompt-input placeholder="${placeholder}" rows="3"></textarea>
        <span class="modal-card__error" data-prompt-error>This field can't be empty</span>
        <div class="modal-card__actions">
          <button type="button" class="btn btn--ghost" data-prompt-cancel>Cancel</button>
          <button type="button" class="btn btn--${tone === 'danger' ? 'coral' : 'primary'}" data-prompt-confirm>${confirmLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('[data-prompt-input]');
    const errorEl = overlay.querySelector('[data-prompt-error]');
    requestAnimationFrame(() => input.focus());

    function close(result) {
      overlay.remove();
      document.removeEventListener('keydown', onKeydown);
      resolve(result);
    }

    function confirm() {
      const value = input.value.trim();
      if (!value) {
        errorEl.classList.add('modal-card__error--visible');
        input.classList.add('modal-card__input--error');
        input.focus();
        return;
      }
      close(value);
    }

    function onKeydown(event) {
      if (event.key === 'Escape') close(null);
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) confirm();
    }

    input.addEventListener('input', () => {
      errorEl.classList.remove('modal-card__error--visible');
      input.classList.remove('modal-card__input--error');
    });

    overlay.querySelector('[data-prompt-cancel]').addEventListener('click', () => close(null));
    overlay.querySelector('[data-prompt-confirm]').addEventListener('click', confirm);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close(null);
    });
    document.addEventListener('keydown', onKeydown);
  });
}

export { showAlertModal, showPromptModal };