// ============================================================
// PAGE — Maintenance
// ============================================================
Pages.maintenance = async function() {
  const el = document.getElementById('page-maintenance');
  el.innerHTML = `
  <div style="display:flex;gap:12px;margin-bottom:20px;" class="no-print">
    <button class="btn btn-gold" onclick="_openMaintenanceForm()">+ Ajouter intervention</button>
    <button class="btn btn-outline" onclick="_openAlerteForm()">+ Nouvelle alerte</button>
  </div>
  <div class="grid-2">
    <div class="card" id="alertes-card"><div class="spinner"></div></div>
    <div class="card" id="hist-card"><div class="spinner"></div></div>
  </div>`;
  try {
    const [alertes, maintenances, vehicules] = await Promise.all([DB.getAlertes(), DB.getMaintenances(), DB.getVehicules()]);
    document.getElementById('alertes-card').innerHTML = `
      <div class="card-header"><div class="card-title">Alertes entretien <small>En attente</small></div></div>
      ${alertes.length === 0 ? '<p style="color:var(--gray);font-size:13px;">Aucune alerte.</p>' :
        alertes.map(a => {
          const isUrgent = a.echeance_date && new Date(a.echeance_date) < new Date();
          return `<div class="alert alert-${isUrgent?'red':'orange'}">
            <div style="flex:1"><strong>${a.vehicules?.marque} ${a.vehicules?.modele}</strong> — ${a.type}<br>
            <small>${a.echeance_date?'📅 '+fmt.date(a.echeance_date):''}${a.echeance_km?' · 📏 '+fmt.km(a.echeance_km):''}</small></div>
            <span class="pill ${isUrgent?'pill-red':'pill-orange'}">${isUrgent?'URGENT':'Proche'}</span>
          </div>`;}).join('')}`;
    document.getElementById('hist-card').innerHTML = `
      <div class="card-header"><div class="card-title">Historique interventions <small>Toutes</small></div></div>
      <table class="tbl"><thead><tr><th>Date</th><th>Véhicule</th><th>Type</th><th>Prestataire</th><th>KM</th><th>Coût TTC</th></tr></thead>
      <tbody>${maintenances.map(m=>`<tr>
        <td>${fmt.date(m.date_intervention)}</td>
        <td>${m.vehicules?.marque} ${m.vehicules?.modele}</td>
        <td><span class="pill pill-gray">${m.type_intervention}</span></td>
        <td>${m.prestataire||'—'}</td>
        <td>${fmt.km(m.km_intervention)}</td>
        <td style="color:var(--gold);font-weight:600">${fmt.money(m.cout_ttc)}</td>
      </tr>`).join('')}</tbody></table>`;
  } catch(e) { el.innerHTML = `<p style="color:#f87171;">Erreur: ${e.message}</p>`; }
};

async function _openMaintenanceForm() {
  let vehicules = [];
  try { vehicules = await DB.getVehicules(); } catch(e) {}
  const html = `<div class="modal-overlay" id="modal-maint" onclick="if(event.target===this)closeModal('modal-maint')">
  <div class="modal" style="max-width:600px;">
    <button class="modal-close" onclick="closeModal('modal-maint')">✕</button>
    <div class="modal-title">Ajouter une intervention</div>
    <div class="form-grid">
      <div class="form-group"><label>Véhicule</label><select id="mf-veh">${vehicules.map(v=>`<option value="${v.id}">${v.marque} ${v.modele}</option>`).join('')}</select></div>
      <div class="form-group"><label>Type</label><select id="mf-type"><option>Révision</option><option>Pneus</option><option>Freins</option><option>Contrôle technique</option><option>Carrosserie</option><option>Électronique</option><option>Autre</option></select></div>
      <div class="form-group"><label>Date</label><input type="date" id="mf-date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label>Prestataire</label><input id="mf-prest" placeholder="Nom du garage"></div>
      <div class="form-group"><label>KM au compteur</label><input type="number" id="mf-km"></div>
      <div class="form-group"><label>Coût HT (€)</label><input type="number" step="0.01" id="mf-ht"></div>
      <div class="form-group"><label>Coût TTC (€)</label><input type="number" step="0.01" id="mf-ttc"></div>
      <div class="form-group"><label>Réf. facture</label><input id="mf-ref"></div>
      <div class="form-group form-row-full"><label>Description</label><textarea id="mf-desc"></textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-maint')">Annuler</button>
      <button class="btn btn-gold" onclick="_saveMaintenance()">✓ Enregistrer</button>
    </div>
  </div></div>`;
  openModal(html, 'modal-maint');
}

