function initPasswordToggles() {
  document.querySelectorAll('[data-password-toggle]').forEach((button) => {
    const input = button.previousElementSibling;

    button.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      button.setAttribute('data-visible', String(isHidden));
    });
  });
}

export { initPasswordToggles };