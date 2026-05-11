// ============================================================
// PAGE — États des lieux
// ============================================================
Pages._edlDamages = [];
Pages._edlCounter = 0;
Pages._edlFaceActive = 'front';
Pages._edlFacePhotos = { front: null, left: null, rear: null, right: null };

const EDL_FACES = {
  front: { label: 'Face avant' },
  left:  { label: 'Côté gauche' },
  rear:  { label: 'Face arrière' },
  right: { label: 'Côté droit' },
};

Pages.edl = async function() {
  const el = document.getElementById('page-edl');
  el.innerHTML = `
  <div class="tabs">
    <div class="tab active" onclick="switchTab(this,'edl-tab-new')">Nouvel EDL</div>
    <div class="tab" onclick="switchTab(this,'edl-tab-list');_loadEDLList()">Historique</div>
  </div>
  <div id="edl-tab-new">
    <div class="grid-2">
      <!-- Infos -->
      <div class="card">
        <div class="card-header"><div class="card-title">Informations <small>Départ / Retour</small></div></div>
        <div class="form-grid">
          <div class="form-group"><label>Type</label><select id="edl-type"><option value="depart">Départ</option><option value="retour">Retour</option></select></div>
          <div class="form-group"><label>N° Contrat</label><select id="edl-resa"><option value="">Chargement...</option></select></div>
          <div class="form-group"><label>Date & Heure</label><input type="datetime-local" id="edl-date" value="${new Date().toISOString().slice(0,16)}"></div>
          <div class="form-group"><label>Kilométrage</label><input type="number" id="edl-km" placeholder="km au compteur"></div>
          <div class="form-group"><label>Carburant</label><select id="edl-fuel"><option>Plein</option><option>3/4</option><option>1/2</option><option>1/4</option><option>Réserve</option></select></div>
          <div class="form-group"><label>Propreté ext.</label><select id="edl-ext"><option>Très propre</option><option>Correct</option><option>Sale</option></select></div>
          <div class="form-group"><label>Propreté int.</label><select id="edl-int"><option>Très propre</option><option>Correct</option><option>Sale</option></select></div>
          <div class="form-group"><label>Pression pneus</label><select id="edl-pneus"><option>Conforme</option><option>Avant G bas</option><option>Avant D bas</option><option>Arrière G bas</option><option>Arrière D bas</option></select></div>
        </div>
        <div class="form-section" style="margin-top:14px;"><div class="form-section-title">Équipements</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;font-size:12px;">
            <label style="display:flex;gap:7px;align-items:center;cursor:pointer;"><input type="checkbox" id="edl-docs" checked> Documents de bord</label>
            <label style="display:flex;gap:7px;align-items:center;cursor:pointer;"><input type="checkbox" id="edl-kit" checked> Kit sécurité</label>
            <label style="display:flex;gap:7px;align-items:center;cursor:pointer;"><input type="checkbox" id="edl-roue" checked> Roue de secours</label>
            <label style="display:flex;gap:7px;align-items:center;cursor:pointer;"><input type="checkbox" id="edl-cles" checked> Clés</label>
            <label style="display:flex;gap:7px;align-items:center;cursor:pointer;"><input type="checkbox" id="edl-voyants" checked> Aucun voyant allumé</label>
          </div>
        </div>
        <div class="form-group" style="margin-top:14px;"><label>Observations</label><textarea id="edl-obs" rows="3"></textarea></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">
          <button class="btn btn-gold" onclick="_saveEDL()">✓ Valider EDL</button>
          <button class="btn btn-outline" onclick="_printEDL()">🖨 Imprimer</button>
        </div>
      </div>

      <!-- Photos & dommages -->
      <div class="card">
        <div class="card-header"><div class="card-title">Photos & dommages <small>Sélectionnez une face</small></div></div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:10px;">
          ${Object.entries(EDL_FACES).map(([k,v]) => `
          <button onclick="_edlSetFace('${k}')" id="edl-face-btn-${k}" class="btn btn-outline btn-sm"
            style="font-size:10px;padding:8px 4px;${k==='front'?'border-color:var(--gold);color:var(--gold);background:rgba(184,149,42,.1);':''}">
            ${v.label}
          </button>`).join('')}
        </div>

        <div id="edl-photo-zone" style="position:relative;width:100%;background:#141414;border-radius:6px;border:1px solid #2a2a2a;overflow:hidden;min-height:180px;margin-bottom:8px;">
          <div id="edl-photo-placeholder" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:180px;gap:10px;padding:16px;">
            <div style="font-size:11px;color:var(--gray);text-align:center;">Aucune photo — ajoutez une photo de la face</div>
            <button class="btn btn-outline btn-sm" onclick="_triggerUpload({type:'edl-face'})">📁 Choisir une photo</button>
            <button class="btn btn-outline btn-sm" onclick="_triggerUpload({type:'edl-face'},true)">📷 Prendre une photo</button>
          </div>
          <img id="edl-face-img" style="display:none;width:100%;height:auto;" draggable="false">
          <div id="edl-markers-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;"></div>
        </div>

        <div id="edl-photo-btns" style="display:none;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
          <button class="btn btn-outline btn-xs" onclick="_triggerUpload({type:'edl-face'})">📁 Remplacer</button>
          <button class="btn btn-outline btn-xs" onclick="_triggerUpload({type:'edl-face'},true)">📷 Appareil</button>
          <button class="btn btn-outline btn-xs" onclick="_edlAddMarker()">+ Dommage</button>
          <button class="btn btn-outline btn-xs" style="color:#f87171;border-color:rgba(192,57,43,.4);" onclick="_edlRemoveFacePhoto()">🗑 Photo</button>
        </div>

        <div style="font-size:10px;color:var(--gray);margin-bottom:10px;">💡 Cliquez sur la photo · Glissez un marqueur pour repositionner</div>
        <div id="edl-damage-list"></div>
        <button class="btn btn-outline btn-xs" style="margin-top:8px;" onclick="Pages._edlDamages=Pages._edlDamages.filter(d=>d.face!==Pages._edlFaceActive);_renderEdlDamages();">🗑 Effacer cette face</button>
      </div>
    </div>
  </div>
  <div id="edl-tab-list" style="display:none;"><div class="card"><div class="spinner"></div></div></div>
  <div id="edl-lightbox" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;align-items:center;justify-content:center;" onclick="this.style.display='none'">
    <img id="edl-lightbox-img" style="max-width:90vw;max-height:90vh;border-radius:4px;border:2px solid var(--gold);">
  </div>`;

  Pages._edlDamages = [];
  Pages._edlCounter = 0;
  Pages._edlFaceActive = 'front';
  Pages._edlFacePhotos = { front: null, left: null, rear: null, right: null };
  _renderEdlDamages();
  _edlSetupPhotoClick();

  try {
    const res = await DB.getReservations();
    const sel = document.getElementById('edl-resa');
    sel.innerHTML = `<option value="">-- Sélectionner --</option>` +
      res.filter(r => ['active','retard','retour-j'].includes(r.statut))
         .map(r => `<option value="${r.id}">${r.id} — ${r.vehicules?.marque} ${r.vehicules?.modele}</option>`).join('');
  } catch(e) {}
};