async function _saveMaintenance() {
  const data = {
    vehicule_id: document.getElementById('mf-veh').value,
    type_intervention: document.getElementById('mf-type').value,
    date_intervention: document.getElementById('mf-date').value,
    prestataire: document.getElementById('mf-prest').value,
    km_intervention: parseInt(document.getElementById('mf-km').value)||null,
    cout_ht: parseFloat(document.getElementById('mf-ht').value)||null,
    cout_ttc: parseFloat(document.getElementById('mf-ttc').value)||null,
    facture_ref: document.getElementById('mf-ref').value,
    description: document.getElementById('mf-desc').value,
  };
  try {
    setSyncStatus('syncing');
    await DB.saveMaintenance(data);
    // Add to compta
    if (data.cout_ttc) await DB.addEcriture({ date_operation: data.date_intervention, libelle: `${data.type_intervention} — ${data.vehicule_id}`, categorie: 'Entretien', reference: data.facture_ref, debit: data.cout_ttc, vehicule_id: data.vehicule_id });
    setSyncStatus('synced');
    closeModal('modal-maint'); toast('Intervention enregistrée', 'success'); Pages.maintenance();
  } catch(e) { setSyncStatus('offline'); toast('Erreur: ' + e.message, 'error'); }
}

async function _openAlerteForm() {
  let vehicules = [];
  try { vehicules = await DB.getVehicules(); } catch(e) {}
  const html = `<div class="modal-overlay" id="modal-alerte" onclick="if(event.target===this)closeModal('modal-alerte')">
  <div class="modal" style="max-width:500px;">
    <button class="modal-close" onclick="closeModal('modal-alerte')">✕</button>
    <div class="modal-title">Nouvelle alerte entretien</div>
    <div class="form-grid">
      <div class="form-group"><label>Véhicule</label><select id="af-veh">${vehicules.map(v=>`<option value="${v.id}">${v.marque} ${v.modele}</option>`).join('')}</select></div>
      <div class="form-group"><label>Type</label><input id="af-type" placeholder="ex: Contrôle technique"></div>
      <div class="form-group"><label>Échéance (date)</label><input type="date" id="af-date"></div>
      <div class="form-group"><label>Échéance (km)</label><input type="number" id="af-km" placeholder="optionnel"></div>
      <div class="form-group form-row-full"><label>Notes</label><textarea id="af-notes"></textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-alerte')">Annuler</button>
      <button class="btn btn-gold" onclick="_saveAlerte()">✓ Enregistrer</button>
    </div>
  </div></div>`;
  openModal(html, 'modal-alerte');
}

async function _saveAlerte() {
  try {
    await DB.saveAlerte({ vehicule_id: document.getElementById('af-veh').value, type: document.getElementById('af-type').value, echeance_date: document.getElementById('af-date').value||null, echeance_km: parseInt(document.getElementById('af-km').value)||null, notes: document.getElementById('af-notes').value });
    closeModal('modal-alerte'); toast('Alerte créée', 'success'); Pages.maintenance();
    document.getElementById('alert-count').textContent = parseInt(document.getElementById('alert-count').textContent||'0') + 1;
  } catch(e) { toast('Erreur: ' + e.message, 'error'); }
}

