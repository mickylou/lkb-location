// ============================================================
// PAGE — Planning
// ============================================================
Pages = window.Pages || {};
Pages._planningWeek = 0;
Pages.planning = async function() {
  const el = document.getElementById('page-planning');
  el.innerHTML = `
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;" class="no-print">
    <button class="btn btn-outline btn-sm" onclick="Pages._planningWeek--;Pages.planning()">◀ Préc.</button>
    <span id="planning-period" style="font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--gold);flex:1;text-align:center;"></span>
    <button class="btn btn-outline btn-sm" onclick="Pages._planningWeek++;Pages.planning()">Suiv. ▶</button>
    <button class="btn btn-gold btn-sm" onclick="openNewReservation()">+ Réservation</button>
  </div>
  <div class="card">
    <div style="display:flex;gap:18px;margin-bottom:14px;font-size:11px;flex-wrap:wrap;">
      <span><span style="display:inline-block;width:11px;height:11px;background:rgba(41,128,185,.45);border-radius:2px;margin-right:5px;"></span>Véhicule propre</span>
      <span><span style="display:inline-block;width:11px;height:11px;background:rgba(184,149,42,.35);border-radius:2px;margin-right:5px;"></span>Sous-location</span>
      <span><span style="display:inline-block;width:11px;height:11px;background:rgba(192,57,43,.35);border-radius:2px;margin-right:5px;"></span>Maintenance</span>
    </div>
    <div class="planning-grid"><div class="spinner"></div></div>
  </div>`;
  try {
    const base = new Date(); base.setDate(base.getDate() + Pages._planningWeek * 14); base.setHours(0,0,0,0);
    const days = Array.from({length:14}, (_,i) => { const d=new Date(base); d.setDate(d.getDate()+i); return d; });
    const dayNames = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('planning-period').textContent =
      `${days[0].toLocaleDateString('fr-FR',{day:'2-digit',month:'long'})} — ${days[13].toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}`;
    const [vehicules, reservations] = await Promise.all([DB.getVehicules(), DB.getReservations()]);
    let html = `<table class="planning-table"><thead><tr><th style="min-width:170px">Véhicule</th>`;
    days.forEach(d => { html += `<th style="min-width:54px;text-align:center;">${dayNames[d.getDay()]}<br>${d.getDate()}/${d.getMonth()+1}</th>`; });
    html += `</tr></thead><tbody>`;
    vehicules.forEach(v => {
      html += `<tr><td class="veh-name"><div style="font-weight:600;font-size:12px;">${v.marque}</div><div style="font-size:10px;color:var(--gray)">${v.modele}</div></td>`;
      days.forEach(d => {
        const ds = d.toISOString().split('T')[0];
        const bk = reservations.find(r => r.vehicule_id === v.id && ds >= r.date_depart?.split('T')[0] && ds <= r.date_retour_prevue?.split('T')[0]);
        const isToday = ds === todayStr;
        if (bk) {
          const cl = v.type_propriete === 'sub' ? 'subrent' : 'owned';
          const nm = bk.clients?.nom || '?';
          const isFirst = ds === bk.date_depart?.split('T')[0];
          html += `<td><div class="day-cell${isToday?' today':''}"><div class="booking-block ${cl}" title="${nm}">${isFirst?`<span style="overflow:hidden;white-space:nowrap;">${nm.substring(0,7)}</span>`:''}</div></div></td>`;
        } else if (v.statut === 'maint') {
          html += `<td><div class="day-cell${isToday?' today':''}"><div class="booking-block maintenance" title="Entretien">🔧</div></div></td>`;
        } else {
          html += `<td><div class="day-cell${isToday?' today':''}"></div></td>`;
        }
      });
      html += `</tr>`;
    });
    html += `</tbody></table>`;
    el.querySelector('.planning-grid').innerHTML = html;
  } catch(e) { el.querySelector('.planning-grid').innerHTML = `<p style="color:#f87171;">Erreur: ${e.message}</p>`; }
};

// ============================================================
// PAGE — Réservations
// ============================================================
Pages.reservations = async function(openNew = false) {
  const el = document.getElementById('page-reservations');
  el.innerHTML = `
  <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;" class="no-print">
    <button class="btn btn-gold" onclick="_openResaForm()">+ Nouvelle réservation</button>
  </div>
  <div class="tabs">
    <div class="tab active" onclick="switchTab(this,'res-tab-actives')">En cours</div>
    <div class="tab" onclick="switchTab(this,'res-tab-all');_loadAllRes()">Toutes</div>
    <div class="tab" onclick="switchTab(this,'res-tab-clotures');_loadCloturesRes()">Clôturées</div>
  </div>
  <div id="res-tab-actives"><div class="card"><div class="spinner"></div></div></div>
  <div id="res-tab-all" style="display:none;"><div class="card"><p style="color:var(--gray);padding:16px;font-size:13px;">Cliquez sur l'onglet pour charger.</p></div></div>
  <div id="res-tab-clotures" style="display:none;"><div class="card"><p style="color:var(--gray);padding:16px;font-size:13px;">Cliquez sur l'onglet pour charger.</p></div></div>`;
  try {
    const reservations = await DB.getReservations();
    const actives = reservations.filter(r => ['active','retard','retour-j'].includes(r.statut));
    document.getElementById('res-tab-actives').innerHTML = `<div class="card">${_resTable(actives, true)}</div>`;
    if (openNew) _openResaForm();
  } catch(e) {
    document.getElementById('res-tab-actives').innerHTML = `<div class="card"><p style="color:#f87171;">Erreur: ${e.message}</p></div>`;
  }
};

