// ============================================================
// LKB LOCATION — Utilitaires UI
// ============================================================

// ---- TOAST ----
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.style.transition = 'opacity .4s', 2200);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 2600);
}

// ---- MODALS ----
function openModal(html, id = 'modal-main') {
  let existing = document.getElementById(id);
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = id; el.innerHTML = html;
  document.getElementById('modals-container').appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeModal(id); });
}

function closeModal(id = 'modal-main') {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ---- TABS ----
function switchTab(el, targetId) {
  const container = el.closest('.page') || document;
  container.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const prefix = targetId.substring(0, targetId.lastIndexOf('-') + 1);
  container.querySelectorAll(`[id^="${prefix}"]`).forEach(t => {
    t.style.display = t.id === targetId ? 'block' : 'none';
  });
}

// ---- PAGE NAV ----
const pageMeta = {
  dashboard: { title: 'Tableau de bord', sub: 'Vue d\'ensemble — LKB Location' },
  planning: { title: 'Planning', sub: 'Calendrier des disponibilités' },
  reservations: { title: 'Réservations & Contrats', sub: 'Gestion des contrats de location' },
  edl: { title: 'États des lieux', sub: 'Check-in & Check-out véhicules' },
  vehicules: { title: 'Véhicules', sub: 'Gestion du parc automobile' },
  maintenance: { title: 'Entretien & Alertes', sub: 'Suivi technique de la flotte' },
  clients: { title: 'Clients & Conducteurs', sub: 'Base de données clients' },
  documents: { title: 'Documents', sub: 'Archivage documentaire' },
  facturation: { title: 'Facturation', sub: 'Devis, factures & avoirs' },
  comptabilite: { title: 'Comptabilité', sub: 'Journal de caisse & bilan financier' },
  proprietaires: { title: 'Propriétaires', sub: 'Partenaires & sous-location' },
  sinistres: { title: 'Sinistres', sub: 'Déclarations & suivi dossiers' },
  parametres: { title: 'Paramètres', sub: 'Configuration de l\'application' },
};

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id)?.classList.add('active');
  document.querySelector(`.nav-item[onclick="showPage('${id}')"]`)?.classList.add('active');
  const meta = pageMeta[id] || { title: id, sub: '' };
  document.getElementById('page-title').textContent = meta.title;
  document.getElementById('page-sub').textContent = meta.sub;
  // Trigger render
  const renders = {
    dashboard: Pages.dashboard,
    vehicules: Pages.vehicules,
    planning: Pages.planning,
    reservations: Pages.reservations,
    edl: Pages.edl,
    clients: Pages.clients,
    maintenance: Pages.maintenance,
    comptabilite: Pages.comptabilite,
    facturation: Pages.facturation,
    proprietaires: Pages.proprietaires,
    sinistres: Pages.sinistres,
    documents: Pages.documents,
    parametres: Pages.parametres,
  };
  if (renders[id]) renders[id]();
}

// ---- SYNC STATUS ----
function setSyncStatus(status) {
  const dot = document.getElementById('sync-dot');
  const label = document.getElementById('sync-label');
  if (!dot) return;
  dot.className = 'sync-dot ' + (status === 'synced' ? '' : status === 'syncing' ? 'syncing' : 'offline');
  label.textContent = status === 'synced' ? 'Synchronisé' : status === 'syncing' ? 'Sync...' : 'Hors ligne';
}

// ---- FORMAT HELPERS ----
const fmt = {
  money: n => n != null ? Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : '—',
  date: s => s ? new Date(s).toLocaleDateString('fr-FR') : '—',
  dateTime: s => s ? new Date(s).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—',
  km: n => n != null ? Number(n).toLocaleString('fr-FR') + ' km' : '—',
  days: (d1, d2) => {
    const diff = Math.round((new Date(d2) - new Date(d1)) / 86400000);
    return diff > 0 ? diff + ' j' : '—';
  },
};

// ---- PRINT ----
function printDoc(htmlContent) {
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>LKB Location — Document</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');
      body { margin:0; background:#fff; font-family:'Montserrat',sans-serif; }
      @page { margin:15mm 12mm; }
    </style>
  </head><body>${htmlContent}</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 500);
}

// ---- ALERTS PANEL ----
async function showAlerts() {
  let alertes = [];
  try { alertes = await DB.getAlertes(); } catch(e) {}
  const html = `
  <div class="modal-overlay" id="modal-alerts" onclick="if(event.target===this)closeModal('modal-alerts')">
    <div class="modal" style="max-width:560px;">
      <button class="modal-close" onclick="closeModal('modal-alerts')">✕</button>
      <div class="modal-title">Alertes actives</div>
      ${alertes.length === 0
        ? '<p style="color:var(--gray);font-size:13px;">Aucune alerte active.</p>'
        : alertes.map(a => `
          <div class="alert alert-${a.echeance_date && new Date(a.echeance_date) < new Date() ? 'red' : 'orange'}">
            <div>
              <strong>${a.vehicules?.marque} ${a.vehicules?.modele}</strong> — ${a.type}<br>
              <small>${a.echeance_date ? '📅 ' + fmt.date(a.echeance_date) : ''}${a.echeance_km ? ' · 📏 à ' + fmt.km(a.echeance_km) : ''}</small>
            </div>
          </div>`).join('')}
      <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('modal-alerts')">Fermer</button></div>
    </div>
  </div>`;
  openModal(html, 'modal-alerts');
}

// ---- NEW RESERVATION shortcut ----
function openNewReservation() { Pages.reservations(true); }

// ---- PILL HELPERS ----
const pillStatutVeh = { dispo: 'pill-green', loue: 'pill-blue', maint: 'pill-orange', indispo: 'pill-red' };
const labelStatutVeh = { dispo: 'Disponible', loue: 'Loué', maint: 'Entretien', indispo: 'Indisponible' };
const pillStatutRes = { active: 'pill-green', retard: 'pill-red', 'retour-j': 'pill-blue', cloture: 'pill-gray', annule: 'pill-gray' };
const labelStatutRes = { active: 'En cours', retard: 'Retard', 'retour-j': 'Retour J', cloture: 'Clôturé', annule: 'Annulé' };

function pillVeh(s) { return `<span class="pill ${pillStatutVeh[s]||'pill-gray'}">${labelStatutVeh[s]||s}</span>`; }
function pillRes(s) { return `<span class="pill ${pillStatutRes[s]||'pill-gray'}">${labelStatutRes[s]||s}</span>`; }
