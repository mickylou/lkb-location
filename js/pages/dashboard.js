// ============================================================
// PAGE — Tableau de bord
// ============================================================

Pages = window.Pages || {};

Pages.dashboard = async function() {
  const el = document.getElementById('page-dashboard');
  el.innerHTML = `<div class="spinner"></div>`;
  try {
    const [stats, reservations, alertes] = await Promise.all([
      DB.getDashboardStats(),
      DB.getReservations(),
      DB.getAlertes(),
    ]);
    document.getElementById('alert-count').textContent = alertes.length;
    const today = new Date().toISOString().split('T')[0];
    const retours = reservations.filter(r => r.date_retour_prevue?.startsWith(today));
    const departs = reservations.filter(r => r.date_depart?.startsWith(today));

    el.innerHTML = `
    <div class="grid-4" style="margin-bottom:20px;">
      <div class="stat-card"><div class="val">${stats.locations_actives}</div><div class="lbl">Locations actives</div><div class="trend">${stats.retards > 0 ? `<span class="trend-down">⚠ ${stats.retards} retard(s)</span>` : '<span style="color:#666">Aucun retard</span>'}</div></div>
      <div class="stat-card"><div class="val">${stats.dispo}</div><div class="lbl">Véhicules dispos</div><div class="trend" style="color:#666">sur ${stats.total_vehicules} au total</div></div>
      <div class="stat-card"><div class="val">${fmt.money(stats.ca_mois)}</div><div class="lbl">CA du mois</div><div class="trend trend-up">Recettes encaissées</div></div>
      <div class="stat-card"><div class="val">${retours.length + departs.length}</div><div class="lbl">Mouvements aujourd'hui</div><div class="trend" style="color:#666">${retours.length} retour(s) · ${departs.length} départ(s)</div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">Alertes <small>Actions requises</small></div></div>
        ${alertes.length === 0
          ? '<p style="color:var(--gray);font-size:13px;">Aucune alerte active.</p>'
          : alertes.slice(0,5).map(a => {
              const isUrgent = a.echeance_date && new Date(a.echeance_date) < new Date();
              return `<div class="alert alert-${isUrgent?'red':'orange'}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <div><strong>${a.vehicules?.marque} ${a.vehicules?.modele}</strong> — ${a.type}${a.echeance_date ? ' · ' + fmt.date(a.echeance_date) : ''}</div>
              </div>`;
            }).join('')}
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Mouvements du jour <small>${fmt.date(today)}</small></div></div>
        ${retours.length + departs.length === 0
          ? '<p style="color:var(--gray);font-size:13px;">Aucun mouvement prévu aujourd\'hui.</p>'
          : `<table class="tbl">
            <thead><tr><th>Heure</th><th>Véhicule</th><th>Client</th><th>Type</th><th class="no-print">Action</th></tr></thead>
            <tbody>
              ${[...departs.map(r=>({...r,_type:'depart'})), ...retours.map(r=>({...r,_type:'retour'}))].map(r=>`
              <tr>
                <td>${r.date_depart ? new Date(r.date_depart).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                <td>${r.vehicules?.marque} ${r.vehicules?.modele}</td>
                <td>${r.clients?.nom} ${r.clients?.prenom}</td>
                <td><span class="pill ${r._type==='depart'?'pill-green':'pill-blue'}">${r._type==='depart'?'Départ':'Retour'}</span></td>
                <td class="no-print"><button class="btn btn-sm btn-outline" onclick="showPage('edl')">EDL</button></td>
              </tr>`).join('')}
            </tbody>
          </table>`}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Locations en cours <small>Flotte active</small></div>
        <button class="btn btn-outline btn-sm" onclick="showPage('reservations')">Tout voir</button>
      </div>
      ${reservations.filter(r=>['active','retard','retour-j'].includes(r.statut)).length === 0
        ? '<p style="color:var(--gray);font-size:13px;">Aucune location en cours.</p>'
        : `<table class="tbl">
          <thead><tr><th>#</th><th>Véhicule</th><th>Client</th><th>Départ</th><th>Retour prévu</th><th>Total prévu</th><th>Statut</th></tr></thead>
          <tbody>
            ${reservations.filter(r=>['active','retard','retour-j'].includes(r.statut)).map(r=>`
            <tr>
              <td style="color:var(--gold);font-weight:600">${r.id}</td>
              <td>${r.vehicules?.marque} ${r.vehicules?.modele}</td>
              <td>${r.clients?.civilite||''} ${r.clients?.nom} ${r.clients?.prenom}</td>
              <td>${fmt.date(r.date_depart)}</td>
              <td>${fmt.date(r.date_retour_prevue)}</td>
              <td style="color:var(--gold);font-weight:600">${fmt.money(r.total_prevu)}</td>
              <td>${pillRes(r.statut)}</td>
            </tr>`).join('')}
          </tbody>
        </table>`}
    </div>

    <div class="grid-3">
      <div class="card">
        <div class="card-title" style="margin-bottom:14px;">Recettes du mois</div>
        <div style="font-size:30px;font-family:'Cormorant Garamond',serif;color:var(--gold);font-weight:700;">${fmt.money(stats.ca_mois)}</div>
        <hr class="sec-divider">
        <div style="font-size:12px;color:#aaa;display:flex;justify-content:space-between;"><span>Bénéfice net estimé</span><span style="color:#4ade80;font-weight:600">${fmt.money(stats.ca_mois - stats.charges_mois)}</span></div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:14px;">Charges du mois</div>
        <div style="font-size:30px;font-family:'Cormorant Garamond',serif;color:#f87171;font-weight:700;">${fmt.money(stats.charges_mois)}</div>
        <hr class="sec-divider">
        <div style="font-size:12px;color:#aaa;display:flex;justify-content:space-between;"><span>Taux de charge</span><span style="color:#fb923c;font-weight:600">${stats.ca_mois > 0 ? Math.round(stats.charges_mois/stats.ca_mois*100) : 0}%</span></div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:14px;">Disponibilité flotte</div>
        <div style="font-size:30px;font-family:'Cormorant Garamond',serif;color:#4ade80;font-weight:700;">${stats.total_vehicules > 0 ? Math.round(stats.dispo/stats.total_vehicules*100) : 0}%</div>
        <hr class="sec-divider">
        <div class="progress-bar"><div class="progress-fill" style="width:${stats.total_vehicules > 0 ? Math.round(stats.dispo/stats.total_vehicules*100) : 0}%"></div></div>
        <div style="font-size:11px;color:#666;margin-top:6px;">${stats.dispo} dispo · ${stats.loue} loué · ${stats.maint} entretien</div>
      </div>
    </div>`;
  } catch(e) {
    el.innerHTML = `<div class="card"><p style="color:#f87171;">Erreur de chargement: ${e.message}</p><p style="color:var(--gray);font-size:12px;margin-top:8px;">Vérifiez votre configuration Supabase dans js/config.js</p></div>`;
  }
};
