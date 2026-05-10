// ============================================================
// PAGE — Véhicules avec dégâts permanents
// ============================================================
Pages.vehicules = async function(filter = 'all') {
  const el = document.getElementById('page-vehicules');
  el.innerHTML = `
  <div style="display:flex;gap:12px;margin-bottom:22px;flex-wrap:wrap;" class="no-print">
    <button class="btn btn-gold" onclick="openVehiculeForm()">+ Ajouter un véhicule</button>
    <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;">
      ${['all','dispo','loue','maint'].map(f=>`<button class="btn btn-outline btn-sm" onclick="Pages.vehicules('${f}')">${{all:'Tous',dispo:'Disponibles',loue:'Loués',maint:'Entretien'}[f]}</button>`).join('')}
    </div>
  </div>
  <div id="veh-grid"><div class="spinner"></div></div>
  <!-- Input file global pour upload -->
  <input type="file" id="global-file-input" accept="image/*" style="display:none;" onchange="_globalFileHandler(this)">
  <input type="file" id="global-camera-input" accept="image/*" capture="environment" style="display:none;" onchange="_globalFileHandler(this)">`;

  try {
    let vehicules = await DB.getVehicules();
    if (filter !== 'all') vehicules = vehicules.filter(v => v.statut === filter);
    document.getElementById('veh-grid').innerHTML = vehicules.length === 0
      ? '<p style="color:var(--gray)">Aucun véhicule trouvé.</p>'
      : `<div class="veh-grid">${vehicules.map(v => `
        <div class="veh-card">
          <div class="veh-card-top" onclick="openVehiculeDetail('${v.id}')" style="cursor:pointer;">
            ${v.photo_url
              ? `<img src="${v.photo_url}" style="width:100%;height:100%;object-fit:cover;display:block;" draggable="false">`
              : `<svg viewBox="0 0 100 50" fill="none" style="width:90px;opacity:.25;"><ellipse cx="50" cy="25" rx="42" ry="20" fill="#2a2a2a" stroke="#B8952A" stroke-width=".8"/><circle cx="22" cy="18" r="7" fill="#111" stroke="#555" stroke-width="1.5"/><circle cx="78" cy="18" r="7" fill="#111" stroke="#555" stroke-width="1.5"/><circle cx="22" cy="32" r="7" fill="#111" stroke="#555" stroke-width="1.5"/><circle cx="78" cy="32" r="7" fill="#111" stroke="#555" stroke-width="1.5"/></svg>`}
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
            ${v.type_propriete==='sub'?`<div style="font-size:10px;color:var(--gold);margin-top:4px;">Prop: ${v.proprietaires?.nom||'?'} — ${v.taux_reversement}%</div>`:''}
            <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
              <button class="btn btn-outline btn-sm" style="flex:1;font-size:10px;" onclick="openVehiculeDetail('${v.id}')">✏ Détail</button>
              <button class="btn btn-sm" style="flex:1;font-size:10px;background:rgba(192,57,43,.15);border:1px solid rgba(192,57,43,.4);color:#f87171;" onclick="openDegatsVehicule('${v.id}','${v.marque} ${v.modele}')">🔴 Dégâts</button>
            </div>
          </div>
        </div>`).join('')}</div>`;
  } catch(e) {
    document.getElementById('veh-grid').innerHTML = `<p style="color:#f87171;">Erreur: ${e.message}</p>`;
  }
};

// ============================================================
// GESTIONNAIRE GLOBAL D'UPLOAD (évite problèmes mobile)
// ============================================================
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

  if (ctx.type === 'veh-photo') {
    await _doUploadVehPhoto(ctx.vehiculeId, file);
  } else if (ctx.type === 'degat-face') {
    await _doUploadDegaFace(ctx.vehiculeId, ctx.face, file);
  } else if (ctx.type === 'degat-photo') {
    await _doUploadDegaPhoto(ctx.degatId, file);
  }
  window._uploadContext = null;
}

