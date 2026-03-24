// ============================================================
// PAGE — Véhicules
// ============================================================
Pages.vehicules = async function(filter = 'all') {
  const el = document.getElementById('page-vehicules');
  el.innerHTML = `
  <div style="display:flex;gap:12px;margin-bottom:22px;" class="no-print">
    <button class="btn btn-gold" onclick="openVehiculeForm()">+ Ajouter un véhicule</button>
    <div style="margin-left:auto;display:flex;gap:8px;">
      ${['all','dispo','loue','maint'].map(f=>`<button class="btn btn-outline btn-sm" onclick="Pages.vehicules('${f}')">${{all:'Tous',dispo:'Disponibles',loue:'Loués',maint:'Entretien'}[f]}</button>`).join('')}
    </div>
  </div>
  <div id="veh-grid"><div class="spinner"></div></div>`;

  try {
    let vehicules = await DB.getVehicules();
    if (filter !== 'all') vehicules = vehicules.filter(v => v.statut === filter);
    const carSVG = `<svg viewBox="0 0 100 50" fill="none"><ellipse cx="50" cy="25" rx="42" ry="20" fill="#2a2a2a" stroke="#B8952A" stroke-width=".8"/><ellipse cx="50" cy="25" rx="28" ry="12" fill="#1e3a5f" opacity=".5"/><circle cx="22" cy="18" r="7" fill="#111" stroke="#555" stroke-width="1.5"/><circle cx="78" cy="18" r="7" fill="#111" stroke="#555" stroke-width="1.5"/><circle cx="22" cy="32" r="7" fill="#111" stroke="#555" stroke-width="1.5"/><circle cx="78" cy="32" r="7" fill="#111" stroke="#555" stroke-width="1.5"/></svg>`;
    document.getElementById('veh-grid').innerHTML = vehicules.length === 0
      ? '<p style="color:var(--gray)">Aucun véhicule trouvé.</p>'
      : `<div class="veh-grid">${vehicules.map(v=>`
        <div class="veh-card" onclick="openVehiculeDetail('${v.id}')">
          <div class="veh-card-top">${carSVG}
            <div class="veh-card-status">${pillVeh(v.statut)}</div>
            <div class="veh-card-owner"><span class="pill ${v.type_propriete==='own'?'pill-gold':'pill-blue'}">${v.type_propriete==='own'?'LKB':'Partenaire'}</span></div>
          </div>
          <div class="veh-card-body">
            <div class="veh-card-make">${v.marque}</div>
            <div class="veh-card-name">${v.modele}</div>
            <div class="veh-card-meta">
              <span>🔑 ${v.immatriculation}</span>
              <span>📅 ${v.annee||'—'}</span>
              <span>🏎 ${v.puissance_ch||'—'} ch</span>
              <span>📏 ${fmt.km(v.km_actuel)}</span>
            </div>
            <div class="veh-card-price">${fmt.money(v.tarif_jour)} <span>/ jour · Caution ${fmt.money(v.caution)}</span></div>
            ${v.type_propriete==='sub'?`<div style="font-size:10px;color:var(--gold);margin-top:4px;">Prop: ${v.proprietaires?.nom||'?'} — Reversement: ${v.taux_reversement}%</div>`:''}
          </div>
        </div>`).join('')}</div>`;
  } catch(e) {
    document.getElementById('veh-grid').innerHTML = `<p style="color:#f87171;">Erreur: ${e.message}</p>`;
  }
};