// ============================================================
// PAGE — Comptabilité
// ============================================================
Pages._comptaMois = new Date().getMonth() + 1;
Pages._comptaAnnee = new Date().getFullYear();
Pages.comptabilite = async function() {
  const el = document.getElementById('page-comptabilite');
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  el.innerHTML = `
  <div style="display:flex;gap:12px;align-items:center;margin-bottom:20px;" class="no-print">
    <button class="btn btn-gold" onclick="_openEcritureForm()">+ Écriture manuelle</button>
    <button class="btn btn-outline" onclick="_exportCompta()">📥 Export CSV</button>
    <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
      <select id="compta-mois" onchange="Pages._comptaMois=parseInt(this.value);Pages.comptabilite()" style="background:var(--dark3);border:1px solid #333;border-radius:3px;padding:8px 12px;color:var(--white);font-size:12px;">
        ${months.map((m,i)=>`<option value="${i+1}" ${Pages._comptaMois===i+1?'selected':''}>${m}</option>`).join('')}
      </select>
      <select id="compta-an" onchange="Pages._comptaAnnee=parseInt(this.value);Pages.comptabilite()" style="background:var(--dark3);border:1px solid #333;border-radius:3px;padding:8px 12px;color:var(--white);font-size:12px;">
        ${[2024,2025,2026].map(y=>`<option ${Pages._comptaAnnee===y?'selected':''}>${y}</option>`).join('')}
      </select>
    </div>
  </div>
  <div id="compta-content"><div class="spinner"></div></div>`;
  try {
    const journal = await DB.getJournal(Pages._comptaMois, Pages._comptaAnnee);
    const ca = journal.reduce((s,e)=>s+(e.credit||0),0);
    const charges = journal.reduce((s,e)=>s+(e.debit||0),0);
    const net = ca - charges;
    document.getElementById('compta-content').innerHTML = `
    <div class="grid-3" style="margin-bottom:20px;">
      <div class="stat-card"><div class="val" style="color:#4ade80">${fmt.money(ca)}</div><div class="lbl">Recettes</div></div>
      <div class="stat-card"><div class="val" style="color:#f87171">${fmt.money(charges)}</div><div class="lbl">Dépenses</div></div>
      <div class="stat-card"><div class="val" style="color:${net>=0?'#4ade80':'#f87171'}">${fmt.money(net)}</div><div class="lbl">Résultat net</div></div>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">Journal comptable <small>${months[Pages._comptaMois-1]} ${Pages._comptaAnnee}</small></div>
        <button class="btn btn-outline btn-sm" onclick="window.print()">🖨 Imprimer</button>
      </div>
      ${journal.length === 0 ? '<p style="color:var(--gray);font-size:13px;">Aucune écriture ce mois.</p>' :
        `<table class="tbl"><thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th>Référence</th><th>Débit</th><th>Crédit</th><th>Solde</th></tr></thead>
        <tbody>${(() => { let solde = 0; return journal.map(e => { solde += (e.credit||0)-(e.debit||0); return `<tr>
          <td>${fmt.date(e.date_operation)}</td><td>${e.libelle}</td>
          <td><span class="pill pill-gray">${e.categorie||'—'}</span></td>
          <td style="color:var(--gold);font-size:11px">${e.reference||'—'}</td>
          <td>${e.debit?`<span class="compta-debit">-${fmt.money(e.debit)}</span>`:''}</td>
          <td>${e.credit?`<span class="compta-credit">+${fmt.money(e.credit)}</span>`:''}</td>
          <td style="font-weight:600;color:${solde>=0?'#4ade80':'#f87171'}">${fmt.money(solde)}</td>
        </tr>`; }).join(''); })()}</tbody>
        <tfoot><tr><td colspan="4" style="padding:10px 13px;font-weight:700;font-size:13px;border-top:2px solid var(--gold);">TOTAUX</td><td style="padding:10px 13px;border-top:2px solid var(--gold);"><span class="compta-debit">-${fmt.money(charges)}</span></td><td style="padding:10px 13px;border-top:2px solid var(--gold);"><span class="compta-credit">+${fmt.money(ca)}</span></td><td style="padding:10px 13px;border-top:2px solid var(--gold);font-weight:700;color:${net>=0?'#4ade80':'#f87171'}">${fmt.money(net)}</td></tr></tfoot>
        </table>`}
    </div>`;
  } catch(e) { document.getElementById('compta-content').innerHTML = `<p style="color:#f87171;">Erreur: ${e.message}</p>`; }
};

async function _openEcritureForm() {
  const html = `<div class="modal-overlay" id="modal-ecriture" onclick="if(event.target===this)closeModal('modal-ecriture')">
  <div class="modal" style="max-width:550px;">
    <button class="modal-close" onclick="closeModal('modal-ecriture')">✕</button>
    <div class="modal-title">Écriture manuelle</div>
    <div class="form-grid">
      <div class="form-group"><label>Date</label><input type="date" id="ef-date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label>Catégorie</label><select id="ef-cat"><option>Location</option><option>Entretien</option><option>Assurance</option><option>Propriétaire</option><option>Carburant</option><option>Divers</option></select></div>
      <div class="form-group form-row-full"><label>Libellé</label><input id="ef-lib" placeholder="Description de l'écriture"></div>
      <div class="form-group"><label>Référence</label><input id="ef-ref" placeholder="N° facture, contrat..."></div>
      <div class="form-group"><label>Type</label><select id="ef-type"><option value="credit">Recette (+)</option><option value="debit">Dépense (-)</option></select></div>
      <div class="form-group"><label>Montant (€)</label><input type="number" step="0.01" id="ef-montant"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-ecriture')">Annuler</button>
      <button class="btn btn-gold" onclick="_saveEcriture()">✓ Enregistrer</button>
    </div>
  </div></div>`;
  openModal(html, 'modal-ecriture');
}

async function _saveEcriture() {
  const type = document.getElementById('ef-type').value;
  const montant = parseFloat(document.getElementById('ef-montant').value)||0;
  try {
    await DB.addEcriture({ date_operation: document.getElementById('ef-date').value, libelle: document.getElementById('ef-lib').value, categorie: document.getElementById('ef-cat').value, reference: document.getElementById('ef-ref').value, debit: type==='debit'?montant:0, credit: type==='credit'?montant:0 });
    closeModal('modal-ecriture'); toast('Écriture ajoutée', 'success'); Pages.comptabilite();
  } catch(e) { toast('Erreur: ' + e.message, 'error'); }
}