// ============================================================
// DÉGÂTS ACTUELS DU VÉHICULE
// ============================================================
const DEGAT_FACES = {
  front: { label: 'Face avant' },
  left:  { label: 'Côté gauche' },
  rear:  { label: 'Face arrière' },
  right: { label: 'Côté droit' },
};

async function openDegatsVehicule(vehiculeId, vehiculeNom) {
  const [degats, faces] = await Promise.all([
    DB.getDegatsVehicule(vehiculeId),
    DB.getVehiculeFaces(vehiculeId),
  ]);
  const facePhotos = {};
  faces.forEach(f => { facePhotos[f.face] = f.photo_url; });

  window._degatState = {
    vehiculeId,
    vehiculeNom,
    faceActive: 'front',
    facePhotos,
    degats: degats.map(d => ({ ...d })),
  };

  const html = `<div class="modal-overlay" id="modal-degats" onclick="if(event.target===this)closeModal('modal-degats')">
  <div class="modal" style="max-width:900px;">
    <button class="modal-close" onclick="closeModal('modal-degats')">✕</button>
    <div class="modal-title">🔴 Dégâts actuels — ${vehiculeNom}</div>
    
    <!-- Sélection face -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:10px;">
      ${Object.entries(DEGAT_FACES).map(([k,v]) => `
      <button onclick="_degatSetFace('${k}')" id="degat-face-btn-${k}" 
        class="btn btn-outline btn-sm" 
        style="font-size:10px;padding:8px 4px;${k==='front'?'border-color:var(--gold);color:var(--gold);background:rgba(184,149,42,.1);':''}">
        ${v.label}
      </button>`).join('')}
    </div>

    <div class="grid-2">
      <!-- Zone photo -->
      <div>
        <div id="degat-photo-zone" style="position:relative;width:100%;background:#141414;border-radius:6px;border:1px solid #2a2a2a;overflow:hidden;min-height:200px;margin-bottom:8px;">
          <div id="degat-placeholder" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px;gap:12px;padding:16px;">
            <div style="font-size:12px;color:var(--gray);text-align:center;">Aucune photo pour cette face<br><span style="font-size:10px;">Ajoutez une photo pour annoter les dégâts</span></div>
            <button class="btn btn-outline btn-sm" onclick="_triggerUpload({type:'degat-face',vehiculeId:'${vehiculeId}',face:window._degatState.faceActive})">📁 Choisir une photo</button>
            <button class="btn btn-outline btn-sm" onclick="_triggerUpload({type:'degat-face',vehiculeId:'${vehiculeId}',face:window._degatState.faceActive},true)">📷 Prendre une photo</button>
          </div>
          <img id="degat-face-img" style="display:none;width:100%;height:auto;" draggable="false">
          <div id="degat-markers-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;"></div>
        </div>
        <div id="degat-photo-btns" style="display:none;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
          <button class="btn btn-outline btn-xs" onclick="_triggerUpload({type:'degat-face',vehiculeId:'${vehiculeId}',face:window._degatState.faceActive})">📁 Remplacer</button>
          <button class="btn btn-outline btn-xs" onclick="_triggerUpload({type:'degat-face',vehiculeId:'${vehiculeId}',face:window._degatState.faceActive},true)">📷 Appareil</button>
          <button class="btn btn-outline btn-xs" onclick="_degatAddMarker('${vehiculeId}')">+ Ajouter dégât</button>
        </div>
        <div style="font-size:10px;color:var(--gray);">💡 Cliquez sur la photo pour placer un marqueur • Glissez pour repositionner</div>
      </div>

      <!-- Liste dégâts -->
      <div>
        <div style="font-size:10px;color:var(--gold);letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">
          Dégâts — <span id="degat-face-label">Face avant</span>
        </div>
        <div id="degat-list" style="max-height:380px;overflow-y:auto;"></div>
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-degats')">Fermer</button>
    </div>
  </div></div>
  
  <div id="degat-lightbox" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:99999;align-items:center;justify-content:center;" onclick="this.style.display='none'">
    <img id="degat-lightbox-img" style="max-width:92vw;max-height:90vh;border-radius:4px;border:2px solid var(--gold);">
  </div>`;

  openModal(html, 'modal-degats');
  _degatUpdateDisplay();
  _degatSetupClick(vehiculeId);
}

