// ============================================================
// PAGE — Paramètres (avec sauvegarde Supabase)
// ============================================================
Pages.parametres = async function() {
  const el = document.getElementById('page-parametres');
  el.innerHTML = `<div class="spinner"></div>`;
  
  // Charger les paramètres depuis Supabase
  let p = {};
  try { p = await DB.getParametres() || {}; } catch(e) {}
  
  // Mettre à jour SOCIETE global
  if (p.nom) Object.assign(SOCIETE, p);

  el.innerHTML = `
  <div class="grid-2">
    <div class="card">
      <div class="card-title" style="margin-bottom:16px;">Informations société <small>Utilisées sur les documents imprimés</small></div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div class="form-group"><label>Nom société</label><input id="soc-nom" value="${p.nom||SOCIETE.nom||''}"></div>
        <div class="form-group"><label>SIRET</label><input id="soc-siret" value="${p.siret||SOCIETE.siret||''}"></div>
        <div class="form-group"><label>Adresse</label><input id="soc-adresse" value="${p.adresse||SOCIETE.adresse||''}"></div>
        <div class="form-group"><label>Code postal</label><input id="soc-cp" value="${p.cp||SOCIETE.cp||''}"></div>
        <div class="form-group"><label>Ville</label><input id="soc-ville" value="${p.ville||SOCIETE.ville||''}"></div>
        <div class="form-group"><label>Email</label><input type="email" id="soc-email" value="${p.email||SOCIETE.email||''}"></div>
        <div class="form-group"><label>Téléphone</label><input id="soc-tel" value="${p.tel||SOCIETE.tel||''}"></div>
        <div class="form-group"><label>IBAN</label><input id="soc-iban" value="${p.iban||SOCIETE.iban||''}"></div>
        <div class="form-group"><label>TVA intracommunautaire</label><input id="soc-tva" value="${p.tva_intracom||SOCIETE.tva_intracom||''}"></div>
        <div class="form-group"><label>Taux TVA (%)</label><input type="number" id="soc-taux" value="${p.taux_tva||SOCIETE.taux_tva||20}"></div>
        <button class="btn btn-gold" onclick="_saveSociete()">✓ Enregistrer</button>
        ${p.updated_at ? `<div style="font-size:10px;color:var(--gray);margin-top:4px;">Dernière sauvegarde: ${fmt.dateTime(p.updated_at)}</div>` : ''}
      </div>
    </div>
    <div class="card">
      <div class="card-title" style="margin-bottom:16px;">Gestion des accès</div>
      <p style="color:var(--gray);font-size:13px;margin-bottom:16px;">Les administrateurs sont gérés via votre dashboard Supabase → Authentication → Users.</p>
      <a href="https://supabase.com/dashboard" target="_blank" class="btn btn-outline" style="display:inline-block;text-decoration:none;">Ouvrir Supabase Dashboard ↗</a>
      <hr class="sec-divider">
      <div class="card-title" style="margin-bottom:12px;font-size:16px;">Informations système</div>
      <div style="font-size:12px;color:#aaa;">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1e1e1e;"><span>Version</span><span style="color:var(--gold)">LKB Location v2.1</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1e1e1e;"><span>Connecté en tant que</span><span style="color:var(--gold)">${Auth.currentUser?.email||'—'}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;"><span>Base de données</span><span style="color:#4ade80">● Connectée</span></div>
      </div>
    </div>
  </div>`;
};

async function _saveSociete() {
  const data = {
    nom: document.getElementById('soc-nom').value,
    siret: document.getElementById('soc-siret').value,
    adresse: document.getElementById('soc-adresse').value,
    cp: document.getElementById('soc-cp').value,
    ville: document.getElementById('soc-ville').value,
    email: document.getElementById('soc-email').value,
    tel: document.getElementById('soc-tel').value,
    iban: document.getElementById('soc-iban').value,
    tva_intracom: document.getElementById('soc-tva').value,
    taux_tva: parseFloat(document.getElementById('soc-taux').value)||20,
  };
  try {
    setSyncStatus('syncing');
    await DB.saveParametres(data);
    // Mettre à jour SOCIETE global
    Object.assign(SOCIETE, data);
    setSyncStatus('synced');
    toast('Paramètres sauvegardés ✓', 'success');
    Pages.parametres();
  } catch(e) {
    setSyncStatus('offline');
    toast('Erreur: ' + e.message, 'error');
  }
}