// Appelé par _globalFileHandler
async function _edlHandleFaceFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    Pages._edlFacePhotos[Pages._edlFaceActive] = e.target.result;
    _edlUpdateFaceDisplay();
    _edlSetupPhotoClick();
    toast('Photo ajoutée ✓', 'success');
  };
  reader.readAsDataURL(file);
}

async function _edlHandleDamagePhoto(damageId, file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const d = Pages._edlDamages.find(x => x.id === damageId);
    if (d) { d.photoUrl = e.target.result; _renderEdlDamages(); toast('Photo dommage ajoutée ✓', 'success'); }
  };
  reader.readAsDataURL(file);
}

function _edlSetFace(face) {
  Pages._edlFaceActive = face;
  Object.keys(EDL_FACES).forEach(k => {
    const btn = document.getElementById(`edl-face-btn-${k}`);
    if (!btn) return;
    btn.style.borderColor = k === face ? 'var(--gold)' : '';
    btn.style.color = k === face ? 'var(--gold)' : '';
    btn.style.background = k === face ? 'rgba(184,149,42,.1)' : '';
  });
  _edlUpdateFaceDisplay();
  _edlSetupPhotoClick();
}

function _edlUpdateFaceDisplay() {
  const photo = Pages._edlFacePhotos[Pages._edlFaceActive];
  const img = document.getElementById('edl-face-img');
  const placeholder = document.getElementById('edl-photo-placeholder');
  const btns = document.getElementById('edl-photo-btns');
  if (photo) {
    if (img) { img.src = photo; img.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
    if (btns) btns.style.display = 'flex';
  } else {
    if (img) img.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
    if (btns) btns.style.display = 'none';
  }
  _renderEdlMarkersOverlay();
}

function _edlRemoveFacePhoto() {
  if (!confirm('Supprimer la photo de cette face ?')) return;
  Pages._edlFacePhotos[Pages._edlFaceActive] = null;
  Pages._edlDamages = Pages._edlDamages.filter(d => d.face !== Pages._edlFaceActive);
  _edlUpdateFaceDisplay();
  _renderEdlDamages();
}

function _edlSetupPhotoClick() {
  const zone = document.getElementById('edl-photo-zone');
  if (!zone) return;
  zone.onclick = function(evt) {
    if (!Pages._edlFacePhotos[Pages._edlFaceActive]) return;
    if (evt.target.closest('.edl-marker')) return;
    if (evt.target.tagName === 'BUTTON') return;
    const rect = zone.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * 100;
    const y = ((evt.clientY - rect.top) / rect.height) * 100;
    _edlPlaceMarker(x, y);
  };
}

function _edlAddMarker() {
  if (!Pages._edlFacePhotos[Pages._edlFaceActive]) { toast('Ajoutez d\'abord une photo', 'info'); return; }
  _edlPlaceMarker(50, 50);
}

function _edlPlaceMarker(x, y) {
  const desc = prompt('Description du dommage:', '');
  if (desc === null) return;
  Pages._edlCounter++;
  Pages._edlDamages.push({ id: Pages._edlCounter, face: Pages._edlFaceActive, x, y, description: desc || `Dommage ${Pages._edlCounter}`, photoUrl: null });
  _renderEdlDamages();
}

function _renderEdlMarkersOverlay() {
  const overlay = document.getElementById('edl-markers-overlay');
  if (!overlay) return;
  overlay.innerHTML = '';
  Pages._edlDamages.filter(d => d.face === Pages._edlFaceActive).forEach(d => {
    const marker = document.createElement('div');
    marker.className = 'edl-marker';
    marker.dataset.id = d.id;
    marker.style.cssText = `position:absolute;left:${d.x}%;top:${d.y}%;width:26px;height:26px;border-radius:50%;background:#C0392B;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;transform:translate(-50%,-50%);cursor:grab;user-select:none;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,.5);touch-action:none;`;
    marker.textContent = d.id;
    marker.addEventListener('mousedown', _edlStartDrag);
    marker.addEventListener('touchstart', _edlStartDragTouch, { passive: false });
    overlay.appendChild(marker);
  });
}

function _edlStartDrag(evt) {
  evt.stopPropagation(); evt.preventDefault();
  const marker = evt.currentTarget;
  const id = parseInt(marker.dataset.id);
  const zone = document.getElementById('edl-photo-zone');
  marker.style.cursor = 'grabbing';
  const move = (e) => {
    const rect = zone.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(2, Math.min(98, ((e.clientY - rect.top) / rect.height) * 100));
    marker.style.left = x + '%'; marker.style.top = y + '%';
    const d = Pages._edlDamages.find(d => d.id === id);
    if (d) { d.x = x; d.y = y; }
  };
  const up = () => { marker.style.cursor = 'grab'; _renderEdlDamages(); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
}

function _edlStartDragTouch(evt) {
  evt.preventDefault(); evt.stopPropagation();
  const marker = evt.currentTarget;
  const id = parseInt(marker.dataset.id);
  const zone = document.getElementById('edl-photo-zone');
  const move = (e) => {
    const touch = e.touches[0];
    const rect = zone.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(2, Math.min(98, ((touch.clientY - rect.top) / rect.height) * 100));
    marker.style.left = x + '%'; marker.style.top = y + '%';
    const d = Pages._edlDamages.find(d => d.id === id);
    if (d) { d.x = x; d.y = y; }
  };
  const end = () => { _renderEdlDamages(); document.removeEventListener('touchmove', move); document.removeEventListener('touchend', end); };
  document.addEventListener('touchmove', move, { passive: false });
  document.addEventListener('touchend', end);
}

function _renderEdlDamages() {
  _renderEdlMarkersOverlay();
  const listEl = document.getElementById('edl-damage-list');
  if (!listEl) return;
  const faceDmg = Pages._edlDamages.filter(d => d.face === Pages._edlFaceActive);
  if (Pages._edlDamages.length === 0) {
    listEl.innerHTML = '<p style="color:var(--gray);font-size:12px;text-align:center;padding:10px;">Aucun dommage</p>';
    return;
  }
  listEl.innerHTML = `<div style="font-size:10px;color:var(--gold);letter-spacing:1px;margin-bottom:6px;">DOMMAGES — ${EDL_FACES[Pages._edlFaceActive]?.label} (${faceDmg.length}/${Pages._edlDamages.length} total)</div>` +
    (faceDmg.length === 0 ? '<p style="color:var(--gray);font-size:11px;">Aucun dommage sur cette face</p>' :
    faceDmg.map(d => `
    <div style="background:rgba(192,57,43,.08);border:1px solid rgba(192,57,43,.2);border-radius:3px;padding:8px 10px;margin-bottom:6px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <div style="width:22px;height:22px;border-radius:50%;background:#C0392B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">${d.id}</div>
        <input value="${(d.description||'').replace(/"/g,'&quot;')}" placeholder="Description..."
          oninput="Pages._edlDamages.find(x=>x.id==${d.id}).description=this.value"
          style="flex:1;background:#111;border:1px solid #2a2a2a;border-radius:2px;padding:4px 8px;color:#ccc;font-size:11px;outline:none;">
        <button onclick="Pages._edlDamages=Pages._edlDamages.filter(x=>x.id!=${d.id});_renderEdlDamages()" style="background:none;border:none;color:#555;cursor:pointer;font-size:18px;line-height:1;">×</button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        ${d.photoUrl
          ? `<img src="${d.photoUrl}" onclick="document.getElementById('edl-lightbox-img').src='${d.photoUrl}';document.getElementById('edl-lightbox').style.display='flex';" style="width:60px;height:45px;object-fit:cover;border-radius:3px;cursor:pointer;border:1px solid var(--gold);">
             <button onclick="Pages._edlDamages.find(x=>x.id==${d.id}).photoUrl=null;_renderEdlDamages()" class="btn btn-xs btn-outline" style="color:#f87171;border-color:#f87171;">🗑</button>`
          : `<button class="btn btn-xs btn-outline" onclick="_triggerUpload({type:'edl-damage-photo',damageId:${d.id}})">📁 Photo</button>
             <button class="btn btn-xs btn-outline" onclick="_triggerUpload({type:'edl-damage-photo',damageId:${d.id}},true)">📷 Appareil</button>`}
        <span style="font-size:9px;color:var(--gray);">💡 Glissez le marqueur</span>
      </div>
    </div>`).join(''));
}

async function _saveEDL() {
  const resa = document.getElementById('edl-resa').value;
  if (!resa) { toast('Sélectionnez un contrat', 'error'); return; }
  const edl = {
    reservation_id: resa,
    type: document.getElementById('edl-type').value,
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
    dommages: Pages._edlDamages.map(d => ({ id: d.id, face: d.face, x: d.x, y: d.y, description: d.description, photoUrl: d.photoUrl })),
    agent: Auth.currentUser?.email,
  };
  try {
    setSyncStatus('syncing');
    await DB.saveEDL(edl);
    setSyncStatus('synced');
    toast('EDL enregistré ✓', 'success');
    Pages._edlDamages = [];
    Pages._edlCounter = 0;
    Pages._edlFacePhotos = { front: null, left: null, rear: null, right: null };
    _renderEdlDamages();
    _edlUpdateFaceDisplay();
  } catch(e) { setSyncStatus('offline'); toast('Erreur: ' + e.message, 'error'); }
}

function _printEDL() {
  const resa = document.getElementById('edl-resa')?.value || '—';
  const type = document.getElementById('edl-type')?.value === 'depart' ? 'DÉPART' : 'RETOUR';
  const dmgHtml = Pages._edlDamages.length === 0 ? '<p style="font-size:11px;color:#666;">Aucun dommage</p>' :
    Pages._edlDamages.map(d => `<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid #eee;align-items:center;">
      <div style="width:18px;height:18px;border-radius:50%;background:#C0392B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;flex-shrink:0;">${d.id}</div>
      <div style="flex:1;font-size:11px;"><strong>${EDL_FACES[d.face]?.label||d.face}</strong> — ${d.description||''}</div>
      ${d.photoUrl ? `<img src="${d.photoUrl}" style="width:40px;height:30px;object-fit:cover;border-radius:2px;">` : ''}
    </div>`).join('');
  printDoc(`<div style="padding:20px 30px;font-family:Montserrat,sans-serif;color:#111;">
    <div style="display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #B8952A;">
      <div><div style="font-family:Georgia,serif;font-size:22px;color:#B8952A;font-weight:700;">${SOCIETE.nom||'LKB Location'}</div></div>
      <div style="text-align:right;"><div style="background:#B8952A;color:#fff;padding:6px 16px;font-size:10px;letter-spacing:2px;font-weight:700;">ÉTAT DES LIEUX — ${type}</div>
      <div style="font-size:12px;margin-top:4px;">Contrat: ${resa}</div></div>
    </div>
    <strong>Dommages (${Pages._edlDamages.length}):</strong><div style="margin-top:8px;">${dmgHtml}</div>
    <div style="margin-top:12px;"><strong>Observations:</strong><p style="font-size:11px;min-height:40px;">${document.getElementById('edl-obs')?.value||'RAS'}</p></div>
    <div style="display:flex;gap:50px;margin-top:28px;">
      <div style="flex:1;border-top:1px solid #B8952A;padding-top:8px;text-align:center;font-size:11px;color:#666;">Agent LKB<br><br><br>Signature</div>
      <div style="flex:1;border-top:1px solid #B8952A;padding-top:8px;text-align:center;font-size:11px;color:#666;">Client<br><br><br>Signature</div>
    </div>
  </div>`);
}

async function _loadEDLList() {
  const el = document.getElementById('edl-tab-list');
  try {
    const edls = await DB.getAllEDLs();
    el.innerHTML = `<div class="card"><div style="overflow-x:auto;"><table class="tbl">
      <thead><tr><th>Date</th><th>Contrat</th><th>Véhicule</th><th>Type</th><th>KM</th><th>Dommages</th><th>Carburant</th></tr></thead>
      <tbody>${edls.map(e=>`<tr>
        <td>${fmt.dateTime(e.date_edl)}</td><td style="color:var(--gold)">${e.reservation_id}</td>
        <td>${e.reservations?.vehicules?.marque||''} ${e.reservations?.vehicules?.modele||''}</td>
        <td><span class="pill ${e.type==='depart'?'pill-green':'pill-blue'}">${e.type==='depart'?'Départ':'Retour'}</span></td>
        <td>${fmt.km(e.km)}</td>
        <td><span class="pill ${(e.dommages?.length||0)>0?'pill-orange':'pill-gray'}">${e.dommages?.length||0}</span></td>
        <td>${e.niveau_carburant||'—'}</td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
  } catch(err) { el.innerHTML = `<div class="card"><p style="color:#f87171;">Erreur: ${err.message}</p></div>`; }
}
