// ============================================================
// PAGE — Tableau de bord (cliquable)
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

    const kpiStyle = 'cursor:pointer;transition:all .2s;';
    const kpiHover = 'onmouseover="this.style.borderColor=\'var(--gold)\'" onmouseout="this.style.borderColor=\'#222\'"';

    el.innerHTML = `
    <div class="grid-4" style="margin-bottom:20px;">
      <div class="stat-card" style="${kpiStyle}" ${kpiHover} onclick="showPage('reservations')" title="Voir les réservations">
        <div class="val">${stats.locations_actives}</div>
        <div class="lbl">Locations actives</div>
        <div class="trend">${stats.retards > 0 ? `<span class="trend-down">⚠ ${stats.retards} retard(s)</span>` : '<span style="color:#666">Aucun retard</span>'}</div>
        <div style="font-size:9px;color:#444;margin-top:4px;">→ Voir réservations</div>
      </div>
      <div class="stat-card" style="${kpiStyle}" ${kpiHover} onclick="showPage('vehicules')" title="Voir les véhicules">
        <div class="val">${stats.dispo}</div>
        <div class="lbl">Véhicules dispos</div>
        <div class="trend" style="color:#666">sur ${stats.total_vehicules} au total</div>
        <div style="font-size:9px;color:#444;margin-top:4px;">→ Voir véhicules</div>
      </div>
      <div class="stat-card" style="${kpiStyle}" ${kpiHover} onclick="showPage('comptabilite')" title="Voir la comptabilité">
        <div class="val">${fmt.money(stats.ca_mois)}</div>
        <div class="lbl">CA du mois</div>
        <div class="trend trend-up">Recettes encaissées</div>
        <div style="font-size:9px;color:#444;margin-top:4px;">→ Voir comptabilité</div>
      </div>
      <div class="stat-card" style="${kpiStyle}" ${kpiHover} onclick="showPage('reservations')" title="Voir les mouvements">
        <div class="val">${retours.length + departs.length}</div>
        <div class="lbl">Mouvements aujourd'hui</div>
        <div class="trend" style="color:#666">${retours.length} retour(s) · ${departs.length} départ(s)</div>
        <div style="font-size:9px;color:#444;margin-top:4px;">→ Voir réservations</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card" style="${kpiStyle}" ${kpiHover} onclick="showAlerts()">
        <div class="card-header"><div class="card-title">Alertes <small>Actions requises — cliquez pour voir</small></div></div>
        ${alertes.length === 0
          ? '<p style="color:var(--gray);font-size:13px;">Aucune alerte active.</p>'
          : alertes.slice(0,4).map(a => {
              const isUrgent = a.echeance_date && new Date(a.echeance_date) < new Date();
              return `<div class="alert alert-${isUrgent?'red':'orange'}">
                <div><strong>${a.vehicules?.marque} ${a.vehicules?.modele}</strong> — ${a.type}${a.echeance_date ? ' · ' + fmt.date(a.echeance_date) : ''}</div>
              </div>`;
            }).join('')}
        ${alertes.length > 4 ? `<div style="font-size:11px;color:var(--gold);text-align:center;margin-top:6px;">+ ${alertes.length-4} autre(s) alerte(s)</div>` : ''}
      </div>

      <div class="card" style="${kpiStyle}" ${kpiHover} onclick="showPage('reservations')">
        <div class="card-header"><div class="card-title">Mouvements du jour <small>${fmt.date(today)} — cliquez pour voir</small></div></div>
        ${retours.length + departs.length === 0
          ? '<p style="color:var(--gray);font-size:13px;">Aucun mouvement prévu aujourd\'hui.</p>'
          : `<table class="tbl">
            <thead><tr><th>Véhicule</th><th>Client</th><th>Type</th></tr></thead>
            <tbody>
              ${[...departs.map(r=>({...r,_type:'depart'})), ...retours.map(r=>({...r,_type:'retour'}))].map(r=>`
              <tr>
                <td>${r.vehicules?.marque} ${r.vehicules?.modele}</td>
                <td>${r.clients?.nom} ${r.clients?.prenom||''}</td>
                <td><span class="pill ${r._type==='depart'?'pill-green':'pill-blue'}">${r._type==='depart'?'Départ':'Retour'}</span></td>
              </tr>`).join('')}
            </tbody>
          </table>`}
      </div>
    </div>

    <div class="card" style="${kpiStyle}" ${kpiHover} onclick="showPage('reservations')">
      <div class="card-header">
        <div class="card-title">Locations en cours <small>Flotte active — cliquez pour voir</small></div>
        <button class="btn btn-outline btn-sm no-print" onclick="event.stopPropagation();showPage('reservations')">Tout voir</button>
      </div>
      ${reservations.filter(r=>['active','retard','retour-j'].includes(r.statut)).length === 0
        ? '<p style="color:var(--gray);font-size:13px;">Aucune location en cours.</p>'
        : `<div style="overflow-x:auto;"><table class="tbl">
          <thead><tr><th>#</th><th>Véhicule</th><th>Client</th><th>Départ</th><th>Retour prévu</th><th>Total</th><th>Statut</th></tr></thead>
          <tbody>
            ${reservations.filter(r=>['active','retard','retour-j'].includes(r.statut)).map(r=>`
            <tr>
              <td style="color:var(--gold);font-weight:600">${r.id}</td>
              <td>${r.vehicules?.marque} ${r.vehicules?.modele}</td>
              <td>${r.clients?.civilite||''} ${r.clients?.nom} ${r.clients?.prenom||''}</td>
              <td>${fmt.date(r.date_depart)}</td>
              <td>${fmt.date(r.date_retour_prevue)}</td>
              <td style="color:var(--gold);font-weight:600">${fmt.money(r.total_prevu)}</td>
              <td>${pillRes(r.statut)}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>`}
    </div>

    <div class="grid-3">
      <div class="stat-card" style="${kpiStyle}" ${kpiHover} onclick="showPage('comptabilite')" title="Voir comptabilité">
        <div class="val" style="color:#4ade80">${fmt.money(stats.ca_mois)}</div>
        <div class="lbl">Recettes du mois</div>
        <div style="font-size:9px;color:#444;margin-top:8px;">→ Voir comptabilité</div>
      </div>
      <div class="stat-card" style="${kpiStyle}" ${kpiHover} onclick="showPage('comptabilite')" title="Voir charges">
        <div class="val" style="color:#f87171">${fmt.money(stats.charges_mois)}</div>
        <div class="lbl">Charges du mois</div>
        <div style="font-size:9px;color:#444;margin-top:8px;">→ Voir comptabilité</div>
      </div>
      <div class="stat-card" style="${kpiStyle}" ${kpiHover} onclick="showPage('vehicules')" title="Voir véhicules">
        <div class="val" style="color:#4ade80">${stats.total_vehicules > 0 ? Math.round(stats.dispo/stats.total_vehicules*100) : 0}%</div>
        <div class="lbl">Disponibilité flotte</div>
        <div class="progress-bar" style="margin-top:8px;"><div class="progress-fill" style="width:${stats.total_vehicules > 0 ? Math.round(stats.dispo/stats.total_vehicules*100) : 0}%"></div></div>
        <div style="font-size:11px;color:#666;margin-top:6px;">${stats.dispo} dispo · ${stats.loue} loué · ${stats.maint} entretien</div>
        <div style="font-size:9px;color:#444;margin-top:4px;">→ Voir véhicules</div>
      </div>
    </div>`;
  } catch(e) {
    el.innerHTML = `<div class="card"><p style="color:#f87171;">Erreur: ${e.message}</p></div>`;
  }
};