async function _exportCompta() {
  try {
    const journal = await DB.getJournal(Pages._comptaMois, Pages._comptaAnnee);
    const csv = ['Date,Libellé,Catégorie,Référence,Débit,Crédit', ...journal.map(e=>`${e.date_operation},"${e.libelle}",${e.categorie||''},${e.reference||''},${e.debit||''},${e.credit||''}`)].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})); a.download = `lkb-compta-${Pages._comptaMois}-${Pages._comptaAnnee}.csv`; a.click();
  } catch(e) { toast('Erreur export: ' + e.message, 'error'); }
}

// ============================================================
// PAGE — Facturation
// ============================================================
Pages.facturation = async function() {
  const el = document.getElementById('page-facturation');
  el.innerHTML = `
  <div style="display:flex;gap:12px;margin-bottom:20px;" class="no-print">
    <button class="btn btn-gold" onclick="toast('Sélectionnez une réservation clôturée pour générer','info')">+ Nouvelle facture</button>
  </div>
  <div class="card" id="factures-card"><div class="spinner"></div></div>`;
  try {
    const factures = await DB.getFactures();
    const pillFact = { brouillon:'pill-gray', emise:'pill-blue', payee:'pill-green', annulee:'pill-red' };
    const labelFact = { brouillon:'Brouillon', emise:'Envoyée', payee:'Payée', annulee:'Annulée' };
    document.getElementById('factures-card').innerHTML = factures.length === 0
      ? '<p style="color:var(--gray);font-size:13px;">Aucune facture.</p>'
      : `<table class="tbl"><thead><tr><th>N° Facture</th><th>Client</th><th>Contrat</th><th>Date</th><th>HT</th><th>TVA</th><th>TTC</th><th>Statut</th><th class="no-print">Actions</th></tr></thead>
      <tbody>${factures.map(f=>`<tr>
        <td style="color:var(--gold);font-weight:600">${f.id}</td>
        <td>${f.clients?.nom||'?'} ${f.clients?.prenom||''}</td>
        <td style="color:var(--gold);font-size:11px">${f.reservation_id||'—'}</td>
        <td>${fmt.date(f.date_emission)}</td>
        <td>${fmt.money(f.montant_ht)}</td>
        <td>${fmt.money(f.tva)}</td>
        <td style="font-weight:600">${fmt.money(f.montant_ttc)}</td>
        <td><span class="pill ${pillFact[f.statut]||'pill-gray'}">${labelFact[f.statut]||f.statut}</span></td>
        <td class="no-print">
          <button class="btn btn-sm btn-outline" onclick="_printContrat('${f.reservation_id}')">🖨 PDF</button>
          <button class="btn btn-sm btn-green" onclick="_markPaid('${f.id}')">✓ Payée</button>
        </td>
      </tr>`).join('')}</tbody></table>`;
  } catch(e) { document.getElementById('factures-card').innerHTML = `<p style="color:#f87171;">Erreur: ${e.message}</p>`; }
};

async function _markPaid(id) {
  try {
    await DB.saveFacture({ id, statut: 'payee' });
    toast('Facture marquée payée', 'success'); Pages.facturation();
  } catch(e) { toast('Erreur: ' + e.message, 'error'); }
}

// ============================================================
// PAGE — Propriétaires
// ============================================================
Pages.proprietaires = async function() {
  const el = document.getElementById('page-proprietaires');
  el.innerHTML = `
  <div style="display:flex;gap:12px;margin-bottom:20px;" class="no-print">
    <button class="btn btn-gold" onclick="_openPropForm()">+ Ajouter propriétaire</button>
  </div>
  <div id="prop-list"><div class="spinner"></div></div>`;
  try {
    const props = await DB.getProprietaires();
    document.getElementById('prop-list').innerHTML = `<div class="card"><table class="tbl">
      <thead><tr><th>Propriétaire</th><th>Contact</th><th>Véhicules mis à disposition</th><th>IBAN</th><th class="no-print">Actions</th></tr></thead>
      <tbody>${props.map(p=>`<tr>
        <td><div style="font-weight:600">${p.nom} ${p.prenom||''}</div></td>
        <td><div>${p.email||'—'}</div><div style="font-size:11px;color:var(--gray)">${p.telephone||''}</div></td>
        <td>${p.vehicules?.map(v=>`<span class="pill pill-blue" style="margin-right:4px;">${v.marque} ${v.modele}</span>`).join('')||'Aucun'}</td>
        <td style="font-size:11px;color:var(--gray);font-family:monospace">${p.iban||'—'}</td>
        <td class="no-print">
          <button class="btn btn-sm btn-outline" onclick="_openPropForm('${p.id}')">✏</button>
          <button class="btn btn-sm btn-gold" onclick="_printCompteRendu('${p.id}')">📄 Relevé</button>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  } catch(e) { document.getElementById('prop-list').innerHTML = `<p style="color:#f87171;">Erreur: ${e.message}</p>`; }
};

