// ============================================================
// LKB LOCATION — Authentification
// ============================================================

const Auth = {
  currentUser: null,

  async init() {
    // Attend que supabase soit initialisé
    let waited = 0;
    while (!supabase && waited < 5000) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
    }
    if (!supabase) {
      document.getElementById('login-screen').style.display = 'flex';
      document.getElementById('login-error').textContent = 'Erreur: impossible de contacter Supabase.';
      document.getElementById('login-error').style.display = 'block';
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        this.currentUser = session.user;
        this.onLogin();
      } else {
        document.getElementById('login-screen').style.display = 'flex';
      }
    } catch(e) {
      document.getElementById('login-screen').style.display = 'flex';
    }
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) { this.currentUser = session.user; this.onLogin(); }
      if (event === 'SIGNED_OUT') { this.onLogout(); }
    });
  },

  onLogin() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    document.getElementById('current-admin').textContent = this.currentUser?.email || '';
    App.init();
  },

  onLogout() {
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('login-error').style.display = 'none';
  }
};

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn = document.querySelector('#login-screen .btn-gold');
  errEl.style.display = 'none';
  if (!email || !password) {
    errEl.textContent = 'Veuillez remplir tous les champs.';
    errEl.style.display = 'block';
    return;
  }
  // Attend que supabase soit prêt
  let waited = 0;
  while (!supabase && waited < 5000) {
    await new Promise(r => setTimeout(r, 100));
    waited += 100;
  }
  if (!supabase) {
    errEl.textContent = 'Erreur: Supabase non disponible. Vérifiez votre connexion internet.';
    errEl.style.display = 'block';
    return;
  }
  btn.textContent = 'Connexion...';
  btn.disabled = true;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      errEl.textContent = 'Email ou mot de passe incorrect.';
      errEl.style.display = 'block';
      btn.textContent = 'Se connecter';
      btn.disabled = false;
    } else if (data?.user) {
      Auth.currentUser = data.user;
      Auth.onLogin();
    }
  } catch(e) {
    errEl.textContent = 'Erreur de connexion: ' + e.message;
    errEl.style.display = 'block';
    btn.textContent = 'Se connecter';
    btn.disabled = false;
  }
}

async function doLogout() {
  if (supabase) await supabase.auth.signOut();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
});