function _degatSetFace(face) {
  window._degatState.faceActive = face;
  Object.keys(DEGAT_FACES).forEach(k => {
    const btn = document.getElementById(`degat-face-btn-${k}`);
    if (!btn) return;
    btn.style.borderColor = k === face ? 'var(--gold)' : '';
    btn.style.color = k === face ? 'var(--gold)' : '';
    btn.style.background = k === face ? 'rgba(184,149,42,.1)' : '';
  });
  const lbl = document.getElementById('degat-face-label');
  if (lbl) lbl.textContent = DEGAT_FACES[face]?.label || face;
  _degatUpdateDisplay();
  _degatSetupClick(window._degatState.vehiculeId);
}

function _degatUpdateDisplay() {
  const s = window._degatState;
  const photo = s.facePhotos[s.faceActive];
  const img = document.getElementById('degat-face-img');
  const placeholder = document.getElementById('degat-placeholder');
  const btns = document.getElementById('degat-photo-btns');

  if (photo) {
    if (img) { img.src = photo; img.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
    if (btns) btns.style.display = 'flex';
  } else {
    if (img) img.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
    if (btns) btns.style.display = 'none';
  }
  _degatRenderMarkers();
  _degatRenderList();
}

function _degatSetupClick(vehiculeId) {
  const zone = document.getElementById('degat-photo-zone');
  if (!zone) return;
  zone.onclick = function(evt) {
    const s = window._degatState;
    if (!s.facePhotos[s.faceActive]) return;
    if (evt.target.closest('.degat-marker')) return;
    if (evt.target.closest('button')) return;
    const rect = zone.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * 100;
    const y = ((evt.clientY - rect.top) / rect.height) * 100;
    _degatPlaceMarker(x, y, vehiculeId);
  };
}

async function _doUploadDegaFace(vehiculeId, face, file) {
  try {
    toast('Upload en cours...', 'info');
    const ext = file.name.split('.').pop();
    const path = `${vehiculeId}/face-${face}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('documents-vehicules').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('documents-vehicules').getPublicUrl(path);
    const url = urlData.publicUrl + '?t=' + Date.now();
    window._degatState.facePhotos[face] = url;
    await DB.saveVehiculeFace(vehiculeId, face, url);
    toast('Photo enregistrée ✓', 'success');
    _degatUpdateDisplay();
  } catch(e) { toast('Erreur: ' + e.message, 'error'); }
}

async function _degatAddMarker(vehiculeId) {
  const s = window._degatState;
  if (!s.facePhotos[s.faceActive]) { toast('Ajoutez d\'abord une photo', 'info'); return; }
  _degatPlaceMarker(50, 50, vehiculeId);
}

async function _degatPlaceMarker(x, y, vehiculeId) {
  const desc = prompt('Description du dégât:', '');
  if (desc === null) return;
  const s = window._degatState;
  const maxNum = s.degats.length > 0 ? Math.max(...s.degats.map(d => d.numero)) : 0;
  const newNum = maxNum + 1;
  try {
    const saved = await DB.saveDegat({ vehicule_id: vehiculeId, face: s.faceActive, x, y, numero: newNum, description: desc || `Dégât ${newNum}`, source: 'manuel' });
    s.degats.push(saved);
    toast('Dégât ajouté ✓', 'success');
    _degatUpdateDisplay();
  } catch(e) { toast('Erreur: ' + e.message, 'error'); }
}

function _degatRenderMarkers() {
  const overlay = document.getElementById('degat-markers-overlay');
  if (!overlay) return;
  overlay.innerHTML = '';
  const s = window._degatState;
  s.degats.filter(d => d.face === s.faceActive).forEach(d => {
    const marker = document.createElement('div');
    marker.className = 'degat-marker';
    marker.dataset.id = d.id;
    marker.style.cssText = `position:absolute;left:${d.x}%;top:${d.y}%;width:28px;height:28px;border-radius:50%;background:#C0392B;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;transform:translate(-50%,-50%);cursor:grab;user-select:none;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,.6);touch-action:none;`;
    marker.textContent = d.numero;
    marker.title = d.description;
    marker.addEventListener('mousedown', _degatStartDrag);
    marker.addEventListener('touchstart', _degatStartDragTouch, { passive: false });
    overlay.appendChild(marker);
  });
}

