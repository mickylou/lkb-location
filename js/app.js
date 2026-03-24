// ============================================================
// LKB LOCATION — App principale
// ============================================================

const Pages = window.Pages || {};

const App = {
  realtimeSubs: [],

  async init() {
    // Render dashboard
    showPage('dashboard');
    // Setup realtime subscriptions
    this.setupRealtime();
    // Update alert count
    try {
      const alertes = await DB.getAlertes();
      document.getElementById('alert-count').textContent = alertes.length;
    } catch(e) {}
  },

  setupRealtime() {
    // Subscribe to key tables for multi-admin sync
    const tables = ['vehicules', 'reservations', 'etats_des_lieux', 'alertes_entretien'];
    tables.forEach(table => {
      const sub = DB.subscribeToChanges(table, (payload) => {
        setSyncStatus('syncing');
        console.log(`[Realtime] ${table} changed:`, payload.eventType);
        // Re-render current page
        const activePage = document.querySelector('.page.active')?.id?.replace('page-','');
        if (activePage) {
          setTimeout(() => {
            if (Pages[activePage]) Pages[activePage]();
            setSyncStatus('synced');
          }, 300);
        }
        // Update alert count on changes
        if (table === 'alertes_entretien') {
          DB.getAlertes().then(a => {
            document.getElementById('alert-count').textContent = a.length;
          }).catch(()=>{});
        }
      });
      this.realtimeSubs.push(sub);
    });
    setSyncStatus('synced');
  },
};

// ============================================================
// App startup
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  Auth.init().catch(e => {
    console.error('Auth init error:', e);
    // If Supabase not configured, show demo mode warning
    if (SUPABASE_URL.includes('VOTRE_PROJECT_ID')) {
      document.getElementById('login-screen').innerHTML = `
        <div class="login-box">
          <div class="login-logo"><svg viewBox="0 0 200 100" width="140" fill="none"><path d="M20 65 Q60 35 100 32 Q140 29 180 45 L190 48 Q170 52 155 58" stroke="#B8952A" stroke-width="3" fill="none" stroke-linecap="round"/><text x="30" y="85" font-family="Georgia,serif" font-size="34" font-weight="700" fill="#B8952A">LKB</text><text x="32" y="98" font-family="Arial,sans-serif" font-size="10" letter-spacing="6" fill="#B8952A">LOCATION</text></svg></div>
          <div class="login-title" style="color:#f87171;">⚠ Configuration requise</div>
          <div style="background:rgba(192,57,43,.15);border:1px solid rgba(192,57,43,.4);padding:14px;border-radius:3px;font-size:12px;color:#fca5a5;margin-bottom:16px;">
            Veuillez renseigner vos credentials Supabase dans <code style="background:#111;padding:2px 6px;border-radius:2px;">js/config.js</code><br><br>
            1. Créez un projet sur <strong>supabase.com</strong><br>
            2. Exécutez <strong>supabase-schema.sql</strong><br>
            3. Copiez votre URL et clé anonyme dans config.js<br>
            4. Créez vos admins via Authentication → Users
          </div>
          <a href="https://supabase.com/dashboard" target="_blank" class="btn btn-gold" style="display:block;text-align:center;text-decoration:none;">Ouvrir Supabase ↗</a>
          <div class="login-footer">LKB Location v2.0 — 2025</div>
        </div>`;
    }
  });
});
