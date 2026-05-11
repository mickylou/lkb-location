// ============================================================
// LKB LOCATION — App principale
// ============================================================

const Pages = window.Pages || {};

// Inputs fichier globaux accessibles partout
function _initGlobalFileInputs() {
  // Supprimer anciens si existent
  ['global-file-input','global-camera-input'].forEach(id => {
    const old = document.getElementById(id);
    if (old) old.remove();
  });
  const fi = document.createElement('input');
  fi.type = 'file'; fi.id = 'global-file-input'; fi.accept = 'image/*'; fi.style.display = 'none';
  fi.onchange = function() { _globalFileHandler(this); };
  document.body.appendChild(fi);

  const ci = document.createElement('input');
  ci.type = 'file'; ci.id = 'global-camera-input'; ci.accept = 'image/*'; ci.setAttribute('capture','environment'); ci.style.display = 'none';
  ci.onchange = function() { _globalFileHandler(this); };
  document.body.appendChild(ci);
}

window._uploadContext = null;

function _triggerUpload(context, useCamera = false) {
  window._uploadContext = context;
  const input = useCamera
    ? document.getElementById('global-camera-input')
    : document.getElementById('global-file-input');
  if (input) { input.value = ''; input.click(); }
}

async function _globalFileHandler(input) {
  const file = input.files[0];
  if (!file || !window._uploadContext) return;
  const ctx = window._uploadContext;
  window._uploadContext = null;

  if (ctx.type === 'veh-photo') {
    await _doUploadVehPhoto(ctx.vehiculeId, file);
  } else if (ctx.type === 'degat-face') {
    await _doUploadDegaFace(ctx.vehiculeId, ctx.face, file);
  } else if (ctx.type === 'degat-photo') {
    await _doUploadDegaPhoto(ctx.degatId, file);
  } else if (ctx.type === 'edl-face') {
    await _edlHandleFaceFile(file);
  } else if (ctx.type === 'edl-damage-photo') {
    await _edlHandleDamagePhoto(ctx.damageId, file);
  }
}

const App = {
  realtimeSubs: [],

  async init() {
    _initGlobalFileInputs();
    showPage('dashboard');
    this.setupRealtime();
    try {
      // Charger paramètres société
      const p = await DB.getParametres();
      if (p) Object.assign(SOCIETE, p);
    } catch(e) {}
    try {
      const alertes = await DB.getAlertes();
      document.getElementById('alert-count').textContent = alertes.length;
    } catch(e) {}
  },

  setupRealtime() {
    const tables = ['vehicules','reservations','etats_des_lieux','alertes_entretien'];
    tables.forEach(table => {
      const sub = DB.subscribeToChanges(table, (payload) => {
        setSyncStatus('syncing');
        const activePage = document.querySelector('.page.active')?.id?.replace('page-','');
        if (activePage) {
          setTimeout(() => {
            if (Pages[activePage]) Pages[activePage]();
            setSyncStatus('synced');
          }, 300);
        }
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

document.addEventListener('DOMContentLoaded', () => {
  Auth.init().catch(e => {
    console.error('Auth init error:', e);
    if (SUPABASE_URL.includes('VOTRE_PROJECT_ID') || SUPABASE_URL.includes('REMPLACER')) {
      document.getElementById('login-screen').innerHTML = `
        <div class="login-box">
          <div class="login-logo"><svg viewBox="0 0 200 100" width="140" fill="none"><path d="M20 65 Q60 35 100 32 Q140 29 180 45 L190 48 Q170 52 155 58" stroke="#B8952A" stroke-width="3" fill="none" stroke-linecap="round"/><text x="30" y="85" font-family="Georgia,serif" font-size="34" font-weight="700" fill="#B8952A">LKB</text><text x="32" y="98" font-family="Arial,sans-serif" font-size="10" letter-spacing="6" fill="#B8952A">LOCATION</text></svg></div>
          <div class="login-title" style="color:#f87171;">⚠ Configuration requise</div>
          <div style="background:rgba(192,57,43,.15);border:1px solid rgba(192,57,43,.4);padding:14px;border-radius:3px;font-size:12px;color:#fca5a5;margin-bottom:16px;">
            Veuillez configurer js/config.js avec vos credentials Supabase.
          </div>
        </div>`;
    }
  });
});