async function _openPropForm(id = null) {
  let p = {};
  if (id) try { const props = await DB.getProprietaires(); p = props.find(x=>x.id===id)||{}; } catch(e){}
  const html = `<div class="modal-overlay" id="modal-prop" onclick="if(event.target===this)closeModal('modal-prop')">
  <div class="modal" style="max-width:600px;">
    <button class="modal-close" onclick="closeModal('modal-prop')">✕</button>
    <div class="modal-title">${id?'Modifier':'Ajouter'} propriétaire partenaire</div>
    <div class="form-grid">
      <div class="form-group"><label>Nom</label><input id="pf-nom" value="${p.nom||''}"></div>
      <div class="form-group"><label>Prénom</label><input id="pf-prenom" value="${p.prenom||''}"></div>
      <div class="form-group"><label>Email</label><input type="email" id="pf-email" value="${p.email||''}"></div>
      <div class="form-group"><label>Téléphone</label><input id="pf-tel" value="${p.telephone||''}"></div>
      <div class="form-group form-row-full"><label>Adresse</label><input id="pf-adr" value="${p.adresse||''}"></div>
      <div class="form-group form-row-full"><label>IBAN</label><input id="pf-iban" value="${p.iban||''}" placeholder="FR76 XXXX..."></div>
      <div class="form-group form-row-full"><label>Notes</label><textarea id="pf-notes">${p.notes||''}</textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-prop')">Annuler</button>
      <button class="btn btn-gold" onclick="_saveProp('${id||''}')">✓ Enregistrer</button>
    </div>
  </div></div>`;
  openModal(html, 'modal-prop');
}

async function _saveProp(id) {
  const data = { nom: document.getElementById('pf-nom').value, prenom: document.getElementById('pf-prenom').value, email: document.getElementById('pf-email').value, telephone: document.getElementById('pf-tel').value, adresse: document.getElementById('pf-adr').value, iban: document.getElementById('pf-iban').value, notes: document.getElementById('pf-notes').value };
  if (id) data.id = id;
  try {
    setSyncStatus('syncing');
    await DB.saveProprietaire(data);
    setSyncStatus('synced'); closeModal('modal-prop'); toast('Propriétaire enregistré', 'success'); Pages.proprietaires();
  } catch(e) { setSyncStatus('offline'); toast('Erreur: ' + e.message, 'error'); }
}

async function _printCompteRendu(propId) {
  const props = await DB.getProprietaires();
  const p = props.find(x=>x.id===propId);
  const reservations = await DB.getReservations();
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const now = new Date();
  printDoc(`<div style="padding:20px 30px;font-family:Montserrat,sans-serif;color:#111;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #B8952A;">
      <div><div style="font-family:Georgia,serif;font-size:22px;color:#B8952A;font-weight:700;">LKB LOCATION</div><div style="font-size:11px;color:#666;">Compte rendu propriétaire partenaire</div></div>
      <div style="text-align:right;"><div style="background:#27AE60;color:#fff;padding:6px 16px;font-size:10px;letter-spacing:2px;font-weight:700;">RELEVÉ DE COMPTE</div><div style="margin-top:6px;font-size:12px;font-weight:600;">${p?.nom} ${p?.prenom||''}</div><div style="font-size:11px;color:#666;">${months[now.getMonth()]} ${now.getFullYear()}</div></div>
    </div>
    <p style="font-size:11px;margin-bottom:16px;">Cher(e) ${p?.nom}, veuillez trouver ci-dessous le relevé de vos véhicules mis à disposition pour le mois de ${months[now.getMonth()]} ${now.getFullYear()}.</p>
    <table style="width:100%;border-collapse:collapse;"><thead><tr>${['Contrat','Véhicule','Période','Jours','CA TTC','Taux','Votre part'].map(h=>`<th style="background:#f5f0e8;padding:7px 10px;border:1px solid #ddd;font-size:9px;color:#B8952A;text-transform:uppercase;letter-spacing:1px;text-align:left;">${h}</th>`).join('')}</tr></thead>
    <tbody><tr><td style="padding:7px 10px;border:1px solid #eee;font-size:11px;text-align:center;" colspan="7">Aucune location ce mois pour vos véhicules</td></tr></tbody>
    <tfoot><tr style="background:#f0e8d0;font-weight:700;"><td colspan="6" style="padding:7px 10px;border:1px solid #ddd;font-size:11px;text-align:right;">TOTAL À VERSER</td><td style="padding:7px 10px;border:1px solid #ddd;font-size:13px;">0,00 €</td></tr></tfoot></table>
    <div style="margin-top:16px;padding:10px 14px;background:#f9f6f0;font-size:10px;">Virement à effectuer avant le 05/${String(now.getMonth()+2).padStart(2,'0')}/${now.getFullYear()} sur IBAN: ${p?.iban||'—'}</div>
    <div style="display:flex;gap:50px;margin-top:30px;"><div style="flex:1;border-top:1px solid #B8952A;padding-top:8px;text-align:center;font-size:11px;color:#666;">LKB Location<br><br><br>Signature</div><div style="flex:1;border-top:1px solid #B8952A;padding-top:8px;text-align:center;font-size:11px;color:#666;">${p?.nom} ${p?.prenom||''}<br><br><br>Reçu pour acquit</div></div>
  </div>`);
}

