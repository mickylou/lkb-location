// ============================================================
// PAGE — États des lieux
// Photos réelles + marqueurs déplaçables
// ============================================================

Pages._edlDamages = [];
Pages._edlCounter = 0;
Pages._edlFaceActive = 'front';
Pages._edlFacePhotos = { front: null, left: null, rear: null, right: null };
Pages._edlDragging = null;

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
      <!-- Colonne gauche : infos -->
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

      <!-- Colonne droite : photos + dommages -->
      <div class="card">
        <div class="card-header"><div class="card-title">Photos & dommages <small>Sélectionnez une face</small></div></div>
        
        <!-- Sélection face -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:12px;">
          ${Object.entries(EDL_FACES).map(([k,v]) => `
          <button onclick="_edlSetFace('${k}')" id="face-btn-${k}" 
            class="btn btn-outline btn-sm" 
            style="font-size:10px;padding:6px 4px;${k==='front'?'border-color:var(--gold);color:var(--gold);background:rgba(184,149,42,.1);':''}">
            ${v.label}
          </button>`).join('')}
        </div>

        <!-- Zone photo + marqueurs -->
        <div id="edl-photo-zone" style="position:relative;width:100%;background:#141414;border-radius:6px;border:1px solid #2a2a2a;overflow:hidden;min-height:200px;margin-bottom:12px;cursor:crosshair;">
          <!-- Placeholder si pas de photo -->
          <div id="edl-photo-placeholder" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px;gap:10px;">
            <div style="font-size:11px;color:var(--gray);">Aucune photo — ajoutez une photo de la face</div>
            <div style="display:flex;gap:8px;">
              <label class="btn btn-outline btn-sm" style="cursor:pointer;font-size:10px;">
                📁 Choisir une photo
                <input type="file" accept="image/*" style="display:none;" onchange="_edlUploadFacePhoto(this,'front')">
              </label>
              <label class="btn btn-outline btn-sm" style="cursor:pointer;font-size:10px;">
                📷 Prendre une photo
                <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="_edlUploadFacePhoto(this,'front')">
              </label>
            </div>
          </div>
          <!-- Image de la face -->
          <img id="edl-face-img" style="display:none;width:100%;height:auto;display:block;" draggable="false">
          <!-- Marqueurs de dommages (overlay) -->
          <div id="edl-markers-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;"></div>
        </div>

        <!-- Boutons photo (visibles quand photo présente) -->
        <div id="edl-photo-btns" style="display:none;margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;">
          <label class="btn btn-outline btn-xs" style="cursor:pointer;font-size:10px;" id="edl-replace-btn">
            🔄 Remplacer photo
            <input type="file" accept="image/*" style="display:none;" id="edl-replace-input" onchange="_edlUploadFacePhoto(this)">
          </label>
          <label class="btn btn-outline btn-xs" style="cursor:pointer;font-size:10px;">
            📷 Appareil photo
            <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="_edlUploadFacePhoto(this)">
          </label>
          <button class="btn btn-outline btn-xs" onclick="_edlAddMarker()" style="font-size:10px;">+ Ajouter dommage</button>
          <button class="btn btn-outline btn-xs" onclick="_edlRemoveFacePhoto()" style="color:#f87171;border-color:#f87171;font-size:10px;">🗑 Supprimer photo</button>
        </div>

        <!-- Instructions -->
        <div id="edl-instructions" style="font-size:10px;color:var(--gray);margin-bottom:10px;display:none;">
          💡 Cliquez sur la photo pour placer un marqueur • Glissez un marqueur pour le déplacer
        </div>

        <!-- Liste dommages -->
        <div id="edl-damage-list"></div>
        <button class="btn btn-outline btn-xs no-print" style="margin-top:8px;" 
          onclick="if(confirm('Effacer tous les dommages de cette face ?')){Pages._edlDamages=Pages._edlDamages.filter(d=>d.face!==Pages._edlFaceActive);_renderDamages();}">
          🗑 Effacer dommages de cette face
        </button>
      </div>
    </div>
  </div>
  <div id="edl-tab-list" style="display:none;"><div class="card"><div class="spinner"></div></div></div>
  
  <!-- Lightbox -->
  <div id="damage-lightbox" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;align-items:center;justify-content:center;" onclick="this.style.display='none'">
    <img id="lightbox-img" style="max-width:90vw;max-height:90vh;border-radius:4px;border:2px solid var(--gold);">
  </div>`;

  Pages._edlDamages = [];
  Pages._edlCounter = 0;
  Pages._edlFaceActive = 'front';
  Pages._edlFacePhotos = { front: null, left: null, rear: null, right: null };
  _renderDamages();
  _setupPhotoClick();

  try {
    const res = await DB.getReservations();
    const sel = document.getElementById('edl-resa');
    sel.innerHTML = `<option value="">-- Sélectionner --</option>` +
      res.filter(r => ['active','retard','retour-j'].includes(r.statut))
         .map(r => `<option value="${r.id}">${r.id} — ${r.vehicules?.marque} ${r.vehicules?.modele}</option>`).join('');
  } catch(e) {}
};

function _edlSetFace(face) {
  Pages._edlFaceActive = face;
  Object.keys(EDL_FACES).forEach(k => {
    const btn = document.getElementById(`face-btn-${k}`);
    if (!btn) return;
    if (k === face) {
      btn.style.borderColor = 'var(--gold)';
      btn.style.color = 'var(--gold)';
      btn.style.background = 'rgba(184,149,42,.1)';
    } else {
      btn.style.borderColor = '';
      btn.style.color = '';
      btn.style.background = '';
    }
  });
  // Update les inputs avec la bonne face
  const replaceInput = document.getElementById('edl-replace-input');
  if (replaceInput) replaceInput.onchange = function() { _edlUploadFacePhoto(this); };
  _updateFaceDisplay();
  _renderDamages();
}

function _updateFaceDisplay() {
  const photo = Pages._edlFacePhotos[Pages._edlFaceActive];
  const img = document.getElementById('edl-face-img');
  const placeholder = document.getElementById('edl-photo-placeholder');
  const btns = document.getElementById('edl-photo-btns');
  const instructions = document.getElementById('edl-instructions');
  if (photo) {
    img.src = photo;
    img.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    if (btns) btns.style.display = 'flex';
    if (instructions) instructions.style.display = 'block';
  } else {
    img.style.display = 'none';
    if (placeholder) {
      placeholder.style.display = 'flex';
      // Update les inputs du placeholder avec la bonne face
      placeholder.querySelectorAll('input[type=file]').forEach(inp => {
        inp.onchange = function() { _edlUploadFacePhoto(this); };
      });
    }
    if (btns) btns.style.display = 'none';
    if (instructions) instructions.style.display = 'none';
  }
  _renderMarkersOverlay();
}

async function _edlUploadFacePhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    Pages._edlFacePhotos[Pages._edlFaceActive] = e.target.result;
    _updateFaceDisplay();
    _setupPhotoClick();
    toast('Photo ajoutée ✓', 'success');
  };
  reader.readAsDataURL(file);
}

function _edlRemoveFacePhoto() {
  if (!confirm('Supprimer la photo de cette face ?')) return;
  Pages._edlFacePhotos[Pages._edlFaceActive] = null;
  Pages._edlDamages = Pages._edlDamages.filter(d => d.face !== Pages._edlFaceActive);
  _updateFaceDisplay();
  _renderDamages();
}

function _setupPhotoClick() {
  const zone = document.getElementById('edl-photo-zone');
  if (!zone) return;
  zone.onclick = function(evt) {
    if (!Pages._edlFacePhotos[Pages._edlFaceActive]) return;
    if (evt.target.closest('.edl-marker')) return; // Ne pas ajouter si clic sur marqueur
    const rect = zone.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * 100;
    const y = ((evt.clientY - rect.top) / rect.height) * 100;
    _edlPlaceMarker(x, y);
  };
}

function _edlAddMarker() {
  if (!Pages._edlFacePhotos[Pages._edlFaceActive]) {
    toast('Ajoutez d\'abord une photo de cette face', 'info');
    return;
  }
  _edlPlaceMarker(50, 50);
}

function _edlPlaceMarker(x, y) {
  const desc = prompt('Description du dommage (ex: Rayure aile avant):', '') ;
  if (desc === null) return;
  Pages._edlCounter++;
  Pages._edlDamages.push({
    id: Pages._edlCounter,
    face: Pages._edlFaceActive,
    x, y,
    description: desc || `Dommage ${Pages._edlCounter}`,
    photoUrl: null,
  });
  _renderDamages();
}

function _renderMarkersOverlay() {
  const overlay = document.getElementById('edl-markers-overlay');
  if (!overlay) return;
  overlay.innerHTML = '';
  const faceDamages = Pages._edlDamages.filter(d => d.face === Pages._edlFaceActive);
  faceDamages.forEach(d => {
    const marker = document.createElement('div');
    marker.className = 'edl-marker';
    marker.dataset.id = d.id;
    marker.style.cssText = `
      position:absolute;left:${d.x}%;top:${d.y}%;
      width:26px;height:26px;border-radius:50%;
      background:#C0392B;border:2px solid #fff;
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:700;color:#fff;
      transform:translate(-50%,-50%);
      cursor:grab;user-select:none;z-index:10;
      box-shadow:0 2px 8px rgba(0,0,0,.5);
      transition:transform .1s;
    `;
    marker.textContent = d.id;
    marker.title = d.description;

    // Drag & Drop
    marker.addEventListener('mousedown', _edlStartDrag);
    marker.addEventListener('touchstart', _edlStartDragTouch, { passive: false });

    overlay.appendChild(marker);
  });
}

function _edlStartDrag(evt) {
  evt.stopPropagation();
  const marker = evt.currentTarget;
  const id = parseInt(marker.dataset.id);
  Pages._edlDragging = id;
  marker.style.cursor = 'grabbing';
  marker.style.transform = 'translate(-50%,-50%) scale(1.2)';

  const zone = document.getElementById('edl-photo-zone');
  const moveHandler = (e) => {
    if (Pages._edlDragging === null) return;
    const rect = zone.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    marker.style.left = x + '%';
    marker.style.top = y + '%';
    const dmg = Pages._edlDamages.find(d => d.id === id);
    if (dmg) { dmg.x = x; dmg.y = y; }
  };
  const upHandler = () => {
    Pages._edlDragging = null;
    marker.style.cursor = 'grab';
    marker.style.transform = 'translate(-50%,-50%) scale(1)';
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', upHandler);
    _renderDamages();
  };
  document.addEventListener('mousemove', moveHandler);
  document.addEventListener('mouseup', upHandler);
}

function _edlStartDragTouch(evt) {
  evt.preventDefault();
  evt.stopPropagation();
  const marker = evt.currentTarget;
  const id = parseInt(marker.dataset.id);
  Pages._edlDragging = id;
  const zone = document.getElementById('edl-photo-zone');

  const moveHandler = (e) => {
    if (Pages._edlDragging === null) return;
    const touch = e.touches[0];
    const rect = zone.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
    marker.style.left = x + '%';
    marker.style.top = y + '%';
    const dmg = Pages._edlDamages.find(d => d.id === id);
    if (dmg) { dmg.x = x; dmg.y = y; }
  };
  const endHandler = () => {
    Pages._edlDragging = null;
    document.removeEventListener('touchmove', moveHandler);
    document.removeEventListener('touchend', endHandler);
    _renderDamages();
  };
  document.addEventListener('touchmove', moveHandler, { passive: false });
  document.addEventListener('touchend', endHandler);
}

function _renderDamages() {
  _renderMarkersOverlay();
  const listEl = document.getElementById('edl-damage-list');
  if (!listEl) return;
  const allDamages = Pages._edlDamages;
  if (allDamages.length === 0) {
    listEl.innerHTML = '<p style="color:var(--gray);font-size:12px;text-align:center;padding:12px;">Aucun dommage enregistré</p>';
    return;
  }
  listEl.innerHTML = `<div style="font-size:10px;color:var(--gold);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">
    Dommages — ${EDL_FACES[Pages._edlFaceActive]?.label} (${allDamages.filter(d=>d.face===Pages._edlFaceActive).length} / ${allDamages.length} total)
  </div>` +
    allDamages.filter(d => d.face === Pages._edlFaceActive).map(d => `
    <div style="background:rgba(192,57,43,.08);border:1px solid rgba(192,57,43,.2);border-radius:3px;padding:8px 10px;margin-bottom:6px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <div style="width:22px;height:22px;border-radius:50%;background:#C0392B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;cursor:pointer;" title="Glissez le marqueur sur la photo pour le repositionner">${d.id}</div>
        <div style="flex:1;">
          <input value="${d.description||''}" placeholder="Description du dommage..."
            oninput="Pages._edlDamages.find(x=>x.id==${d.id}).description=this.value"
            style="width:100%;background:#111;border:1px solid #2a2a2a;border-radius:2px;padding:4px 8px;color:#ccc;font-size:12px;outline:none;">
        </div>
        <button onclick="Pages._edlDamages=Pages._edlDamages.filter(x=>x.id!=${d.id});_renderDamages()" 
          style="background:none;border:none;color:#555;cursor:pointer;font-size:18px;flex-shrink:0;line-height:1;">×</button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        ${d.photoUrl ?
          `<img src="${d.photoUrl}" onclick="document.getElementById('lightbox-img').src='${d.photoUrl}';document.getElementById('damage-lightbox').style.display='flex';"
            style="width:60px;height:45px;object-fit:cover;border-radius:3px;cursor:pointer;border:1px solid var(--gold);">
           <button onclick="Pages._edlDamages.find(x=>x.id==${d.id}).photoUrl=null;_renderDamages()" class="btn btn-xs btn-outline" style="color:#f87171;border-color:#f87171;">🗑</button>` :
          `<label class="btn btn-xs btn-outline" style="cursor:pointer;font-size:9px;">
            📷 Photo du dommage
            <input type="file" accept="image/*" style="display:none;" onchange="_uploadDamagePhoto(${d.id}, this)">
          </label>
          <label class="btn btn-xs btn-outline" style="cursor:pointer;font-size:9px;">
            📸 Appareil
            <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="_uploadDamagePhoto(${d.id}, this)">
          </label>`}
        <span style="font-size:9px;color:var(--gray);">💡 Glissez le marqueur pour repositionner</span>
      </div>
    </div>`).join('');
}

async function _uploadDamagePhoto(damageId, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const d = Pages._edlDamages.find(x => x.id === damageId);
    if (d) d.photoUrl = e.target.result;
    toast('Photo dommage ajoutée ✓', 'success');
    _renderDamages();
  };
  reader.readAsDataURL(file);
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
    dommages: Pages._edlDamages.map(d => ({
      id: d.id, face: d.face, x: d.x, y: d.y,
      description: d.description,
      photoUrl: d.photoUrl && d.photoUrl.length > 500 ? '[photo_local]' : d.photoUrl,
    })),
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
    _renderDamages();
    _updateFaceDisplay();
  } catch(e) { setSyncStatus('offline'); toast('Erreur: ' + e.message, 'error'); }
}

function _printEDL() {
  const resa = document.getElementById('edl-resa')?.value || '—';
  const type = document.getElementById('edl-type')?.value === 'depart' ? 'DÉPART' : 'RETOUR';
  const dmgHtml = Pages._edlDamages.length === 0
    ? '<p style="font-size:11px;color:#666;">Aucun dommage constaté</p>'
    : Pages._edlDamages.map(d => `
        <div style="display:flex;gap:10px;align-items:flex-start;padding:6px 0;border-bottom:1px solid #eee;">
          <div style="width:20px;height:20px;border-radius:50%;background:#C0392B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0;">${d.id}</div>
          <div style="flex:1;font-size:11px;"><strong>${EDL_FACES[d.face]?.label||d.face}</strong> — ${d.description||''}</div>
          ${d.photoUrl && !d.photoUrl.includes('[photo_local]') ? `<img src="${d.photoUrl}" style="width:50px;height:38px;object-fit:cover;border-radius:2px;">` : ''}
        </div>`).join('');
  printDoc(`<div style="padding:20px 30px;font-family:Montserrat,sans-serif;color:#111;">
    <div style="display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #B8952A;">
      <div><div style="font-family:Georgia,serif;font-size:22px;color:#B8952A;font-weight:700;">${SOCIETE.nom||'LKB Location'}</div></div>
      <div style="text-align:right;"><div style="background:#B8952A;color:#fff;padding:6px 16px;font-size:10px;letter-spacing:2px;font-weight:700;">ÉTAT DES LIEUX — ${type}</div>
      <div style="font-size:12px;margin-top:4px;">Contrat: ${resa}</div></div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr><td style="padding:5px 8px;border:1px solid #eee;font-size:11px;color:#777">KM</td><td style="padding:5px 8px;border:1px solid #eee;font-size:11px;font-weight:700">${document.getElementById('edl-km')?.value||'—'} km</td>
          <td style="padding:5px 8px;border:1px solid #eee;font-size:11px;color:#777">Carburant</td><td style="padding:5px 8px;border:1px solid #eee;font-size:11px">${document.getElementById('edl-fuel')?.value||'—'}</td></tr>
      <tr><td style="padding:5px 8px;border:1px solid #eee;font-size:11px;color:#777">Propreté ext.</td><td style="padding:5px 8px;border:1px solid #eee;font-size:11px">${document.getElementById('edl-ext')?.value||'—'}</td>
          <td style="padding:5px 8px;border:1px solid #eee;font-size:11px;color:#777">Propreté int.</td><td style="padding:5px 8px;border:1px solid #eee;font-size:11px">${document.getElementById('edl-int')?.value||'—'}</td></tr>
    </table>
    <strong style="font-size:12px;">Dommages (${Pages._edlDamages.length}) :</strong>
    <div style="margin-top:8px;">${dmgHtml}</div>
    <div style="margin-top:14px;"><strong>Observations:</strong><p style="font-size:11px;min-height:40px;margin-top:4px;">${document.getElementById('edl-obs')?.value||'RAS'}</p></div>
    <div style="display:flex;gap:50px;margin-top:30px;">
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