async function _loadAllRes() {
  const el = document.getElementById('res-tab-all');
  el.innerHTML = '<div class="card"><div class="spinner"></div></div>';
  const res = await DB.getReservations();
  el.innerHTML = `<div class="card">${_resTable(res, true)}</div>`;
}

async function _loadCloturesRes() {
  const el = document.getElementById('res-tab-clotures');
  el.innerHTML = '<div class="card"><div class="spinner"></div></div>';
  const res = await DB.getReservations();
  const clotures = res.filter(r => r.statut === 'cloture');
  el.innerHTML = `<div class="card">${_resTable(clotures, false)}</div>`;
}

function _resTable(list, showRetour) {
  if (!list.length) return '<p style="color:var(--gray);font-size:13px;padding:8px;">Aucune réservation.</p>';
  return `<div style="overflow-x:auto;"><table class="tbl">
    <thead><tr><th>#</th><th>Véhicule</th><th>Client</th><th>Départ</th><th>Retour prévu</th><th>Durée</th><th>Total</th><th>Statut</th><th class="no-print">Actions</th></tr></thead>
    <tbody>${list.map(r=>`<tr>
      <td style="color:var(--gold);font-weight:600">${r.id}</td>
      <td>${r.vehicules?.marque||'?'} ${r.vehicules?.modele||''}</td>
      <td>${r.clients?.civilite||''} ${r.clients?.nom||'?'} ${r.clients?.prenom||''}</td>
      <td>${fmt.date(r.date_depart)}</td><td>${fmt.date(r.date_retour_prevue)}</td>
      <td>${fmt.days(r.date_depart, r.date_retour_prevue)}</td>
      <td style="color:var(--gold);font-weight:600">${fmt.money(r.total_prevu)}</td>
      <td>${pillRes(r.statut)}</td>
      <td class="no-print" style="display:flex;gap:5px;padding:8px 5px;flex-wrap:wrap;">
        <button class="btn btn-sm btn-outline" onclick="_printContrat('${r.id}')">📄</button>
        ${showRetour && r.statut !== 'cloture' ? `<button class="btn btn-sm btn-gold" onclick="_openRetour('${r.id}')">Retour</button>` : ''}
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

// ============================================================
// FORMULAIRE NOUVELLE RÉSERVATION
// ============================================================
async function _openResaForm() {
  const [vehicules, clients] = await Promise.all([DB.getVehicules(), DB.getClients()]);
  const dispos = vehicules.filter(v => v.statut === 'dispo');
  const html = `<div class="modal-overlay" id="modal-resa" onclick="if(event.target===this)closeModal('modal-resa')">
  <div class="modal">
    <button class="modal-close" onclick="closeModal('modal-resa')">✕</button>
    <div class="modal-title">Nouvelle réservation</div>
    <div class="form-section">
      <div class="form-section-title">Véhicule</div>
      <div class="form-group">
        <label>Véhicule disponible</label>
        <select id="rf-veh" onchange="_resaUpdateVeh()">
          <option value="">-- Sélectionner --</option>
          ${dispos.map(v=>`<option value="${v.id}" data-tarif="${v.tarif_jour}" data-caution="${v.caution}" data-kmlimit="${v.km_limite_par_jour}" data-kmsup="${v.km_supplement_eur}">${v.marque} ${v.modele} (${v.immatriculation})</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-section">
      <div class="form-section-title" style="display:flex;justify-content:space-between;align-items:center;">
        Client
        <button class="btn btn-outline btn-xs" onclick="_toggleNewClient()">+ Nouveau client</button>
      </div>
      <div id="client-select-zone">
        <div class="form-group">
          <label>Client existant</label>
          <select id="rf-client">
            <option value="">-- Sélectionner --</option>
            ${clients.map(c=>`<option value="${c.id}">${c.civilite||''} ${c.nom} ${c.prenom||''} — ${c.telephone||''}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="new-client-zone" style="display:none;">
        <div class="form-grid">
          <div class="form-group"><label>Civilité</label><select id="nc-civ"><option>M.</option><option>Mme</option></select></div>
          <div class="form-group"><label>Nom *</label><input id="nc-nom" placeholder="Nom de famille"></div>
          <div class="form-group"><label>Prénom</label><input id="nc-prenom"></div>
          <div class="form-group"><label>Téléphone</label><input id="nc-tel" type="tel"></div>
          <div class="form-group"><label>Email</label><input id="nc-email" type="email"></div>
          <div class="form-group"><label>N° Permis</label><input id="nc-permis"></div>
          <div class="form-group"><label>Date naissance</label><input id="nc-naiss" type="date"></div>
          <div class="form-group"><label>Nationalité</label><input id="nc-nat" value="Française"></div>
        </div>
      </div>
    </div>
    <div class="form-section">
      <div class="form-section-title">Période & Tarifs</div>
      <div class="form-grid">
        <div class="form-group"><label>Date/heure départ</label><input type="datetime-local" id="rf-depart" onchange="_resaCalc()"></div>
        <div class="form-group"><label>Date/heure retour</label><input type="datetime-local" id="rf-retour" onchange="_resaCalc()"></div>
        <div class="form-group"><label>Durée</label><input id="rf-duree" readonly style="background:#111;color:var(--gold);"></div>
        <div class="form-group"><label>Tarif / jour (€)</label><input type="number" id="rf-tarif" onchange="_resaCalc()"></div>
        <div class="form-group"><label>Total TTC (€)</label><input id="rf-total" readonly style="background:#111;color:var(--gold);font-weight:700;"></div>
        <div class="form-group"><label>Caution (€)</label><input type="number" id="rf-caution"></div>
        <div class="form-group"><label>KM inclus / jour</label><input type="number" id="rf-kmlimit" value="300"></div>
        <div class="form-group"><label>Supp. KM (€/km)</label><input type="number" step="0.01" id="rf-kmsup" value="2.50"></div>
        <div class="form-group"><label>Paiement</label><select id="rf-paiement"><option>Virement bancaire</option><option>Carte bancaire</option><option>Espèces</option><option>Chèque</option></select></div>
        <div class="form-group"><label>Conducteur additionnel</label><input id="rf-cond2" placeholder="Optionnel"></div>
      </div>
    </div>
    <div class="form-group"><label>Notes</label><textarea id="rf-notes"></textarea></div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-resa')">Annuler</button>
      <button class="btn btn-gold" onclick="_saveResa()">✓ Créer le contrat</button>
    </div>
  </div></div>`;
  openModal(html, 'modal-resa');
}

function _toggleNewClient() {
  const sel = document.getElementById('client-select-zone');
  const form = document.getElementById('new-client-zone');
  const isNew = form.style.display === 'none';
  sel.style.display = isNew ? 'none' : 'block';
  form.style.display = isNew ? 'block' : 'none';
}

function _resaUpdateVeh() {
  const sel = document.getElementById('rf-veh');
  const opt = sel.options[sel.selectedIndex];
  if (opt.dataset.tarif) {
    document.getElementById('rf-tarif').value = opt.dataset.tarif;
    document.getElementById('rf-caution').value = opt.dataset.caution;
    document.getElementById('rf-kmlimit').value = opt.dataset.kmlimit || 300;
    document.getElementById('rf-kmsup').value = opt.dataset.kmsup || 2.5;
    _resaCalc();
  }
}

function _resaCalc() {
  const d1 = document.getElementById('rf-depart').value;
  const d2 = document.getElementById('rf-retour').value;
  const tarif = parseFloat(document.getElementById('rf-tarif').value)||0;
  if (d1 && d2) {
    const days = Math.ceil((new Date(d2)-new Date(d1))/86400000);
    document.getElementById('rf-duree').value = days > 0 ? days + ' jour(s)' : '—';
    document.getElementById('rf-total').value = days > 0 ? (days * tarif).toLocaleString('fr-FR') + ' €' : '—';
  }
}

async function _saveResa() {
  const isNewClient = document.getElementById('new-client-zone').style.display !== 'none';
  let clientId = document.getElementById('rf-client')?.value;

  // Créer nouveau client si besoin
  if (isNewClient) {
    const nom = document.getElementById('nc-nom').value.trim();
    if (!nom) { toast('Le nom du client est requis', 'error'); return; }
    try {
      const newClient = await DB.saveClient({
        civilite: document.getElementById('nc-civ').value,
        nom, prenom: document.getElementById('nc-prenom').value,
        telephone: document.getElementById('nc-tel').value,
        email: document.getElementById('nc-email').value,
        permis_numero: document.getElementById('nc-permis').value,
        date_naissance: document.getElementById('nc-naiss').value || null,
        nationalite: document.getElementById('nc-nat').value,
        statut: 'Actif',
      });
      clientId = newClient.id;
    } catch(e) { toast('Erreur création client: ' + e.message, 'error'); return; }
  }

  const vid = document.getElementById('rf-veh').value;
  if (!vid || !clientId) { toast('Véhicule et client requis', 'error'); return; }
  const depart = document.getElementById('rf-depart').value;
  const retour = document.getElementById('rf-retour').value;
  if (!depart || !retour) { toast('Dates requises', 'error'); return; }
  const tarif = parseFloat(document.getElementById('rf-tarif').value)||0;
  const days = Math.ceil((new Date(retour)-new Date(depart))/86400000);

  try {
    setSyncStatus('syncing');
    const id = await DB.nextReservationId();
    await DB.saveReservation({
      id, vehicule_id: vid, client_id: clientId,
      date_depart: depart, date_retour_prevue: retour,
      tarif_jour: tarif, total_prevu: tarif * days,
      caution: parseFloat(document.getElementById('rf-caution').value)||0,
      km_limite: parseInt(document.getElementById('rf-kmlimit').value)||300,
      km_supplement_eur: parseFloat(document.getElementById('rf-kmsup').value)||2.5,
      conducteur_additionnel: document.getElementById('rf-cond2').value,
      mode_paiement: document.getElementById('rf-paiement').value,
      notes: document.getElementById('rf-notes').value,
      statut: 'active'
    });
    // Mettre véhicule en "loué"
    await supabase.from('vehicules').update({ statut: 'loue' }).eq('id', vid);
    // Écriture comptable
    await DB.addEcriture({
      date_operation: depart.split('T')[0],
      libelle: `Location ${id}`,
      categorie: 'Location', reference: id,
      credit: tarif * days, vehicule_id: vid
    });
    // Facture auto
    const fid = await DB.nextFactureId();
    const ht = Math.round(tarif * days / 1.2 * 100) / 100;
    const tva = Math.round((tarif * days - ht) * 100) / 100;
    await DB.saveFacture({ id: fid, reservation_id: id, client_id: clientId, montant_ht: ht, tva, montant_ttc: tarif * days, statut: 'emise', mode_paiement: document.getElementById('rf-paiement').value });
    setSyncStatus('synced');
    closeModal('modal-resa');
    toast(`Contrat ${id} créé !`, 'success');
    Pages.reservations();
  } catch(e) { setSyncStatus('offline'); toast('Erreur: ' + e.message, 'error'); }
}

// ============================================================
// RETOUR VÉHICULE avec frais supplémentaires
// ============================================================
async function _openRetour(resaId) {
  const r = await DB.getReservation(resaId);
  const html = `<div class="modal-overlay" id="modal-retour" onclick="if(event.target===this)closeModal('modal-retour')">
  <div class="modal" style="max-width:650px;">
    <button class="modal-close" onclick="closeModal('modal-retour')">✕</button>
    <div class="modal-title">Retour véhicule — ${resaId}</div>
    <div style="background:var(--dark3);padding:12px 16px;border-radius:3px;margin-bottom:18px;font-size:12px;">
      <strong>${r.vehicules?.marque} ${r.vehicules?.modele}</strong> — ${r.clients?.civilite} ${r.clients?.nom} ${r.clients?.prenom}<br>
      Départ: ${fmt.date(r.date_depart)} · Retour prévu: ${fmt.date(r.date_retour_prevue)}<br>
      KM départ: ${fmt.km(r.km_depart)} · Tarif: ${fmt.money(r.tarif_jour)}/j · KM inclus: ${r.km_limite||300}/j
    </div>
    <div class="form-section">
      <div class="form-section-title">Kilométrage retour</div>
      <div class="form-grid">
        <div class="form-group"><label>KM au compteur retour</label><input type="number" id="ret-km" placeholder="ex: 45230" oninput="_calcFraisKm('${resaId}')"></div>
        <div class="form-group"><label>KM parcourus</label><input id="ret-km-parcourus" readonly style="background:#111;color:var(--gold);"></div>
        <div class="form-group"><label>KM autorisés total</label><input id="ret-km-autorise" readonly style="background:#111;color:var(--gold);" value="${(() => { const days = Math.ceil((new Date(r.date_retour_prevue)-new Date(r.date_depart))/86400000); return (days * (r.km_limite||300)) + ' km'; })()}"></div>
        <div class="form-group"><label>Frais KM dépassés</label><input id="ret-frais-km" readonly style="background:#111;color:#f87171;font-weight:700;"></div>
      </div>
    </div>
    <div class="form-section">
      <div class="form-section-title">Frais supplémentaires</div>
      <div id="frais-list" style="margin-bottom:12px;"></div>
      <div class="form-grid">
        <div class="form-group"><label>Type de frais</label>
          <select id="frais-type">
            <option>Retard</option>
            <option>Nettoyage</option>
            <option>Carburant manquant</option>
            <option>Dommage</option>
            <option>Autre</option>
          </select>
        </div>
        <div class="form-group"><label>Montant (€)</label><input type="number" step="0.01" id="frais-montant"></div>
        <div class="form-group"><label>Description</label><input id="frais-desc" placeholder="Optionnel"></div>
        <div class="form-group" style="justify-content:flex-end;padding-top:18px;">
          <button class="btn btn-outline btn-sm" onclick="_addFrais()">+ Ajouter</button>
        </div>
      </div>
    </div>
    <div style="background:var(--dark3);padding:12px 16px;border-radius:3px;margin-bottom:18px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;">
        <span>Total location</span><span style="color:var(--gold);font-weight:700">${fmt.money(r.total_prevu)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:6px;">
        <span>Total frais supplémentaires</span><span id="total-frais-sup" style="color:#fb923c;font-weight:700">0,00 €</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;margin-top:8px;padding-top:8px;border-top:1px solid #333;">
        <span>TOTAL À ENCAISSER</span><span id="total-final" style="color:var(--gold)">${fmt.money(r.total_prevu)}</span>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-retour')">Annuler</button>
      <button class="btn btn-gold" onclick="_saveRetour('${resaId}', ${r.total_prevu}, ${r.km_limite||300}, ${r.km_supplement_eur||2.5})">✓ Clôturer la location</button>
    </div>
  </div></div>`;
  openModal(html, 'modal-retour');
  window._fraisRetour = [];
}

function _calcFraisKm(resaId) {
  // sera implémenté avec les données de la réservation
}

window._fraisRetour = [];

function _addFrais() {
  const type = document.getElementById('frais-type').value;
  const montant = parseFloat(document.getElementById('frais-montant').value)||0;
  const desc = document.getElementById('frais-desc').value;
  if (!montant) { toast('Montant requis', 'error'); return; }
  window._fraisRetour.push({ type_frais: type, description: desc, montant });
  _renderFrais();
  document.getElementById('frais-montant').value = '';
  document.getElementById('frais-desc').value = '';
}

function _renderFrais() {
  const el = document.getElementById('frais-list');
  const total = window._fraisRetour.reduce((s,f) => s+f.montant, 0);
  el.innerHTML = window._fraisRetour.map((f,i) => `
    <div class="damage-item" style="justify-content:space-between;">
      <span><strong>${f.type_frais}</strong>${f.description?' — '+f.description:''}</span>
      <span style="color:#fb923c;font-weight:700">${fmt.money(f.montant)}</span>
      <button onclick="window._fraisRetour.splice(${i},1);_renderFrais()" style="background:none;border:none;color:#555;cursor:pointer;">×</button>
    </div>`).join('');
  document.getElementById('total-frais-sup').textContent = fmt.money(total);
  // Recalcul total final
  const totalFinal = parseFloat(document.getElementById('total-final').dataset.base||0) + total;
  document.getElementById('total-final').textContent = fmt.money(totalFinal);
}

async function _saveRetour(resaId, totalBase, kmLimite, kmSup) {
  const kmRetour = parseInt(document.getElementById('ret-km').value)||null;
  document.getElementById('total-final').dataset.base = totalBase;
  try {
    setSyncStatus('syncing');
    await DB.cloturerReservation(resaId, kmRetour, window._fraisRetour);
    setSyncStatus('synced');
    closeModal('modal-retour');
    toast('Location clôturée avec succès !', 'success');
    Pages.reservations();
  } catch(e) { setSyncStatus('offline'); toast('Erreur: ' + e.message, 'error'); }
}

async function _printContrat(id) {
  try {
    const r = await DB.getReservation(id);
    const v = r.vehicules; const c = r.clients;
    const days = Math.ceil((new Date(r.date_retour_prevue)-new Date(r.date_depart))/86400000);
    const ht = Math.round(r.total_prevu / 1.2 * 100) / 100;
    const tva = Math.round((r.total_prevu - ht) * 100) / 100;
    printDoc(`<div style="padding:20px 30px;font-family:Montserrat,sans-serif;color:#111;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #B8952A;">
        <div><div style="font-family:Georgia,serif;font-size:26px;color:#B8952A;font-weight:700;">${SOCIETE.nom}</div><div style="font-size:11px;margin-top:8px;">${SOCIETE.adresse}, ${SOCIETE.cp} ${SOCIETE.ville}<br>${SOCIETE.email} — ${SOCIETE.tel}<br>SIRET: ${SOCIETE.siret}</div></div>
        <div style="text-align:right;"><div style="background:#B8952A;color:#fff;padding:8px 18px;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">CONTRAT DE LOCATION</div><div style="font-size:14px;font-weight:700;margin-top:6px;">${r.id}</div><div style="font-size:11px;color:#666;">Émis le ${fmt.date(new Date())}</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;"><thead><tr><th style="background:#f5f0e8;padding:7px 10px;border:1px solid #ddd;font-size:9px;color:#B8952A;text-align:left;" colspan="2">LOCATAIRE</th><th style="background:#f5f0e8;padding:7px 10px;border:1px solid #ddd;font-size:9px;color:#B8952A;text-align:left;" colspan="2">VÉHICULE</th></tr></thead>
      <tbody>
        <tr><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px;color:#777">Nom</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${c?.civilite||''} ${c?.nom||''} ${c?.prenom||''}</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px;color:#777">Marque / Modèle</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${v?.marque||''} ${v?.modele||''}</td></tr>
        <tr><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px;color:#777">Permis</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${c?.permis_numero||'—'}</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px;color:#777">Immatriculation</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${v?.immatriculation||''}</td></tr>
      </tbody></table>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;"><thead><tr>${['DÉPART','RETOUR PRÉVU','DURÉE','TARIF/J','KM INCLUS/J','CAUTION'].map(h=>`<th style="background:#f5f0e8;padding:7px 10px;border:1px solid #ddd;font-size:9px;color:#B8952A;text-align:left;">${h}</th>`).join('')}</tr></thead>
      <tbody><tr>${[fmt.dateTime(r.date_depart),fmt.dateTime(r.date_retour_prevue),days+' j',fmt.money(r.tarif_jour),(r.km_limite||300)+' km',fmt.money(r.caution)].map(v=>`<td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${v}</td>`).join('')}</tr></tbody></table>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><thead><tr>${['Désignation','Qté','PU HT','Total HT'].map(h=>`<th style="background:#f5f0e8;padding:7px 10px;border:1px solid #ddd;font-size:9px;color:#B8952A;text-align:left;">${h}</th>`).join('')}</tr></thead>
      <tbody>
        <tr><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">Location ${v?.marque||''} ${v?.modele||''}</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${days} j</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${fmt.money(Math.round(r.tarif_jour/1.2*100)/100)}</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${fmt.money(ht)}</td></tr>
        <tr><td colspan="3" style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px;text-align:right">TVA 20%</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${fmt.money(tva)}</td></tr>
        <tr style="background:#f0e8d0;font-weight:700;"><td colspan="3" style="padding:7px 10px;border:1px solid #e0e0e0;text-align:right">TOTAL TTC</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:13px">${fmt.money(r.total_prevu)}</td></tr>
      </tbody></table>
      <div style="padding:10px 14px;background:#f9f6f0;border-left:3px solid #B8952A;font-size:10px;margin-bottom:24px;">Le locataire s'engage à respecter le Code de la Route. KM supplémentaire: ${fmt.money(r.km_supplement_eur||2.5)}/km.</div>
      <div style="display:flex;gap:50px;"><div style="flex:1;border-top:1px solid #B8952A;padding-top:10px;text-align:center;font-size:11px;color:#666;">Le Loueur — ${SOCIETE.nom}<br><br><br>Lu et approuvé</div><div style="flex:1;border-top:1px solid #B8952A;padding-top:10px;text-align:center;font-size:11px;color:#666;">Le Locataire<br><br><br>Lu et approuvé — Bon pour accord</div></div>
    </div>`);
  } catch(e) { toast('Erreur impression: ' + e.message, 'error'); }
}

// ============================================================
// PAGE — États des lieux
// ============================================================
Pages._edlDamages = [];
Pages._edlCounter = 0;

Pages.edl = async function() {
  const el = document.getElementById('page-edl');
  el.innerHTML = `
  <div class="tabs">
    <div class="tab active" onclick="switchTab(this,'edl-tab-new')">Nouvel EDL</div>
    <div class="tab" onclick="switchTab(this,'edl-tab-list');_loadEDLList()">Historique</div>
  </div>
  <div id="edl-tab-new">
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">Informations EDL <small>État des lieux départ / retour</small></div></div>
        <div class="form-section"><div class="form-section-title">Identification</div>
          <div class="form-grid">
            <div class="form-group"><label>Type</label><select id="edl-type"><option value="depart">Départ</option><option value="retour">Retour</option></select></div>
            <div class="form-group"><label>N° Contrat</label><select id="edl-resa"><option value="">Chargement...</option></select></div>
            <div class="form-group"><label>Date & Heure</label><input type="datetime-local" id="edl-date" value="${new Date().toISOString().slice(0,16)}"></div>
            <div class="form-group"><label>Kilométrage</label><input type="number" id="edl-km" placeholder="km au compteur"></div>
          </div>
        </div>
        <div class="form-section"><div class="form-section-title">État</div>
          <div class="form-grid">
            <div class="form-group"><label>Carburant</label><select id="edl-fuel"><option>Plein</option><option>3/4</option><option>1/2</option><option>1/4</option><option>Réserve</option></select></div>
            <div class="form-group"><label>Propreté ext.</label><select id="edl-ext"><option>Très propre</option><option>Correct</option><option>Sale</option></select></div>
            <div class="form-group"><label>Propreté int.</label><select id="edl-int"><option>Très propre</option><option>Correct</option><option>Sale</option></select></div>
            <div class="form-group"><label>Pression pneus</label><select id="edl-pneus"><option>Conforme</option><option>Avant G bas</option><option>Avant D bas</option><option>Arrière G bas</option><option>Arrière D bas</option></select></div>
          </div>
        </div>
        <div class="form-section"><div class="form-section-title">Équipements</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;font-size:12px;">
            <label style="display:flex;gap:7px;align-items:center;cursor:pointer;"><input type="checkbox" id="edl-docs" checked> Documents de bord</label>
            <label style="display:flex;gap:7px;align-items:center;cursor:pointer;"><input type="checkbox" id="edl-kit" checked> Kit sécurité</label>
            <label style="display:flex;gap:7px;align-items:center;cursor:pointer;"><input type="checkbox" id="edl-roue" checked> Roue / kit crevaison</label>
            <label style="display:flex;gap:7px;align-items:center;cursor:pointer;"><input type="checkbox" id="edl-cles" checked> Clés (principale + double)</label>
            <label style="display:flex;gap:7px;align-items:center;cursor:pointer;"><input type="checkbox" id="edl-voyants" checked> Aucun voyant tableau de bord</label>
            <label style="display:flex;gap:7px;align-items:center;cursor:pointer;"><input type="checkbox" id="edl-propre" checked> Boîte à gants vidée</label>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:16px;"><label>Observations</label><textarea id="edl-obs"></textarea></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-gold" onclick="_saveEDL()">✓ Valider</button>
          <button class="btn btn-outline" onclick="_printEDL()">🖨 Imprimer</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Schéma dommages <small>Cliquez pour marquer</small></div></div>
        <div style="position:relative;width:100%;max-width:460px;margin:0 auto;">
          <svg viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg" id="edl-svg" style="width:100%;cursor:crosshair;display:block;" onclick="_edlAddDamage(event)">
            <rect width="500" height="300" fill="#1a1a1a" rx="6"/>
            <ellipse cx="250" cy="150" rx="185" ry="92" fill="#2a2a2a" stroke="#B8952A" stroke-width="1.5"/>
            <ellipse cx="250" cy="150" rx="118" ry="52" fill="#1e3a5f" opacity=".45" stroke="#2980B9" stroke-width=".8"/>
            <circle cx="125" cy="107" r="30" fill="#111" stroke="#555" stroke-width="2"/><circle cx="125" cy="107" r="19" fill="#1a1a1a"/>
            <circle cx="375" cy="107" r="30" fill="#111" stroke="#555" stroke-width="2"/><circle cx="375" cy="107" r="19" fill="#1a1a1a"/>
            <circle cx="125" cy="193" r="30" fill="#111" stroke="#555" stroke-width="2"/><circle cx="125" cy="193" r="19" fill="#1a1a1a"/>
            <circle cx="375" cy="193" r="30" fill="#111" stroke="#555" stroke-width="2"/><circle cx="375" cy="193" r="19" fill="#1a1a1a"/>
            <text x="250" y="17" font-family="Montserrat" font-size="9" fill="#B8952A" text-anchor="middle" letter-spacing="2">AVANT</text>
            <text x="250" y="293" font-family="Montserrat" font-size="9" fill="#B8952A" text-anchor="middle" letter-spacing="2">ARRIÈRE</text>
          </svg>
          <div id="edl-markers" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"></div>
        </div>
        <div id="edl-damage-list" style="margin-top:12px;"></div>
        <button class="btn btn-outline btn-sm no-print" style="margin-top:10px;" onclick="Pages._edlDamages=[];Pages._edlCounter=0;_renderDamages()">Effacer dommages</button>
      </div>
    </div>
  </div>
  <div id="edl-tab-list" style="display:none;"><div class="card"><div class="spinner"></div></div></div>`;
  Pages._edlDamages = []; Pages._edlCounter = 0; _renderDamages();
  try {
    const res = await DB.getReservations();
    const sel = document.getElementById('edl-resa');
    sel.innerHTML = `<option value="">-- Sélectionner --</option>` + res.filter(r=>['active','retard','retour-j'].includes(r.statut)).map(r=>`<option value="${r.id}">${r.id} — ${r.vehicules?.marque} ${r.vehicules?.modele}</option>`).join('');
  } catch(e) {}
};

function _edlAddDamage(evt) {
  const svg = document.getElementById('edl-svg');
  const rect = svg.getBoundingClientRect();
  const x = ((evt.clientX - rect.left) / rect.width) * 100;
  const y = ((evt.clientY - rect.top) / rect.height) * 100;
  const types = ['Rayure','Enfoncement','Éclat','Bris','Autre'];
  const t = prompt('Type:\n' + types.map((v,i)=>`${i+1}. ${v}`).join('\n'), '1');
  if (!t) return;
  Pages._edlCounter++;
  Pages._edlDamages.push({ id: Pages._edlCounter, x, y, label: types[(parseInt(t)||1)-1] });
  _renderDamages();
}

function _renderDamages() {
  const mEl = document.getElementById('edl-markers');
  if (!mEl) return;
  mEl.innerHTML = Pages._edlDamages.map(d => `<div class="damage-point" style="left:${d.x}%;top:${d.y}%">${d.id}</div>`).join('');
  const listEl = document.getElementById('edl-damage-list');
  if (!listEl) return;
  listEl.innerHTML = Pages._edlDamages.length === 0
    ? '<p style="color:var(--gray);font-size:12px;text-align:center;padding:12px;">Aucun dommage — cliquez sur le schéma</p>'
    : Pages._edlDamages.map(d => `<div class="damage-item"><span style="background:var(--red);color:#fff;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0;">${d.id}</span><span>${d.label}</span><button onclick="Pages._edlDamages=Pages._edlDamages.filter(x=>x.id!=${d.id});_renderDamages()" style="margin-left:auto;background:none;border:none;color:#555;cursor:pointer;">×</button></div>`).join('');
}

async function _saveEDL() {
  const resa = document.getElementById('edl-resa').value;
  if (!resa) { toast('Sélectionnez un contrat', 'error'); return; }
  const edl = {
    reservation_id: resa, type: document.getElementById('edl-type').value,
    date_edl: document.getElementById('edl-date').value,
    km: parseInt(document.getElementById('edl-km').value)||null,
    niveau_carburant: document.getElementById('edl-fuel').value,
    proprete_ext: document.getElementById('edl-ext').value,
    proprete_int: document.getElementById('edl-int').value,
    pression_pneus: document.getElementById('edl-pneus').value,
    doc_bord: document.getElementById('edl-docs').checked,
    kit_securite: document.getElementById('edl-kit').checked,
    roue_secours: document.getElementById('edl-roue').checked,
    cles: document.getElementById('edl-cles').checked,
    voyants_tb: document.getElementById('edl-voyants').checked,
    observations: document.getElementById('edl-obs').value,
    dommages: Pages._edlDamages, agent: Auth.currentUser?.email,
  };
  try {
    setSyncStatus('syncing');
    await DB.saveEDL(edl);
    setSyncStatus('synced');
    toast('EDL enregistré', 'success');
    Pages._edlDamages = []; Pages._edlCounter = 0; _renderDamages();
  } catch(e) { setSyncStatus('offline'); toast('Erreur: ' + e.message, 'error'); }
}

function _printEDL() {
  const resa = document.getElementById('edl-resa').value || '—';
  const type = document.getElementById('edl-type').value === 'depart' ? 'DÉPART' : 'RETOUR';
  printDoc(`<div style="padding:20px 30px;font-family:Montserrat,sans-serif;color:#111;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #B8952A;">
      <div><div style="font-family:Georgia,serif;font-size:22px;color:#B8952A;font-weight:700;">${SOCIETE.nom}</div></div>
      <div style="text-align:right;"><div style="background:#B8952A;color:#fff;padding:6px 16px;font-size:10px;letter-spacing:2px;font-weight:700;">ÉTAT DES LIEUX — ${type}</div><div style="margin-top:4px;font-size:12px;">Contrat: ${resa} | ${fmt.dateTime(document.getElementById('edl-date').value)}</div></div>
    </div>
    <div style="margin-top:16px;"><strong>Dommages (${Pages._edlDamages.length}):</strong>
    ${Pages._edlDamages.length === 0 ? '<p style="font-size:11px;color:#666;">Aucun dommage</p>' : Pages._edlDamages.map(d=>`<div style="font-size:11px;padding:4px 0;">● [${d.id}] ${d.label}</div>`).join('')}</div>
    <div style="margin-top:12px;"><strong>Observations:</strong><p style="font-size:11px;min-height:40px;">${document.getElementById('edl-obs').value||'RAS'}</p></div>
    <div style="display:flex;gap:50px;margin-top:30px;"><div style="flex:1;border-top:1px solid #B8952A;padding-top:8px;text-align:center;font-size:11px;color:#666;">Agent LKB<br><br><br>Signature</div><div style="flex:1;border-top:1px solid #B8952A;padding-top:8px;text-align:center;font-size:11px;color:#666;">Client<br><br><br>Signature</div></div>
  </div>`);
}

async function _loadEDLList() {
  const el = document.getElementById('edl-tab-list');
  try {
    const edls = await DB.getAllEDLs();
    el.innerHTML = `<div class="card"><div style="overflow-x:auto;"><table class="tbl"><thead><tr><th>Date</th><th>Contrat</th><th>Véhicule</th><th>Type</th><th>KM</th><th>Dommages</th><th>Carburant</th></tr></thead>
    <tbody>${edls.map(e=>`<tr>
      <td>${fmt.dateTime(e.date_edl)}</td>
      <td style="color:var(--gold)">${e.reservation_id}</td>
      <td>${e.reservations?.vehicules?.marque||''} ${e.reservations?.vehicules?.modele||''}</td>
      <td><span class="pill ${e.type==='depart'?'pill-green':'pill-blue'}">${e.type==='depart'?'Départ':'Retour'}</span></td>
      <td>${fmt.km(e.km)}</td>
      <td><span class="pill ${(e.dommages?.length||0)>0?'pill-orange':'pill-gray'}">${e.dommages?.length||0}</span></td>
      <td>${e.niveau_carburant}</td>
    </tr>`).join('')}</tbody></table></div></div>`;
  } catch(err) { el.innerHTML = `<div class="card"><p style="color:#f87171;">Erreur: ${err.message}</p></div>`; }
}

// ============================================================
// PAGE — Clients
// ============================================================
Pages.clients = async function() {
  const el = document.getElementById('page-clients');
  el.innerHTML = `
  <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;" class="no-print">
    <button class="btn btn-gold" onclick="_openClientForm()">+ Nouveau client</button>
    <input type="text" id="client-search" placeholder="Rechercher..." oninput="_filterClients(this.value)" style="flex:1;max-width:300px;background:var(--dark3);border:1px solid #2e2e2e;border-radius:3px;padding:8px 13px;color:var(--white);font-size:13px;outline:none;">
  </div>
  <div id="clients-list"><div class="spinner"></div></div>`;
  await _renderClients();
};

let _allClients = [];
async function _renderClients() {
  try { _allClients = await DB.getClients(); _filterClients(''); }
  catch(e) { document.getElementById('clients-list').innerHTML = `<p style="color:#f87171;">Erreur: ${e.message}</p>`; }
}

function _filterClients(q) {
  const filtered = q ? _allClients.filter(c => `${c.nom} ${c.prenom} ${c.email} ${c.telephone}`.toLowerCase().includes(q.toLowerCase())) : _allClients;
  const el = document.getElementById('clients-list');
  el.innerHTML = `<div class="card"><div style="overflow-x:auto;"><table class="tbl">
    <thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Permis</th><th>Statut</th><th class="no-print">Actions</th></tr></thead>
    <tbody>${filtered.map(c=>`<tr>
      <td><div style="font-weight:600">${c.civilite||''} ${c.nom} ${c.prenom||''}</div></td>
      <td>${c.email||'—'}</td><td>${c.telephone||'—'}</td><td>${c.permis_numero||'—'}</td>
      <td><span class="pill ${c.statut==='VIP'?'pill-gold':'pill-green'}">${c.statut||'Actif'}</span></td>
      <td class="no-print"><button class="btn btn-sm btn-outline" onclick="_openClientForm('${c.id}')">✏ Modifier</button></td>
    </tr>`).join('')}</tbody>
  </table></div></div>`;
}

async function _openClientForm(id = null) {
  let c = { civilite: 'M.', nationalite: 'Française', statut: 'Actif' };
  if (id) c = await DB.getClient(id);
  const html = `<div class="modal-overlay" id="modal-client" onclick="if(event.target===this)closeModal('modal-client')">
  <div class="modal">
    <button class="modal-close" onclick="closeModal('modal-client')">✕</button>
    <div class="modal-title">${id?'Modifier client':'Nouveau client'}</div>
    <div class="form-section"><div class="form-section-title">Identité</div>
      <div class="form-grid">
        <div class="form-group"><label>Civilité</label><select id="cf-civ">${['M.','Mme','Société'].map(o=>`<option ${c.civilite===o?'selected':''}>${o}</option>`).join('')}</select></div>
        <div class="form-group"><label>Nom</label><input id="cf-nom" value="${c.nom||''}"></div>
        <div class="form-group"><label>Prénom</label><input id="cf-prenom" value="${c.prenom||''}"></div>
        <div class="form-group"><label>Date naissance</label><input type="date" id="cf-naiss" value="${c.date_naissance||''}"></div>
        <div class="form-group"><label>Email</label><input type="email" id="cf-email" value="${c.email||''}"></div>
        <div class="form-group"><label>Téléphone</label><input type="tel" id="cf-tel" value="${c.telephone||''}"></div>
        <div class="form-group"><label>Adresse</label><input id="cf-adr" value="${c.adresse||''}"></div>
        <div class="form-group"><label>Ville</label><input id="cf-ville" value="${c.ville||''}"></div>
        <div class="form-group"><label>N° Permis</label><input id="cf-permis" value="${c.permis_numero||''}"></div>
        <div class="form-group"><label>Statut</label><select id="cf-statut">${['Actif','VIP','Inactif','Blacklisté'].map(s=>`<option ${c.statut===s?'selected':''}>${s}</option>`).join('')}</select></div>
      </div>
    </div>
    <div class="form-group"><label>Notes</label><textarea id="cf-notes">${c.notes||''}</textarea></div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-client')">Annuler</button>
      <button class="btn btn-gold" onclick="_saveClient('${id||''}')">✓ Enregistrer</button>
    </div>
  </div></div>`;
  openModal(html, 'modal-client');
}

async function _saveClient(id) {
  const data = {
    civilite: document.getElementById('cf-civ').value,
    nom: document.getElementById('cf-nom').value,
    prenom: document.getElementById('cf-prenom').value,
    date_naissance: document.getElementById('cf-naiss').value||null,
    email: document.getElementById('cf-email').value,
    telephone: document.getElementById('cf-tel').value,
    adresse: document.getElementById('cf-adr').value,
    ville: document.getElementById('cf-ville').value,
    permis_numero: document.getElementById('cf-permis').value,
    statut: document.getElementById('cf-statut').value,
    notes: document.getElementById('cf-notes').value,
  };
  if (id) data.id = id;
  try {
    setSyncStatus('syncing');
    await DB.saveClient(data);
    setSyncStatus('synced');
    closeModal('modal-client');
    toast(id ? 'Client mis à jour' : 'Client ajouté', 'success');
    await _renderClients();
  } catch(e) { setSyncStatus('offline'); toast('Erreur: ' + e.message, 'error'); }
}