// ============================================================
// PAGE — Sinistres
// ============================================================
Pages.sinistres = async function() {
  const el = document.getElementById('page-sinistres');
  el.innerHTML = `
  <div style="display:flex;gap:12px;margin-bottom:20px;" class="no-print">
    <button class="btn btn-gold" onclick="_openSinistreForm()">+ Déclarer un sinistre</button>
  </div>
  <div id="sinistres-list"><div class="spinner"></div></div>`;
  try {
    const sinistres = await DB.getSinistres();
    const pill = { ouvert:'pill-red', en_cours:'pill-orange', cloture:'pill-green' };
    const label = { ouvert:'Ouvert', en_cours:'En cours', cloture:'Clôturé' };
    document.getElementById('sinistres-list').innerHTML = `<div class="card"><table class="tbl">
      <thead><tr><th>N°</th><th>Date</th><th>Véhicule</th><th>Client</th><th>Description</th><th>Assureur</th><th>Montant estimé</th><th>Franchise</th><th>Statut</th><th class="no-print">Actions</th></tr></thead>
      <tbody>${sinistres.map(s=>`<tr>
        <td style="color:var(--gold);font-weight:600">${s.id}</td>
        <td>${fmt.date(s.date_sinistre)}</td>
        <td>${s.vehicules?.marque} ${s.vehicules?.modele}</td>
        <td>${s.clients?.nom||'—'} ${s.clients?.prenom||''}</td>
        <td style="max-width:200px;font-size:11px">${s.description||'—'}</td>
        <td>${s.assureur||'—'}</td>
        <td style="color:var(--gold)">${fmt.money(s.montant_estime)}</td>
        <td>${fmt.money(s.franchise)}</td>
        <td><span class="pill ${pill[s.statut]||'pill-gray'}">${label[s.statut]||s.statut}</span></td>
        <td class="no-print"><button class="btn btn-sm btn-outline" onclick="_openSinistreForm('${s.id}')">✏</button></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  } catch(e) { document.getElementById('sinistres-list').innerHTML = `<p style="color:#f87171;">Erreur: ${e.message}</p>`; }
};

async function _openSinistreForm() {
  let vehicules = [], clients = [];
  try { [vehicules, clients] = await Promise.all([DB.getVehicules(), DB.getClients()]); } catch(e){}
  const year = new Date().getFullYear();
  const { count } = await supabase.from('sinistres').select('*',{count:'exact',head:true}).like('id',`SIN-${year}-%`).catch(()=>({count:0}));
  const newId = `SIN-${year}-${String((count||0)+1).padStart(3,'0')}`;
  const html = `<div class="modal-overlay" id="modal-sin" onclick="if(event.target===this)closeModal('modal-sin')">
  <div class="modal" style="max-width:650px;">
    <button class="modal-close" onclick="closeModal('modal-sin')">✕</button>
    <div class="modal-title">Déclarer un sinistre</div>
    <div class="form-grid">
      <div class="form-group"><label>N° Sinistre</label><input id="sf-id" value="${newId}" readonly style="color:var(--gold)"></div>
      <div class="form-group"><label>Date du sinistre</label><input type="date" id="sf-date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label>Véhicule</label><select id="sf-veh">${vehicules.map(v=>`<option value="${v.id}">${v.marque} ${v.modele}</option>`).join('')}</select></div>
      <div class="form-group"><label>Client responsable</label><select id="sf-client"><option value="">—</option>${clients.map(c=>`<option value="${c.id}">${c.nom} ${c.prenom}</option>`).join('')}</select></div>
      <div class="form-group form-row-full"><label>Description</label><textarea id="sf-desc"></textarea></div>
      <div class="form-group"><label>Assureur</label><input id="sf-ass" placeholder="Allianz, AXA..."></div>
      <div class="form-group"><label>N° Déclaration</label><input id="sf-ndecl"></div>
      <div class="form-group"><label>Montant estimé (€)</label><input type="number" step="0.01" id="sf-montant"></div>
      <div class="form-group"><label>Franchise (€)</label><input type="number" step="0.01" id="sf-franchise"></div>
      <div class="form-group"><label>Statut</label><select id="sf-statut"><option value="ouvert">Ouvert</option><option value="en_cours">En cours</option><option value="cloture">Clôturé</option></select></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-sin')">Annuler</button>
      <button class="btn btn-gold" onclick="_saveSinistre()">✓ Enregistrer</button>
    </div>
  </div></div>`;
  openModal(html, 'modal-sin');
}

