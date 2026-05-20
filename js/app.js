// ============================================================
// LKB LOCATION — App principale v2.2
// ============================================================

const Pages = window.Pages || {};

const App = {
  async init() {
    showPage('dashboard');
    try {
      const p = await DB.getParametres();
      if (p) Object.assign(SOCIETE, p);
    } catch(e) { console.log('Params load error:', e); }
    try {
      const alertes = await DB.getAlertes();
      document.getElementById('alert-count').textContent = alertes.length;
    } catch(e) {}
    setSyncStatus('synced');
  },
};

document.addEventListener('DOMContentLoaded', () => {
  Auth.init().catch(e => {
    console.error('Auth init error:', e);
  });
});