function _degatStartDrag(evt) {
  evt.stopPropagation(); evt.preventDefault();
  const marker = evt.currentTarget;
  const id = marker.dataset.id;
  const zone = document.getElementById('degat-photo-zone');
  marker.style.cursor = 'grabbing';
  const move = (e) => {
    const rect = zone.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(2, Math.min(98, ((e.clientY - rect.top) / rect.height) * 100));
    marker.style.left = x + '%'; marker.style.top = y + '%';
    const d = window._degatState.degats.find(d => d.id === id);
    if (d) { d.x = x; d.y = y; }
  };
  const up = async () => {
    marker.style.cursor = 'grab';
    const d = window._degatState.degats.find(d => d.id === id);
    if (d) await DB.saveDegat({ id: d.id, vehicule_id: d.vehicule_id, face: d.face, x: d.x, y: d.y, numero: d.numero, description: d.description }).catch(()=>{});
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
  };
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
}

function _degatStartDragTouch(evt) {
  evt.preventDefault(); evt.stopPropagation();
  const marker = evt.currentTarget;
  const id = marker.dataset.id;
  const zone = document.getElementById('degat-photo-zone');
  const move = (e) => {
    const touch = e.touches[0];
    const rect = zone.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(2, Math.min(98, ((touch.clientY - rect.top) / rect.height) * 100));
    marker.style.left = x + '%'; marker.style.top = y + '%';
    const d = window._degatState.degats.find(d => d.id === id);
    if (d) { d.x = x; d.y = y; }
  };
  const end = async () => {
    const d = window._degatState.degats.find(d => d.id === id);
    if (d) await DB.saveDegat({ id: d.id, vehicule_id: d.vehicule_id, face: d.face, x: d.x, y: d.y, numero: d.numero, description: d.description }).catch(()=>{});
    document.removeEventListener('touchmove', move);
    document.removeEventListener('touchend', end);
  };
  document.addEventListener('touchmove', move, { passive: false });
  document.addEventListener('touchend', end);
}

function _degatRenderList() {
  const el = document.getElementById('degat-list');
  if (!el) return;
  const s = window._degatState;
  const faceDegats = s.degats.filter(d => d.face === s.faceActive);
  const total = s.degats.length;
  if (total === 0) {
    el.innerHTML = '<p style="color:var(--gray);font-size:12px;text-align:center;padding:16px;">Aucun dégât enregistré</p>';
    return;
  }
  el.innerHTML = (faceDegats.length === 0
    ? '<p style="color:var(--gray);font-size:11px;text-align:center;padding:10px;">Aucun dégât sur cette face</p>'
    : faceDegats.map(d => `
    <div style="background:rgba(192,57,43,.08);border:1px solid rgba(192,57,43,.2);border-radius:3px;padding:8px 10px;margin-bottom:6px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <div style="width:24px;height:24px;border-radius:50%;background:#C0392B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">${d.numero}</div>
        <input value="${(d.description||'').replace(/'/g,"&#39;")}" placeholder="Description..."
          onchange="_degatUpdateDesc('${d.id}', this.value)"
          style="flex:1;background:#111;border:1px solid #2a2a2a;border-radius:2px;padding:5px 8px;color:#ccc;font-size:12px;outline:none;">
        <button onclick="_degatDelete('${d.id}')" style="background:none;border:none;color:#555;cursor:pointer;font-size:20px;line-height:1;flex-shrink:0;">×</button>
      </div>
      ${d.source==='retour'?`<div style="font-size:9px;color:#fb923c;margin-bottom:5px;">⚠ Retour ${d.reservation_id||''}</div>`:''}
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        ${d.photo_url
          ? `<img src="${d.photo_url}" onclick="document.getElementById('degat-lightbox-img').src='${d.photo_url}';document.getElementById('degat-lightbox').style.display='flex';" style="width:60px;height:45px;object-fit:cover;border-radius:3px;cursor:pointer;border:1px solid var(--gold);">
             <button onclick="_degatDeletePhoto('${d.id}')" class="btn btn-xs btn-outline" style="color:#f87171;border-color:#f87171;">🗑</button>`
          : `<button class="btn btn-xs btn-outline" onclick="_triggerUpload({type:'degat-photo',degatId:'${d.id}'})">📁 Photo</button>
             <button class="btn btn-xs btn-outline" onclick="_triggerUpload({type:'degat-photo',degatId:'${d.id}'},true)">📷 Appareil</button>`}
      </div>
    </div>`).join('')) +
    (total > faceDegats.length ? `<div style="font-size:10px;color:var(--gray);text-align:center;padding:8px;">${total - faceDegats.length} dégât(s) sur d'autres faces</div>` : '');
}

