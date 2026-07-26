import { initAdminPage } from './adminGuard.js';
import { initProviderReviewPage } from './providerReview.js';

document.addEventListener('DOMContentLoaded', () => {
  initAdminPage(() => initProviderReviewPage('hospital'));
});