async function openVehiculeDetail(id) {
  const v = await DB.getVehicule(id);
  const html = `<div class="modal-overlay" id="modal-veh-detail" onclick="if(event.target===this)closeModal('modal-veh-detail')">
  <div class="modal" style="max-width:700px;">
    <button class="modal-close" onclick="closeModal('modal-veh-detail')">✕</button>
    <div class="modal-title">${v.marque} ${v.modele}</div>
    <div class="grid-2" style="gap:8px;margin-bottom:16px;">
      <div><span style="font-size:10px;color:var(--gold);letter-spacing:1px;">IMMATRICULATION</span><div style="font-size:16px;font-weight:600;margin-top:2px;">${v.immatriculation}</div></div>
      <div><span style="font-size:10px;color:var(--gold);letter-spacing:1px;">STATUT</span><div style="margin-top:4px;">${pillVeh(v.statut)}</div></div>
      <div><span style="font-size:10px;color:var(--gold);letter-spacing:1px;">KILOMÉTRAGE</span><div style="font-size:20px;font-family:'Cormorant Garamond',serif;color:var(--gold);font-weight:700;">${fmt.km(v.km_actuel)}</div></div>
      <div><span style="font-size:10px;color:var(--gold);letter-spacing:1px;">TARIF</span><div style="font-size:20px;font-family:'Cormorant Garamond',serif;color:var(--gold);font-weight:700;">${fmt.money(v.tarif_jour)}/j</div></div>
    </div>
    <table class="tbl">
      <tbody>
        <tr><td style="color:var(--gray)">Année</td><td>${v.annee}</td><td style="color:var(--gray)">Couleur</td><td>${v.couleur}</td></tr>
        <tr><td style="color:var(--gray)">Carburant</td><td>${v.carburant}</td><td style="color:var(--gray)">Boîte</td><td>${v.boite}</td></tr>
        <tr><td style="color:var(--gray)">Puissance</td><td>${v.puissance_ch} ch</td><td style="color:var(--gray)">Type</td><td>${v.type_propriete==='own'?'Véhicule propre (LKB)':'Sous-location'}</td></tr>
        <tr><td style="color:var(--gray)">Caution</td><td>${fmt.money(v.caution)}</td><td style="color:var(--gray)">KM / jour inclus</td><td>${v.km_limite_par_jour} km</td></tr>
        ${v.type_propriete==='sub'?`<tr><td style="color:var(--gray)">Reversement prop.</td><td colspan="3">${v.taux_reversement}%</td></tr>`:''}
      </tbody>
    </table>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-veh-detail')">Fermer</button>
      <button class="btn btn-outline" onclick="closeModal('modal-veh-detail');showPage('maintenance')">🔧 Entretiens</button>
      <button class="btn btn-gold" onclick="closeModal('modal-veh-detail');openVehiculeForm('${v.id}')">✏ Modifier</button>
    </div>
  </div></div>`;
  openModal(html, 'modal-veh-detail');
}

