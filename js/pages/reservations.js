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
        const bk = reservations.find(r => r.vehicule_id === v.id && ds >= r.date_depart?.split('T')[0] && ds <= r.date_retour_prevue?.split('T')[0] && r.statut !== 'annule' && r.statut !== 'cloture');
        const isToday = ds === todayStr;
        if (bk) {
          const cl = v.type_propriete === 'sub' ? 'subrent' : 'owned';
          const nm = bk.clients?.nom || '?';
          const isFirst = ds === bk.date_depart?.split('T')[0];
          html += `<td><div class="day-cell${isToday?' today':''}" onclick="showPage('reservations')" style="cursor:pointer;"><div class="booking-block ${cl}" title="${nm} — ${bk.id}">${isFirst?`<span style="overflow:hidden;white-space:nowrap;">${nm.substring(0,7)}</span>`:''}</div></div></td>`;
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
    <div class="tab" onclick="switchTab(this,'res-tab-annulees');_loadAnnuleesRes()">Annulées</div>
  </div>
  <div id="res-tab-actives"><div class="card"><div class="spinner"></div></div></div>
  <div id="res-tab-all" style="display:none;"><div class="card"><p style="color:var(--gray);padding:16px;font-size:13px;">Cliquez sur l'onglet pour charger.</p></div></div>
  <div id="res-tab-clotures" style="display:none;"><div class="card"><p style="color:var(--gray);padding:16px;font-size:13px;">Cliquez sur l'onglet pour charger.</p></div></div>
  <div id="res-tab-annulees" style="display:none;"><div class="card"><p style="color:var(--gray);padding:16px;font-size:13px;">Cliquez sur l'onglet pour charger.</p></div></div>`;
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
  el.innerHTML = `<div class="card">${_resTable(res.filter(r=>r.statut==='cloture'), false)}</div>`;
}
async function _loadAnnuleesRes() {
  const el = document.getElementById('res-tab-annulees');
  el.innerHTML = '<div class="card"><div class="spinner"></div></div>';
  const res = await DB.getReservations();
  el.innerHTML = `<div class="card">${_resTable(res.filter(r=>r.statut==='annule'), false)}</div>`;
}