async function _degatUpdateDesc(id, desc) {
  const d = window._degatState?.degats.find(x => x.id === id);
  if (d) {
    d.description = desc;
    await DB.saveDegat({ id, vehicule_id: d.vehicule_id, face: d.face, x: d.x, y: d.y, numero: d.numero, description: desc }).catch(()=>{});
  }
}

async function _degatDelete(id) {
  if (!confirm('Supprimer ce dégât ?')) return;
  try {
    await DB.deleteDegat(id);
    window._degatState.degats = window._degatState.degats.filter(d => d.id !== id);
    toast('Dégât supprimé', 'success');
    _degatUpdateDisplay();
  } catch(e) { toast('Erreur: ' + e.message, 'error'); }
}

async function _doUploadDegaPhoto(degatId, file) {
  const reader = new FileReader();
  reader.onload = async function(e) {
    const d = window._degatState?.degats.find(x => x.id === degatId);
    if (d) {
      d.photo_url = e.target.result;
      await DB.saveDegat({ id: degatId, vehicule_id: d.vehicule_id, face: d.face, x: d.x, y: d.y, numero: d.numero, description: d.description, photo_url: e.target.result }).catch(()=>{});
      toast('Photo ajoutée ✓', 'success');
      _degatRenderList();
    }
  };
  reader.readAsDataURL(file);
}

async function _degatDeletePhoto(degatId) {
  const d = window._degatState?.degats.find(x => x.id === degatId);
  if (d) {
    d.photo_url = null;
    await DB.saveDegat({ id: degatId, vehicule_id: d.vehicule_id, face: d.face, x: d.x, y: d.y, numero: d.numero, description: d.description, photo_url: null }).catch(()=>{});
    _degatRenderList();
  }
}

