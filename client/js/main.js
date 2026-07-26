import { initNavbar } from './components/navbar.js';

function initPulseNodes() {
  document.querySelectorAll('[data-pulse-target]').forEach((el) => {
    el.addEventListener('click', () => {
      const target = document.querySelector(el.getAttribute('data-pulse-target'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initPulseNodes();
});