function _resTable(list, showActions) {
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
      <td class="no-print" style="display:flex;gap:4px;padding:6px 4px;flex-wrap:wrap;">
        <button class="btn btn-xs btn-outline" onclick="_printContrat('${r.id}')">📄</button>
        <button class="btn btn-xs btn-outline" onclick="_openResaForm('${r.id}')">✏</button>
        ${showActions && r.statut !== 'cloture' && r.statut !== 'annule' ? `<button class="btn btn-xs btn-gold" onclick="_openRetour('${r.id}')">Retour</button>` : ''}
        <button class="btn btn-xs btn-outline" style="color:#f87171;border-color:rgba(192,57,43,.4);" onclick="_deleteResa('${r.id}','${r.vehicule_id}')">🗑</button>
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

// ============================================================
// FORMULAIRE RÉSERVATION (création ET modification)
// ============================================================
async function _openResaForm(resaId = null) {
  const [vehicules, clients] = await Promise.all([DB.getVehicules(), DB.getClients()]);
  let r = null;
  if (resaId) {
    try { r = await DB.getReservation(resaId); } catch(e) {}
  }
  const isEdit = !!r;
  const dispos = isEdit ? vehicules : vehicules.filter(v => v.statut === 'dispo');
  // En mode édition, inclure le véhicule actuel même s'il est loué
  const vehOptions = isEdit
    ? vehicules.map(v=>`<option value="${v.id}" data-tarif="${v.tarif_jour}" data-caution="${v.caution}" data-kmlimit="${v.km_limite_par_jour}" data-kmsup="${v.km_supplement_eur}" ${r.vehicule_id===v.id?'selected':''}>${v.marque} ${v.modele} (${v.immatriculation})</option>`).join('')
    : dispos.map(v=>`<option value="${v.id}" data-tarif="${v.tarif_jour}" data-caution="${v.caution}" data-kmlimit="${v.km_limite_par_jour}" data-kmsup="${v.km_supplement_eur}">${v.marque} ${v.modele} (${v.immatriculation})</option>`).join('');

  const html = `<div class="modal-overlay" id="modal-resa" onclick="if(event.target===this)closeModal('modal-resa')">
  <div class="modal">
    <button class="modal-close" onclick="closeModal('modal-resa')">✕</button>
    <div class="modal-title">${isEdit?'✏ Modifier la réservation':'Nouvelle réservation'} ${isEdit?r.id:''}</div>
    <div class="form-section">
      <div class="form-section-title">Véhicule</div>
      <div class="form-group">
        <label>Véhicule ${isEdit?'':'disponible'}</label>
        <select id="rf-veh" onchange="_resaUpdateVeh()">
          <option value="">-- Sélectionner --</option>${vehOptions}
        </select>
      </div>
    </div>
    <div class="form-section">
      <div class="form-section-title" style="display:flex;justify-content:space-between;align-items:center;">
        Client ${!isEdit?`<button class="btn btn-outline btn-xs" onclick="_toggleNewClient()">+ Nouveau client</button>`:''}
      </div>
      <div id="client-select-zone">
        <div class="form-group">
          <label>Client</label>
          <select id="rf-client">
            <option value="">-- Sélectionner --</option>
            ${clients.map(c=>`<option value="${c.id}" ${r?.client_id===c.id?'selected':''}>${c.civilite||''} ${c.nom} ${c.prenom||''} — ${c.telephone||''}</option>`).join('')}
          </select>
        </div>
      </div>
      ${!isEdit?`<div id="new-client-zone" style="display:none;">
        <div class="form-grid">
          <div class="form-group"><label>Civilité</label><select id="nc-civ"><option>M.</option><option>Mme</option></select></div>
          <div class="form-group"><label>Nom *</label><input id="nc-nom"></div>
          <div class="form-group"><label>Prénom</label><input id="nc-prenom"></div>
          <div class="form-group"><label>Téléphone</label><input id="nc-tel" type="tel"></div>
          <div class="form-group"><label>Email</label><input id="nc-email" type="email"></div>
          <div class="form-group"><label>N° Permis</label><input id="nc-permis"></div>
        </div>
      </div>`:''}
    </div>
    <div class="form-section">
      <div class="form-section-title">Période & Tarifs</div>
      <div class="form-grid">
        <div class="form-group"><label>Date/heure départ</label><input type="datetime-local" id="rf-depart" value="${r?.date_depart?r.date_depart.slice(0,16):''}" onchange="_resaCalc()"></div>
        <div class="form-group"><label>Date/heure retour</label><input type="datetime-local" id="rf-retour" value="${r?.date_retour_prevue?r.date_retour_prevue.slice(0,16):''}" onchange="_resaCalc()"></div>
        <div class="form-group"><label>Durée</label><input id="rf-duree" readonly style="background:#111;color:var(--gold);"></div>
        <div class="form-group"><label>Tarif / jour (€)</label><input type="number" id="rf-tarif" value="${r?.tarif_jour||''}" onchange="_resaCalc()"></div>
        <div class="form-group"><label>Total TTC (€)</label><input id="rf-total" readonly style="background:#111;color:var(--gold);font-weight:700;"></div>
        <div class="form-group"><label>Caution (€)</label><input type="number" id="rf-caution" value="${r?.caution||''}"></div>
        <div class="form-group"><label>KM inclus / jour</label><input type="number" id="rf-kmlimit" value="${r?.km_limite||300}"></div>
        <div class="form-group"><label>Supp. KM (€/km)</label><input type="number" step="0.01" id="rf-kmsup" value="${r?.km_supplement_eur||2.5}"></div>
        <div class="form-group"><label>Paiement</label>
          <select id="rf-paiement">
            ${['Virement bancaire','Carte bancaire','Espèces','Chèque'].map(p=>`<option ${r?.mode_paiement===p?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Statut</label>
          <select id="rf-statut">
            ${['active','retard','retour-j','cloture','annule'].map(s=>`<option value="${s}" ${(r?.statut||'active')===s?'selected':''}>${labelStatutRes[s]||s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Conducteur additionnel</label><input id="rf-cond2" value="${r?.conducteur_additionnel||''}"></div>
      </div>
    </div>
    <div class="form-group"><label>Notes</label><textarea id="rf-notes">${r?.notes||''}</textarea></div>
    <div class="modal-footer">
      ${isEdit?`<button class="btn btn-red btn-sm" onclick="_deleteResa('${r.id}','${r.vehicule_id}')">🗑 Supprimer</button>`:''}
      <button class="btn btn-outline" onclick="closeModal('modal-resa')">Annuler</button>
      <button class="btn btn-gold" onclick="_saveResa('${resaId||''}')">${isEdit?'✓ Mettre à jour':'✓ Créer le contrat'}</button>
    </div>
  </div></div>`;
  openModal(html, 'modal-resa');
  if (r) { setTimeout(_resaCalc, 100); }
}

function _toggleNewClient() {
  const sel = document.getElementById('client-select-zone');
  const form = document.getElementById('new-client-zone');
  if (!form) return;
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
  const d1 = document.getElementById('rf-depart')?.value;
  const d2 = document.getElementById('rf-retour')?.value;
  const tarif = parseFloat(document.getElementById('rf-tarif')?.value)||0;
  if (d1 && d2) {
    const days = Math.ceil((new Date(d2)-new Date(d1))/86400000);
    const dureeEl = document.getElementById('rf-duree');
    const totalEl = document.getElementById('rf-total');
    if (dureeEl) dureeEl.value = days > 0 ? days + ' jour(s)' : '—';
    if (totalEl) totalEl.value = days > 0 ? (days * tarif).toLocaleString('fr-FR') + ' €' : '—';
  }
}

async function _saveResa(existingId) {
  const isEdit = !!existingId;
  const isNewClient = !isEdit && document.getElementById('new-client-zone')?.style.display !== 'none';
  let clientId = document.getElementById('rf-client')?.value;

  if (isNewClient) {
    const nom = document.getElementById('nc-nom')?.value.trim();
    if (!nom) { toast('Le nom du client est requis', 'error'); return; }
    try {
      const newClient = await DB.saveClient({
        civilite: document.getElementById('nc-civ')?.value,
        nom, prenom: document.getElementById('nc-prenom')?.value,
        telephone: document.getElementById('nc-tel')?.value,
        email: document.getElementById('nc-email')?.value,
        permis_numero: document.getElementById('nc-permis')?.value,
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
  const statut = document.getElementById('rf-statut')?.value || 'active';

  try {
    setSyncStatus('syncing');

    if (isEdit) {
      // MODIFICATION
      const updateData = {
        vehicule_id: vid, client_id: clientId,
        date_depart: depart, date_retour_prevue: retour,
        tarif_jour: tarif, total_prevu: tarif * days,
        caution: parseFloat(document.getElementById('rf-caution').value)||0,
        km_limite: parseInt(document.getElementById('rf-kmlimit').value)||300,
        km_supplement_eur: parseFloat(document.getElementById('rf-kmsup').value)||2.5,
        conducteur_additionnel: document.getElementById('rf-cond2').value,
        mode_paiement: document.getElementById('rf-paiement').value,
        notes: document.getElementById('rf-notes').value,
        statut,
      };
      const { error } = await supabase.from('reservations').update(updateData).eq('id', existingId);
      if (error) throw new Error(error.message);
      // Mettre à jour statut véhicule
      const newVehStatut = ['active','retard','retour-j'].includes(statut) ? 'loue' : 'dispo';
      await supabase.from('vehicules').update({ statut: newVehStatut }).eq('id', vid);
      toast(`Réservation ${existingId} mise à jour ✓`, 'success');
    } else {
      // CRÉATION
      const id = await DB.nextReservationId();
      const { data: savedRes, error: resError } = await supabase
        .from('reservations')
        .insert({ id, vehicule_id: vid, client_id: clientId, date_depart: depart, date_retour_prevue: retour, tarif_jour: tarif, total_prevu: tarif * days, caution: parseFloat(document.getElementById('rf-caution').value)||0, km_limite: parseInt(document.getElementById('rf-kmlimit').value)||300, km_supplement_eur: parseFloat(document.getElementById('rf-kmsup').value)||2.5, conducteur_additionnel: document.getElementById('rf-cond2').value, mode_paiement: document.getElementById('rf-paiement').value, notes: document.getElementById('rf-notes').value, statut: 'active' })
        .select();
      if (resError) throw new Error(resError.message);
      await supabase.from('vehicules').update({ statut: 'loue' }).eq('id', vid);
      try {
        await DB.addEcriture({ date_operation: depart.split('T')[0], libelle: `Location ${id}`, categorie: 'Location', reference: id, credit: tarif * days, vehicule_id: vid });
        const fid = await DB.nextFactureId();
        const ht = Math.round(tarif * days / 1.2 * 100) / 100;
        await DB.saveFacture({ id: fid, reservation_id: id, client_id: clientId, montant_ht: ht, tva: Math.round((tarif*days-ht)*100)/100, montant_ttc: tarif*days, statut: 'emise', mode_paiement: document.getElementById('rf-paiement').value });
      } catch(e) { console.error('Ecriture/facture error:', e); }
      toast(`Contrat ${id} créé ✓`, 'success');
    }

    setSyncStatus('synced');
    closeModal('modal-resa');
    Pages.reservations();
  } catch(e) {
    setSyncStatus('offline');
    toast('Erreur: ' + e.message, 'error');
  }
}

async function _deleteResa(resaId, vehiculeId) {
  if (!confirm(`Supprimer la réservation ${resaId} ? Cette action est irréversible.`)) return;
  try {
    setSyncStatus('syncing');
    // Supprimer les écritures liées
    await supabase.from('journal_comptable').delete().eq('reference', resaId);
    // Supprimer les factures liées
    await supabase.from('factures').delete().eq('reservation_id', resaId);
    // Supprimer la réservation
    const { error } = await supabase.from('reservations').delete().eq('id', resaId);
    if (error) throw new Error(error.message);
    // Remettre le véhicule en dispo
    if (vehiculeId) await supabase.from('vehicules').update({ statut: 'dispo' }).eq('id', vehiculeId);
    setSyncStatus('synced');
    toast(`Réservation ${resaId} supprimée`, 'success');
    closeModal('modal-resa');
    Pages.reservations();
  } catch(e) {
    setSyncStatus('offline');
    toast('Erreur: ' + e.message, 'error');
  }
}

// ============================================================
// RETOUR VÉHICULE
// ============================================================
async function _openRetour(resaId) {
  const r = await DB.getReservation(resaId);
  const days = Math.ceil((new Date(r.date_retour_prevue)-new Date(r.date_depart))/86400000);
  const kmAutorise = days * (r.km_limite||300);
  const html = `<div class="modal-overlay" id="modal-retour" onclick="if(event.target===this)closeModal('modal-retour')">
  <div class="modal" style="max-width:650px;">
    <button class="modal-close" onclick="closeModal('modal-retour')">✕</button>
    <div class="modal-title">Retour — ${resaId}</div>
    <div style="background:var(--dark3);padding:12px 16px;border-radius:3px;margin-bottom:16px;font-size:12px;">
      <strong>${r.vehicules?.marque} ${r.vehicules?.modele}</strong> — ${r.clients?.civilite||''} ${r.clients?.nom} ${r.clients?.prenom||''}<br>
      Départ: ${fmt.date(r.date_depart)} · Retour prévu: ${fmt.date(r.date_retour_prevue)}<br>
      KM départ: ${fmt.km(r.km_depart)} · KM autorisés: ${kmAutorise} km · Supp: ${fmt.money(r.km_supplement_eur||2.5)}/km
    </div>
    <div class="form-section"><div class="form-section-title">Kilométrage retour</div>
      <div class="form-grid">
        <div class="form-group"><label>KM au compteur retour</label>
          <input type="number" id="ret-km" placeholder="ex: 45230" oninput="_calcRetourKm(${r.km_depart||0}, ${kmAutorise}, ${r.km_supplement_eur||2.5}, ${r.total_prevu||0})">
        </div>
        <div class="form-group"><label>KM parcourus</label><input id="ret-km-parcourus" readonly style="background:#111;color:var(--gold);"></div>
        <div class="form-group"><label>KM dépassés</label><input id="ret-km-depasses" readonly style="background:#111;color:#f87171;"></div>
        <div class="form-group"><label>Frais KM supp.</label><input id="ret-frais-km" readonly style="background:#111;color:#fb923c;font-weight:700;"></div>
      </div>
    </div>
    <div class="form-section"><div class="form-section-title">Frais supplémentaires</div>
      <div id="frais-list" style="margin-bottom:10px;"></div>
      <div class="form-grid">
        <div class="form-group"><label>Type</label>
          <select id="frais-type"><option>Retard</option><option>Nettoyage</option><option>Carburant manquant</option><option>Dommage</option><option>Autre</option></select>
        </div>
        <div class="form-group"><label>Montant (€)</label><input type="number" step="0.01" id="frais-montant"></div>
        <div class="form-group"><label>Description</label><input id="frais-desc"></div>
        <div class="form-group" style="justify-content:flex-end;padding-top:18px;">
          <button class="btn btn-outline btn-sm" onclick="_addFrais()">+ Ajouter</button>
        </div>
      </div>
    </div>
    <div style="background:var(--dark3);padding:12px 16px;border-radius:3px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;"><span>Location de base</span><span style="color:var(--gold);font-weight:600">${fmt.money(r.total_prevu)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-top:5px;"><span>Frais supplémentaires</span><span id="total-frais-sup" style="color:#fb923c;font-weight:600">0,00 €</span></div>
      <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;margin-top:8px;padding-top:8px;border-top:1px solid #333;">
        <span>TOTAL À ENCAISSER</span><span id="total-final" style="color:var(--gold)">${fmt.money(r.total_prevu)}</span>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-retour')">Annuler</button>
      <button class="btn btn-gold" onclick="_saveRetour('${resaId}', ${r.total_prevu}, ${r.vehicule_id?`'${r.vehicule_id}'`:'null'})">✓ Clôturer la location</button>
    </div>
  </div></div>`;
  openModal(html, 'modal-retour');
  window._fraisRetour = [];
}

function _calcRetourKm(kmDepart, kmAutorise, kmSup, totalBase) {
  const kmRetour = parseInt(document.getElementById('ret-km').value)||0;
  const parcourus = kmDepart ? kmRetour - kmDepart : 0;
  const depasses = Math.max(0, parcourus - kmAutorise);
  const fraisKm = depasses * kmSup;
  document.getElementById('ret-km-parcourus').value = parcourus > 0 ? parcourus + ' km' : '—';
  document.getElementById('ret-km-depasses').value = depasses > 0 ? depasses + ' km' : '0 km';
  document.getElementById('ret-frais-km').value = fraisKm > 0 ? fmt.money(fraisKm) : '—';
  // Ajouter/mettre à jour frais km automatiquement
  window._fraisRetour = window._fraisRetour.filter(f => f.type_frais !== 'KM supplémentaires');
  if (fraisKm > 0) window._fraisRetour.push({ type_frais: 'KM supplémentaires', description: `${depasses} km × ${fmt.money(kmSup)}`, montant: fraisKm });
  _updateTotalRetour(totalBase);
}

function _addFrais() {
  const type = document.getElementById('frais-type').value;
  const montant = parseFloat(document.getElementById('frais-montant').value)||0;
  const desc = document.getElementById('frais-desc').value;
  if (!montant) { toast('Montant requis', 'error'); return; }
  window._fraisRetour.push({ type_frais: type, description: desc, montant });
  document.getElementById('frais-montant').value = '';
  document.getElementById('frais-desc').value = '';
  _renderFrais();
}

function _renderFrais() {
  const el = document.getElementById('frais-list');
  if (!el) return;
  el.innerHTML = window._fraisRetour.map((f,i) => `
    <div style="background:rgba(230,126,34,.08);border:1px solid rgba(230,126,34,.2);border-radius:3px;padding:7px 10px;margin-bottom:5px;display:flex;align-items:center;gap:8px;">
      <span style="flex:1;font-size:12px;"><strong>${f.type_frais}</strong>${f.description?' — '+f.description:''}</span>
      <span style="color:#fb923c;font-weight:700;font-size:12px;">${fmt.money(f.montant)}</span>
      <button onclick="window._fraisRetour.splice(${i},1);_renderFrais();" style="background:none;border:none;color:#555;cursor:pointer;font-size:16px;">×</button>
    </div>`).join('');
}

function _updateTotalRetour(totalBase) {
  _renderFrais();
  const totalFrais = window._fraisRetour.reduce((s,f)=>s+f.montant,0);
  const totalEl = document.getElementById('total-frais-sup');
  const finalEl = document.getElementById('total-final');
  if (totalEl) totalEl.textContent = fmt.money(totalFrais);
  if (finalEl) finalEl.textContent = fmt.money(totalBase + totalFrais);
}

async function _saveRetour(resaId, totalBase, vehiculeId) {
  const kmRetour = parseInt(document.getElementById('ret-km').value)||null;
  try {
    setSyncStatus('syncing');
    await DB.cloturerReservation(resaId, kmRetour, window._fraisRetour, []);
    setSyncStatus('synced');
    closeModal('modal-retour');
    toast('Location clôturée ✓', 'success');
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
        <div><div style="font-family:Georgia,serif;font-size:26px;color:#B8952A;font-weight:700;">${SOCIETE.nom||'LKB Location'}</div>
        <div style="font-size:11px;margin-top:8px;">${SOCIETE.adresse||''}, ${SOCIETE.cp||''} ${SOCIETE.ville||''}<br>${SOCIETE.email||''} — ${SOCIETE.tel||''}<br>N° Entreprise: ${SOCIETE.siret||''}</div></div>
        <div style="text-align:right;"><div style="background:#B8952A;color:#fff;padding:8px 18px;font-size:10px;letter-spacing:2px;font-weight:700;">CONTRAT DE LOCATION</div>
        <div style="font-size:14px;font-weight:700;margin-top:6px;">${r.id}</div>
        <div style="font-size:11px;color:#666;">Émis le ${fmt.date(new Date())}</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;"><thead><tr>
        <th style="background:#f5f0e8;padding:7px 10px;border:1px solid #ddd;font-size:9px;color:#B8952A;text-align:left;" colspan="2">LOCATAIRE</th>
        <th style="background:#f5f0e8;padding:7px 10px;border:1px solid #ddd;font-size:9px;color:#B8952A;text-align:left;" colspan="2">VÉHICULE</th>
      </tr></thead><tbody>
        <tr><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px;color:#777">Nom</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${c?.civilite||''} ${c?.nom||''} ${c?.prenom||''}</td>
            <td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px;color:#777">Véhicule</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${v?.marque||''} ${v?.modele||''}</td></tr>
        <tr><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px;color:#777">Permis</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${c?.permis_numero||'—'}</td>
            <td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px;color:#777">Immatriculation</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${v?.immatriculation||''}</td></tr>
        <tr><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px;color:#777">Tél.</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${c?.telephone||'—'}</td>
            <td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px;color:#777">Caution</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${fmt.money(r.caution)}</td></tr>
      </tbody></table>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;"><thead><tr>
        ${['DÉPART','RETOUR PRÉVU','DURÉE','TARIF/J','KM INCLUS/J','KM SUPP.'].map(h=>`<th style="background:#f5f0e8;padding:7px 10px;border:1px solid #ddd;font-size:9px;color:#B8952A;text-align:left;">${h}</th>`).join('')}
      </tr></thead><tbody><tr>
        ${[fmt.dateTime(r.date_depart),fmt.dateTime(r.date_retour_prevue),days+'j',fmt.money(r.tarif_jour),(r.km_limite||300)+' km',fmt.money(r.km_supplement_eur||2.5)+'/km'].map(v=>`<td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${v}</td>`).join('')}
      </tr></tbody></table>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><thead><tr>
        ${['Désignation','Qté','PU HT','Total HT'].map(h=>`<th style="background:#f5f0e8;padding:7px 10px;border:1px solid #ddd;font-size:9px;color:#B8952A;text-align:left;">${h}</th>`).join('')}
      </tr></thead><tbody>
        <tr><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">Location ${v?.marque||''} ${v?.modele||''}</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${days} j</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${fmt.money(Math.round(r.tarif_jour/1.2*100)/100)}</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${fmt.money(ht)}</td></tr>
        <tr><td colspan="3" style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px;text-align:right">TVA 21%</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:11px">${fmt.money(tva)}</td></tr>
        <tr style="background:#f0e8d0;font-weight:700;"><td colspan="3" style="padding:7px 10px;border:1px solid #e0e0e0;text-align:right">TOTAL TTC</td><td style="padding:7px 10px;border:1px solid #e0e0e0;font-size:13px">${fmt.money(r.total_prevu)}</td></tr>
      </tbody></table>
      <div style="padding:10px 14px;background:#f9f6f0;border-left:3px solid #B8952A;font-size:10px;margin-bottom:24px;">Le locataire s'engage à respecter le Code de la Route. KM supplémentaire: ${fmt.money(r.km_supplement_eur||2.5)}/km. Retour tardif facturé au tarif journalier proratisé.</div>
      <div style="display:flex;gap:50px;"><div style="flex:1;border-top:1px solid #B8952A;padding-top:10px;text-align:center;font-size:11px;color:#666;">Le Loueur — ${SOCIETE.nom||'LKB Location'}<br><br><br>Lu et approuvé</div><div style="flex:1;border-top:1px solid #B8952A;padding-top:10px;text-align:center;font-size:11px;color:#666;">Le Locataire — ${c?.nom||''} ${c?.prenom||''}<br><br><br>Lu et approuvé — Bon pour accord</div></div>
    </div>`);
  } catch(e) { toast('Erreur impression: ' + e.message, 'error'); }
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
  document.getElementById('clients-list').innerHTML = `<div class="card"><div style="overflow-x:auto;"><table class="tbl">
    <thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Permis</th><th>Statut</th><th class="no-print">Actions</th></tr></thead>
    <tbody>${filtered.map(c=>`<tr>
      <td><div style="font-weight:600">${c.civilite||''} ${c.nom} ${c.prenom||''}</div></td>
      <td>${c.email||'—'}</td><td>${c.telephone||'—'}</td><td>${c.permis_numero||'—'}</td>
      <td><span class="pill ${c.statut==='VIP'?'pill-gold':'pill-green'}">${c.statut||'Actif'}</span></td>
      <td class="no-print"><button class="btn btn-sm btn-outline" onclick="_openClientForm('${c.id}')">✏ Modifier</button></td>
    </tr>`).join('')}</tbody>
  </table></div></div>`;
}
async function _openClientForm(id=null) {
  let c = { civilite:'M.', nationalite:'Française', statut:'Actif' };
  if (id) c = await DB.getClient(id);
  const html = `<div class="modal-overlay" id="modal-client" onclick="if(event.target===this)closeModal('modal-client')">
  <div class="modal"><button class="modal-close" onclick="closeModal('modal-client')">✕</button>
    <div class="modal-title">${id?'Modifier client':'Nouveau client'}</div>
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
    <div class="form-group" style="margin-top:10px;"><label>Notes</label><textarea id="cf-notes">${c.notes||''}</textarea></div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-client')">Annuler</button>
      <button class="btn btn-gold" onclick="_saveClient('${id||''}')">✓ Enregistrer</button>
    </div>
  </div></div>`;
  openModal(html, 'modal-client');
}
async function _saveClient(id) {
  const data = { civilite: document.getElementById('cf-civ').value, nom: document.getElementById('cf-nom').value, prenom: document.getElementById('cf-prenom').value, date_naissance: document.getElementById('cf-naiss').value||null, email: document.getElementById('cf-email').value, telephone: document.getElementById('cf-tel').value, adresse: document.getElementById('cf-adr').value, ville: document.getElementById('cf-ville').value, permis_numero: document.getElementById('cf-permis').value, statut: document.getElementById('cf-statut').value, notes: document.getElementById('cf-notes').value };
  if (id) data.id = id;
  try {
    setSyncStatus('syncing');
    await DB.saveClient(data);
    setSyncStatus('synced');
    closeModal('modal-client');
    toast(id?'Client mis à jour':'Client ajouté','success');
    await _renderClients();
  } catch(e) { setSyncStatus('offline'); toast('Erreur: '+e.message,'error'); }
}