// ============================================================
// DÉTAIL & FORMULAIRE VÉHICULE
// ============================================================
async function openVehiculeDetail(id) {
  const v = await DB.getVehicule(id);
  const html = `<div class="modal-overlay" id="modal-veh-detail" onclick="if(event.target===this)closeModal('modal-veh-detail')">
  <div class="modal" style="max-width:700px;">
    <button class="modal-close" onclick="closeModal('modal-veh-detail')">✕</button>
    <div style="display:flex;gap:18px;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;">
      <div style="width:160px;height:110px;background:var(--dark3);border-radius:4px;overflow:hidden;flex-shrink:0;position:relative;border:1px solid #2a2a2a;">
        ${v.photo_url ? `<img src="${v.photo_url}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:32px;opacity:.3;">🚗</div>`}
      </div>
      <div style="flex:1;">
        <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;">${v.marque} ${v.modele}</div>
        <div style="margin-top:4px;">${pillVeh(v.statut)}</div>
        <div style="font-size:28px;font-family:'Cormorant Garamond',serif;color:var(--gold);font-weight:700;margin-top:8px;">${fmt.km(v.km_actuel)}</div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" onclick="_triggerUploadVeh('${v.id}')">📁 Photo véhicule</button>
          <button class="btn btn-outline btn-sm" onclick="_triggerUploadVehCamera('${v.id}')">📷 Appareil</button>
        </div>
      </div>
    </div>
    <table class="tbl"><tbody>
      <tr><td style="color:var(--gray)">Immatriculation</td><td style="font-weight:600;color:var(--gold)">${v.immatriculation}</td><td style="color:var(--gray)">Année</td><td>${v.annee}</td></tr>
      <tr><td style="color:var(--gray)">Couleur</td><td>${v.couleur}</td><td style="color:var(--gray)">Puissance</td><td>${v.puissance_ch} ch</td></tr>
      <tr><td style="color:var(--gray)">Tarif/j</td><td style="color:var(--gold);font-weight:600">${fmt.money(v.tarif_jour)}</td><td style="color:var(--gray)">Caution</td><td>${fmt.money(v.caution)}</td></tr>
    </tbody></table>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-veh-detail')">Fermer</button>
      <button class="btn btn-outline" style="color:#f87171;border-color:rgba(192,57,43,.4);" onclick="closeModal('modal-veh-detail');openDegatsVehicule('${v.id}','${v.marque} ${v.modele}')">🔴 Dégâts</button>
      <button class="btn btn-gold" onclick="closeModal('modal-veh-detail');openVehiculeForm('${v.id}')">✏ Modifier</button>
    </div>
  </div></div>`;
  openModal(html, 'modal-veh-detail');
  window._currentVehId = v.id;
}

function _triggerUploadVeh(vid) {
  window._currentVehId = vid;
  _triggerUpload({ type: 'veh-photo', vehiculeId: vid });
}
function _triggerUploadVehCamera(vid) {
  window._currentVehId = vid;
  _triggerUpload({ type: 'veh-photo', vehiculeId: vid }, true);
}

async function _doUploadVehPhoto(vehiculeId, file) {
  try {
    toast('Upload en cours...', 'info');
    const ext = file.name.split('.').pop();
    const path = `${vehiculeId}/photo-principale.${ext}`;
    const { error } = await supabase.storage.from('documents-vehicules').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('documents-vehicules').getPublicUrl(path);
    await supabase.from('vehicules').update({ photo_url: urlData.publicUrl + '?t=' + Date.now() }).eq('id', vehiculeId);
    toast('Photo mise à jour ✓', 'success');
    closeModal('modal-veh-detail');
    Pages.vehicules();
  } catch(e) { toast('Erreur: ' + e.message, 'error'); }
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
    <div class="form-section"><div class="form-section-title">Identification</div>
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
    <div class="form-section"><div class="form-section-title">Propriété & Tarifs</div>
      <div class="form-grid">
        <div class="form-group"><label>Type</label>
          <select id="vf-type" onchange="document.getElementById('vf-prop-row').style.display=this.value==='sub'?'flex':'none'">
            <option value="own" ${v.type_propriete==='own'?'selected':''}>Véhicule propre (LKB)</option>
            <option value="sub" ${v.type_propriete==='sub'?'selected':''}>Sous-location</option>
          </select>
        </div>
        <div class="form-group" id="vf-prop-row" style="display:${v.type_propriete==='sub'?'flex':'none'};flex-direction:column;gap:5px;">
          <label>Propriétaire</label>
          <select id="vf-prop">${props.map(p=>`<option value="${p.id}" ${v.proprietaire_id===p.id?'selected':''}>${p.nom} ${p.prenom||''}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Reversement (%)</label><input type="number" id="vf-rate" value="${v.taux_reversement||0}"></div>
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
  } catch(e) { setSyncStatus('offline'); toast('Erreur: ' + e.message, 'error'); }
}

async function deleteVehicule(id) {
  if (!confirm('Supprimer ce véhicule ?')) return;
  try {
    await DB.deleteVehicule(id);
    closeModal('modal-veh-form');
    toast('Véhicule supprimé', 'success');
    Pages.vehicules();
  } catch(e) { toast('Erreur: ' + e.message, 'error'); }
}