async function _saveSinistre() {
  try {
    await DB.saveSinistre({ id: document.getElementById('sf-id').value, vehicule_id: document.getElementById('sf-veh').value, client_id: document.getElementById('sf-client').value||null, date_sinistre: document.getElementById('sf-date').value, description: document.getElementById('sf-desc').value, assureur: document.getElementById('sf-ass').value, numero_declaration: document.getElementById('sf-ndecl').value, montant_estime: parseFloat(document.getElementById('sf-montant').value)||null, franchise: parseFloat(document.getElementById('sf-franchise').value)||null, statut: document.getElementById('sf-statut').value });
    closeModal('modal-sin'); toast('Sinistre enregistré', 'success'); Pages.sinistres();
  } catch(e) { toast('Erreur: ' + e.message, 'error'); }
}

// ============================================================
// PAGE — Documents
// ============================================================
Pages.documents = async function() {
  const el = document.getElementById('page-documents');
  el.innerHTML = `
  <div class="tabs">
    <div class="tab active" onclick="switchTab(this,'doc-tab-veh');_loadDocsVeh()">Véhicules</div>
    <div class="tab" onclick="switchTab(this,'doc-tab-clients');_loadDocsClients()">Clients</div>
    <div class="tab" onclick="switchTab(this,'doc-tab-modeles')">Modèles à imprimer</div>
  </div>
  <div id="doc-tab-veh"><div class="spinner"></div></div>
  <div id="doc-tab-clients" style="display:none;"><div class="card"><p style="color:var(--gray);">Cliquez sur l'onglet pour charger.</p></div></div>
  <div id="doc-tab-modeles" style="display:none;">
    <div class="card">
      <div class="card-title" style="margin-bottom:16px;">Modèles de documents imprimables</div>
      <div class="grid-3">
        ${[
          {label:'Contrat de location', fn:"toast('Sélectionnez un contrat dans Réservations → Contrats','info')"},
          {label:'État des lieux départ', fn:"showPage('edl')"},
          {label:'État des lieux retour', fn:"showPage('edl')"},
          {label:'Contrat mise à disposition', fn:"toast('Ouvrez un propriétaire pour générer','info')"},
          {label:'Relevé propriétaire', fn:"showPage('proprietaires')"},
          {label:'Bilan mensuel', fn:"showPage('comptabilite')"},
        ].map(m=>`<div style="padding:16px;background:var(--dark3);border-radius:4px;border:1px solid #2a2a2a;"><div style="font-size:11px;color:var(--gold);font-weight:600;margin-bottom:10px;">${m.label}</div><button class="btn btn-outline btn-sm" onclick="${m.fn}">📄 Générer</button></div>`).join('')}
      </div>
    </div>
  </div>`;
  _loadDocsVeh();
};

async function _loadDocsVeh() {
  try {
    const docs = await DB.getDocuments('vehicule');
    const now = new Date();
    const pill = doc => {
      if (!doc.date_fin) return 'pill-gray';
      const d = new Date(doc.date_fin);
      if (d < now) return 'pill-red';
      const warn = new Date(); warn.setDate(warn.getDate()+30);
      if (d < warn) return 'pill-orange';
      return 'pill-green';
    };
    const label = doc => {
      if (!doc.date_fin) return 'Permanent';
      const d = new Date(doc.date_fin);
      if (d < now) return 'Expiré';
      const warn = new Date(); warn.setDate(warn.getDate()+30);
      if (d < warn) return 'Renouveler';
      return 'Valide';
    };
    document.getElementById('doc-tab-veh').innerHTML = `<div class="card" style="margin-bottom:0;">
      <div class="card-header"><div class="card-title">Documents véhicules</div><button class="btn btn-gold btn-sm" onclick="_openDocForm('vehicule')">+ Ajouter</button></div>
      ${docs.length === 0 ? '<p style="color:var(--gray);font-size:13px;">Aucun document.</p>' :
      `<table class="tbl"><thead><tr><th>Type</th><th>N° Document</th><th>Début</th><th>Fin</th><th>Statut</th></tr></thead>
      <tbody>${docs.map(d=>`<tr>
        <td style="font-weight:500">${d.type_document}</td>
        <td style="color:var(--gold);font-size:11px">${d.numero||'—'}</td>
        <td>${fmt.date(d.date_debut)}</td>
        <td>${fmt.date(d.date_fin)}</td>
        <td><span class="pill ${pill(d)}">${label(d)}</span></td>
      </tr>`).join('')}</tbody></table>`}
    </div>`;
  } catch(e) { document.getElementById('doc-tab-veh').innerHTML = `<p style="color:#f87171;">${e.message}</p>`; }
}