async function openVehiculeForm(id = null) {
  let v = { type_propriete:'own', carburant:'Essence', boite:'Automatique', km_limite_par_jour:300, km_supplement_eur:2.5, statut:'dispo' };
  if (id) v = await DB.getVehicule(id);
  let props = [];
  try { props = await DB.getProprietaires(); } catch(e) {}
  const html = `<div class="modal-overlay" id="modal-veh-form" onclick="if(event.target===this)closeModal('modal-veh-form')">
  <div class="modal">
    <button class="modal-close" onclick="closeModal('modal-veh-form')">✕</button>
    <div class="modal-title">${id?'Modifier le véhicule':'Ajouter un véhicule'}</div>
    <div class="form-section">
      <div class="form-section-title">Identification</div>
      <div class="form-grid">
        <div class="form-group"><label>Marque</label><input id="vf-marque" value="${v.marque||''}"></div>
        <div class="form-group"><label>Modèle</label><input id="vf-modele" value="${v.modele||''}"></div>
        <div class="form-group"><label>Immatriculation</label><input id="vf-immat" value="${v.immatriculation||''}"></div>
        <div class="form-group"><label>Année</label><input type="number" id="vf-annee" value="${v.annee||''}"></div>
        <div class="form-group"><label>Couleur</label><input id="vf-couleur" value="${v.couleur||''}"></div>
        <div class="form-group"><label>Puissance (ch)</label><input type="number" id="vf-puissance" value="${v.puissance_ch||''}"></div>
        <div class="form-group"><label>Carburant</label><select id="vf-carburant">${['Essence','Diesel','Hybride','Électrique'].map(o=>`<option ${v.carburant===o?'selected':''}>${o}</option>`).join('')}</select></div>
        <div class="form-group"><label>Boîte</label><select id="vf-boite">${['Automatique','Manuelle','Séquentielle'].map(o=>`<option ${v.boite===o?'selected':''}>${o}</option>`).join('')}</select></div>
      </div>
    </div>
    <div class="form-section">
      <div class="form-section-title">Propriété & Tarifs</div>
      <div class="form-grid">
        <div class="form-group"><label>Type</label>
          <select id="vf-type" onchange="document.getElementById('vf-prop-row').style.display=this.value==='sub'?'contents':'none'">
            <option value="own" ${v.type_propriete==='own'?'selected':''}>Véhicule propre (LKB)</option>
            <option value="sub" ${v.type_propriete==='sub'?'selected':''}>Sous-location</option>
          </select>
        </div>
        <div class="form-group" id="vf-prop-row" style="display:${v.type_propriete==='sub'?'flex':'none'};flex-direction:column;gap:5px;">
          <label>Propriétaire</label>
          <select id="vf-prop">${props.map(p=>`<option value="${p.id}" ${v.proprietaire_id===p.id?'selected':''}>${p.nom} ${p.prenom||''}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Reversement (%)</label><input type="number" id="vf-rate" value="${v.taux_reversement||0}" min="0" max="100"></div>
        <div class="form-group"><label>Tarif / jour (€)</label><input type="number" id="vf-tarif" value="${v.tarif_jour||''}"></div>
        <div class="form-group"><label>Caution (€)</label><input type="number" id="vf-caution" value="${v.caution||''}"></div>
        <div class="form-group"><label>KM actuel</label><input type="number" id="vf-km" value="${v.km_actuel||0}"></div>
        <div class="form-group"><label>KM inclus / jour</label><input type="number" id="vf-kmlimit" value="${v.km_limite_par_jour||300}"></div>
        <div class="form-group"><label>Supp. KM (€/km)</label><input type="number" step="0.01" id="vf-kmsup" value="${v.km_supplement_eur||2.5}"></div>
        <div class="form-group"><label>Statut</label>
          <select id="vf-statut">${['dispo','loue','maint','indispo'].map(s=>`<option value="${s}" ${v.statut===s?'selected':''}>${labelStatutVeh[s]}</option>`).join('')}</select>
        </div>
      </div>
    </div>
    <div class="form-group"><label>Notes</label><textarea id="vf-notes">${v.notes||''}</textarea></div>
    <div class="modal-footer">
      ${id?`<button class="btn btn-red btn-sm" onclick="deleteVehicule('${id}')">🗑 Supprimer</button>`:''}
      <button class="btn btn-outline" onclick="closeModal('modal-veh-form')">Annuler</button>
      <button class="btn btn-gold" onclick="saveVehiculeForm('${id||''}')">✓ Enregistrer</button>
    </div>
  </div></div>`;
  openModal(html, 'modal-veh-form');
}

async function saveVehiculeForm(id) {
  const data = {
    marque: document.getElementById('vf-marque').value,
    modele: document.getElementById('vf-modele').value,
    immatriculation: document.getElementById('vf-immat').value,
    annee: parseInt(document.getElementById('vf-annee').value)||null,
    couleur: document.getElementById('vf-couleur').value,
    puissance_ch: parseInt(document.getElementById('vf-puissance').value)||null,
    carburant: document.getElementById('vf-carburant').value,
    boite: document.getElementById('vf-boite').value,
    type_propriete: document.getElementById('vf-type').value,
    taux_reversement: parseFloat(document.getElementById('vf-rate').value)||0,
    tarif_jour: parseFloat(document.getElementById('vf-tarif').value),
    caution: parseFloat(document.getElementById('vf-caution').value),
    km_actuel: parseInt(document.getElementById('vf-km').value)||0,
    km_limite_par_jour: parseInt(document.getElementById('vf-kmlimit').value)||300,
    km_supplement_eur: parseFloat(document.getElementById('vf-kmsup').value)||2.5,
    statut: document.getElementById('vf-statut').value,
    notes: document.getElementById('vf-notes').value,
  };
  if (data.type_propriete === 'sub') {
    const propEl = document.getElementById('vf-prop');
    if (propEl) data.proprietaire_id = propEl.value || null;
  }
  if (id) data.id = id;
  try {
    setSyncStatus('syncing');
    await DB.saveVehicule(data);
    setSyncStatus('synced');
    closeModal('modal-veh-form');
    toast(id ? 'Véhicule mis à jour' : 'Véhicule ajouté', 'success');
    Pages.vehicules();
  } catch(e) {
    setSyncStatus('offline');
    toast('Erreur: ' + e.message, 'error');
  }
}

async function deleteVehicule(id) {
  if (!confirm('Supprimer ce véhicule ? Cette action est irréversible.')) return;
  try {
    await DB.deleteVehicule(id);
    closeModal('modal-veh-form');
    toast('Véhicule supprimé', 'success');
    Pages.vehicules();
  } catch(e) { toast('Erreur: ' + e.message, 'error'); }
}