async function _loadDocsClients() {
  try {
    const docs = await DB.getDocuments('client');
    document.getElementById('doc-tab-clients').innerHTML = `<div class="card"><p style="color:var(--gray);font-size:13px;">Documents clients: ${docs.length} enregistrés.</p></div>`;
  } catch(e) {}
}

async function _openDocForm(type) {
  const html = `<div class="modal-overlay" id="modal-doc" onclick="if(event.target===this)closeModal('modal-doc')">
  <div class="modal" style="max-width:500px;">
    <button class="modal-close" onclick="closeModal('modal-doc')">✕</button>
    <div class="modal-title">Ajouter un document</div>
    <div class="form-grid">
      <div class="form-group"><label>Type</label><select id="df-type"><option>Carte grise</option><option>Assurance</option><option>Contrôle technique</option><option>Permis</option><option>CNI</option><option>Autre</option></select></div>
      <div class="form-group"><label>N° document</label><input id="df-num"></div>
      <div class="form-group"><label>Date début</label><input type="date" id="df-debut"></div>
      <div class="form-group"><label>Date fin</label><input type="date" id="df-fin"></div>
      <div class="form-group form-row-full"><label>Notes</label><textarea id="df-notes"></textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-doc')">Annuler</button>
      <button class="btn btn-gold" onclick="_saveDoc('${type}')">✓ Enregistrer</button>
    </div>
  </div></div>`;
  openModal(html, 'modal-doc');
}

async function _saveDoc(type) {
  try {
    await DB.saveDocument({ entite_type: type, type_document: document.getElementById('df-type').value, numero: document.getElementById('df-num').value, date_debut: document.getElementById('df-debut').value||null, date_fin: document.getElementById('df-fin').value||null, notes: document.getElementById('df-notes').value });
    closeModal('modal-doc'); toast('Document ajouté', 'success'); Pages.documents();
  } catch(e) { toast('Erreur: ' + e.message, 'error'); }
}

// ============================================================
// PAGE — Paramètres
// ============================================================
Pages.parametres = function() {
  const el = document.getElementById('page-parametres');
  el.innerHTML = `
  <div class="grid-2">
    <div class="card">
      <div class="card-title" style="margin-bottom:16px;">Informations société</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${Object.entries({Nom:'nom',SIRET:'siret',Adresse:'adresse','Code postal':'cp',Ville:'ville',Email:'email',Téléphone:'tel',IBAN:'iban','TVA intracommunautaire':'tva_intracom'}).map(([l,k])=>`<div class="form-group"><label>${l}</label><input id="soc-${k}" value="${SOCIETE[k]||''}"></div>`).join('')}
        <button class="btn btn-gold" onclick="_saveSociete()">✓ Enregistrer</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title" style="margin-bottom:16px;">Gestion des accès</div>
      <p style="color:var(--gray);font-size:13px;margin-bottom:16px;">Les administrateurs sont gérés via votre dashboard Supabase → Authentication → Users.</p>
      <a href="https://supabase.com/dashboard" target="_blank" class="btn btn-outline" style="display:inline-block;text-decoration:none;">Ouvrir Supabase Dashboard ↗</a>
      <hr class="sec-divider">
      <div class="card-title" style="margin-bottom:12px;font-size:16px;">Configuration</div>
      <div style="font-size:12px;color:#aaa;">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1e1e1e;"><span>Supabase URL</span><span style="color:var(--gold);font-size:10px;max-width:200px;overflow:hidden;text-overflow:ellipsis;">${SUPABASE_URL}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;"><span>Version</span><span style="color:var(--gold)">LKB Location v2.0</span></div>
      </div>
    </div>
  </div>`;
};

function _saveSociete() {
  ['nom','siret','adresse','cp','ville','email','tel','iban','tva_intracom'].forEach(k => { const el = document.getElementById('soc-'+k); if(el) SOCIETE[k] = el.value; });
  toast('Informations société mises à jour', 'success');
}
