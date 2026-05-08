// ============================================================
// PAGE — États des lieux avec photos 4 faces + annotations
// ============================================================

Pages._edlDamages = [];
Pages._edlCounter = 0;
Pages._edlFaceActive = 'front';
Pages._edlDamagePhotos = {};

const EDL_FACES = {
  front:  { label: 'Face avant',    icon: '🚗', viewBox: '0 0 300 180' },
  left:   { label: 'Côté gauche',   icon: '◀🚗', viewBox: '0 0 300 180' },
  rear:   { label: 'Face arrière',  icon: '🚗▶', viewBox: '0 0 300 180' },
  right:  { label: 'Côté droit',    icon: '🚗▶', viewBox: '0 0 300 180' },
};

// SVG simplifié pour chaque face
function _edlCarSVG(face) {
  const svgs = {
    front: `<rect x="40" y="60" width="220" height="90" rx="18" fill="#2a2a2a" stroke="#B8952A" stroke-width="1.5"/>
      <rect x="70" y="35" width="160" height="55" rx="12" fill="#1e3a5f" stroke="#2980B9" stroke-width="1"/>
      <circle cx="75" cy="155" r="22" fill="#111" stroke="#555" stroke-width="2"/><circle cx="75" cy="155" r="13" fill="#1a1a1a"/>
      <circle cx="225" cy="155" r="22" fill="#111" stroke="#555" stroke-width="2"/><circle cx="225" cy="155" r="13" fill="#1a1a1a"/>
      <rect x="45" y="62" width="40" height="25" rx="4" fill="#f5c518" opacity=".7"/>
      <rect x="215" y="62" width="40" height="25" rx="4" fill="#f5c518" opacity=".7"/>
      <text x="150" y="20" font-family="Montserrat" font-size="11" fill="#B8952A" text-anchor="middle" letter-spacing="1">AVANT</text>`,
    rear: `<rect x="40" y="60" width="220" height="90" rx="18" fill="#2a2a2a" stroke="#B8952A" stroke-width="1.5"/>
      <rect x="70" y="35" width="160" height="55" rx="12" fill="#1e3a5f" stroke="#2980B9" stroke-width="1"/>
      <circle cx="75" cy="155" r="22" fill="#111" stroke="#555" stroke-width="2"/><circle cx="75" cy="155" r="13" fill="#1a1a1a"/>
      <circle cx="225" cy="155" r="22" fill="#111" stroke="#555" stroke-width="2"/><circle cx="225" cy="155" r="13" fill="#1a1a1a"/>
      <rect x="45" y="62" width="40" height="20" rx="3" fill="#f87171" opacity=".8"/>
      <rect x="215" y="62" width="40" height="20" rx="3" fill="#f87171" opacity=".8"/>
      <rect x="100" y="130" width="100" height="15" rx="3" fill="#aaa" opacity=".5"/>
      <text x="150" y="20" font-family="Montserrat" font-size="11" fill="#B8952A" text-anchor="middle" letter-spacing="1">ARRIÈRE</text>`,
    left: `<ellipse cx="150" cy="110" rx="130" ry="55" fill="#2a2a2a" stroke="#B8952A" stroke-width="1.5"/>
      <ellipse cx="150" cy="85" rx="90" ry="38" fill="#1e3a5f" stroke="#2980B9" stroke-width="1" opacity=".7"/>
      <circle cx="55" cy="148" r="22" fill="#111" stroke="#555" stroke-width="2"/><circle cx="55" cy="148" r="13" fill="#1a1a1a"/>
      <circle cx="245" cy="148" r="22" fill="#111" stroke="#555" stroke-width="2"/><circle cx="245" cy="148" r="13" fill="#1a1a1a"/>
      <text x="150" y="20" font-family="Montserrat" font-size="11" fill="#B8952A" text-anchor="middle" letter-spacing="1">CÔTÉ GAUCHE</text>`,
    right: `<ellipse cx="150" cy="110" rx="130" ry="55" fill="#2a2a2a" stroke="#B8952A" stroke-width="1.5"/>
      <ellipse cx="150" cy="85" rx="90" ry="38" fill="#1e3a5f" stroke="#2980B9" stroke-width="1" opacity=".7"/>
      <circle cx="55" cy="148" r="22" fill="#111" stroke="#555" stroke-width="2"/><circle cx="55" cy="148" r="13" fill="#1a1a1a"/>
      <circle cx="245" cy="148" r="22" fill="#111" stroke="#555" stroke-width="2"/><circle cx="245" cy="148" r="13" fill="#1a1a1a"/>
      <text x="150" y="20" font-family="Montserrat" font-size="11" fill="#B8952A" text-anchor="middle" letter-spacing="1">CÔTÉ DROIT</text>`,
  };
  return svgs[face] || svgs.front;
}

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
        <div class="form-section"><div class="form-section-title">Identification</div>
          <div class="form-grid">
            <div class="form-group"><label>Type</label><select id="edl-type"><option value="depart">Départ</option><option value="retour">Retour</option></select></div>
            <div class="form-group"><label>N° Contrat</label><select id="edl-resa"><option value="">Chargement...</option></select></div>
            <div class="form-group"><label>Date & Heure</label><input type="datetime-local" id="edl-date" value="${new Date().toISOString().slice(0,16)}"></div>
            <div class="form-group"><label>Kilométrage</label><input type="number" id="edl-km" placeholder="km au compteur"></div>
          </div>
        </div>
        <div class="form-section"><div class="form-section-title">État général</div>
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
            <label style="display:flex;gap:7px;align-items:center;cursor:pointer;"><input type="checkbox" id="edl-roue" checked> Roue de secours</label>
            <label style="display:flex;gap:7px;align-items:center;cursor:pointer;"><input type="checkbox" id="edl-cles" checked> Clés</label>
            <label style="display:flex;gap:7px;align-items:center;cursor:pointer;"><input type="checkbox" id="edl-voyants" checked> Aucun voyant allumé</label>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:16px;"><label>Observations générales</label><textarea id="edl-obs" rows="3"></textarea></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-gold" onclick="_saveEDL()">✓ Valider EDL</button>
          <button class="btn btn-outline" onclick="_printEDL()">🖨 Imprimer</button>
        </div>
      </div>

      <!-- Colonne droite : schéma 4 faces -->
      <div class="card">
        <div class="card-header"><div class="card-title">Schéma dommages <small>Sélectionnez une face puis cliquez</small></div></div>
        
        <!-- Sélection face -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:12px;">
          ${Object.entries(EDL_FACES).map(([k,v]) => `
          <button onclick="_edlSetFace('${k}')" id="face-btn-${k}" class="btn btn-outline btn-sm" style="font-size:10px;padding:6px 4px;${k==='front'?'border-color:var(--gold);color:var(--gold);':''}">${v.label}</button>`).join('')}
        </div>

        <!-- SVG de la face active -->
        <div style="position:relative;width:100%;margin:0 auto 12px;" id="edl-svg-container">
          <svg viewBox="0 0 300 180" xmlns="http://www.w3.org/2000/svg" id="edl-svg" 
            style="width:100%;cursor:crosshair;display:block;background:#141414;border-radius:6px;border:1px solid #2a2a2a;"
            onclick="_edlAddDamage(event)">
            ${_edlCarSVG('front')}
          </svg>
          <div id="edl-markers" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"></div>
        </div>

        <!-- Liste des dommages -->
        <div id="edl-damage-list"></div>
        <button class="btn btn-outline btn-xs no-print" style="margin-top:8px;" 
          onclick="if(confirm('Effacer tous les dommages ?')){Pages._edlDamages=[];Pages._edlCounter=0;Pages._edlDamagePhotos={};_renderDamages();}">
          🗑 Effacer tous les dommages
        </button>
      </div>
    </div>
  </div>
  <div id="edl-tab-list" style="display:none;"><div class="card"><div class="spinner"></div></div></div>
  
  <!-- Lightbox photo dommage -->
  <div id="damage-lightbox" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;align-items:center;justify-content:center;" onclick="this.style.display='none'">
    <img id="lightbox-img" style="max-width:90vw;max-height:90vh;border-radius:4px;border:2px solid var(--gold);">
  </div>`;

  Pages._edlDamages = [];
  Pages._edlCounter = 0;
  Pages._edlFaceActive = 'front';
  Pages._edlDamagePhotos = {};
  _renderDamages();

  // Charger réservations
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
  // Update boutons
  Object.keys(EDL_FACES).forEach(k => {
    const btn = document.getElementById(`face-btn-${k}`);
    if (btn) {
      btn.style.borderColor = k === face ? 'var(--gold)' : '';
      btn.style.color = k === face ? 'var(--gold)' : '';
    }
  });
  // Update SVG
  const svg = document.getElementById('edl-svg');
  if (svg) {
    // Garder les éléments interactifs, remplacer le fond
    const existingMarkers = svg.querySelectorAll('.damage-marker');
    svg.innerHTML = _edlCarSVG(face);
    _renderDamagesOnSVG();
  }
}

function _edlAddDamage(evt) {
  const svg = document.getElementById('edl-svg');
  const rect = svg.getBoundingClientRect();
  const x = ((evt.clientX - rect.left) / rect.width) * 100;
  const y = ((evt.clientY - rect.top) / rect.height) * 100;
  const types = ['Rayure','Enfoncement','Éclat','Bris','Décoloration','Autre'];
  const t = prompt('Type de dommage:\n' + types.map((v,i)=>`${i+1}. ${v}`).join('\n') + '\n\nEntrez le numéro:', '1');
  if (!t) return;
  const desc = prompt('Description (optionnel):', '') || '';
  Pages._edlCounter++;
  Pages._edlDamages.push({
    id: Pages._edlCounter,
    face: Pages._edlFaceActive,
    x, y,
    label: types[(parseInt(t)||1)-1],
    description: desc,
    photoUrl: null,
  });
  _renderDamages();
}

function _renderDamagesOnSVG() {
  const svg = document.getElementById('edl-svg');
  if (!svg) return;
  // Supprimer anciens marqueurs SVG
  svg.querySelectorAll('.damage-marker-svg').forEach(el => el.remove());
  // Ajouter marqueurs pour la face active
  Pages._edlDamages.filter(d => d.face === Pages._edlFaceActive).forEach(d => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'damage-marker-svg');
    const vb = svg.viewBox.baseVal;
    const cx = (d.x / 100) * vb.width;
    const cy = (d.y / 100) * vb.height;
    g.innerHTML = `
      <circle cx="${cx}" cy="${cy}" r="10" fill="#C0392B" stroke="white" stroke-width="1.5"/>
      <text x="${cx}" y="${cy+4}" font-family="Montserrat" font-size="10" fill="white" text-anchor="middle" font-weight="700">${d.id}</text>`;
    svg.appendChild(g);
  });
}

function _renderDamages() {
  _renderDamagesOnSVG();
  const listEl = document.getElementById('edl-damage-list');
  if (!listEl) return;
  if (Pages._edlDamages.length === 0) {
    listEl.innerHTML = '<p style="color:var(--gray);font-size:12px;text-align:center;padding:12px;">Aucun dommage — sélectionnez une face et cliquez sur le schéma</p>';
    return;
  }
  listEl.innerHTML = `<div style="font-size:10px;color:var(--gold);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Liste des dommages (${Pages._edlDamages.length})</div>` +
    Pages._edlDamages.map(d => `
    <div style="background:rgba(192,57,43,.08);border:1px solid rgba(192,57,43,.2);border-radius:3px;padding:8px 10px;margin-bottom:6px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <div style="width:22px;height:22px;border-radius:50%;background:#C0392B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">${d.id}</div>
        <div style="flex:1;">
          <div style="font-size:11px;font-weight:600;color:var(--white);">${d.label} — <span style="color:var(--gold);font-size:10px;">${EDL_FACES[d.face]?.label||d.face}</span></div>
          <input value="${d.description||''}" placeholder="Description..." 
            oninput="Pages._edlDamages.find(x=>x.id==${d.id}).description=this.value"
            style="width:100%;background:#111;border:1px solid #2a2a2a;border-radius:2px;padding:3px 7px;color:#ccc;font-size:11px;margin-top:3px;outline:none;">
        </div>
        <button onclick="Pages._edlDamages=Pages._edlDamages.filter(x=>x.id!=${d.id});delete Pages._edlDamagePhotos[${d.id}];_renderDamages()" 
          style="background:none;border:none;color:#555;cursor:pointer;font-size:16px;flex-shrink:0;">×</button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        ${d.photoUrl ? 
          `<img src="${d.photoUrl}" onclick="document.getElementById('lightbox-img').src='${d.photoUrl}';document.getElementById('damage-lightbox').style.display='flex';" 
            style="width:60px;height:45px;object-fit:cover;border-radius:3px;cursor:pointer;border:1px solid var(--gold);">
           <button onclick="_removeDamagePhoto(${d.id})" class="btn btn-xs btn-outline" style="color:#f87171;border-color:#f87171;">🗑</button>` :
          `<label class="btn btn-xs btn-outline" style="cursor:pointer;font-size:9px;">
            📷 Ajouter photo
            <input type="file" accept="image/*" style="display:none;" onchange="_uploadDamagePhoto(${d.id}, this)">
          </label>`}
        <span style="font-size:10px;color:var(--gray);">Photo du dommage</span>
      </div>
    </div>`).join('');
}

async function _uploadDamagePhoto(damageId, input) {
  const file = input.files[0];
  if (!file) return;
  try {
    toast('Upload en cours...', 'info');
    const ext = file.name.split('.').pop();
    const path = `damage-${damageId}-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('edl-photos').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('edl-photos').getPublicUrl(path);
    const d = Pages._edlDamages.find(x => x.id === damageId);
    if (d) d.photoUrl = urlData.publicUrl;
    Pages._edlDamagePhotos[damageId] = urlData.publicUrl;
    toast('Photo ajoutée ✓', 'success');
    _renderDamages();
  } catch(e) { toast('Erreur upload: ' + e.message, 'error'); }
}

function _removeDamagePhoto(damageId) {
  const d = Pages._edlDamages.find(x => x.id === damageId);
  if (d) d.photoUrl = null;
  delete Pages._edlDamagePhotos[damageId];
  _renderDamages();
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
    dommages: Pages._edlDamages,
    agent: Auth.currentUser?.email,
  };
  try {
    setSyncStatus('syncing');
    await DB.saveEDL(edl);
    setSyncStatus('synced');
    toast('EDL enregistré ✓', 'success');
    Pages._edlDamages = [];
    Pages._edlCounter = 0;
    Pages._edlDamagePhotos = {};
    _renderDamages();
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
          <div style="flex:1;font-size:11px;"><strong>${d.label}</strong> — ${EDL_FACES[d.face]?.label||d.face}<br>${d.description||''}</div>
          ${d.photoUrl ? `<img src="${d.photoUrl}" style="width:50px;height:38px;object-fit:cover;border-radius:2px;">` : ''}
        </div>`).join('');
  printDoc(`<div style="padding:20px 30px;font-family:Montserrat,sans-serif;color:#111;">
    <div style="display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #B8952A;">
      <div><div style="font-family:Georgia,serif;font-size:22px;color:#B8952A;font-weight:700;">${SOCIETE.nom||'LKB Location'}</div></div>
      <div style="text-align:right;"><div style="background:#B8952A;color:#fff;padding:6px 16px;font-size:10px;letter-spacing:2px;font-weight:700;">ÉTAT DES LIEUX — ${type}</div>
      <div style="margin-top:4px;font-size:12px;">Contrat: ${resa} | ${fmt.dateTime(document.getElementById('edl-date')?.value||new Date())}</div></div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr><td style="padding:5px 8px;border:1px solid #eee;font-size:11px;color:#777">Kilométrage</td><td style="padding:5px 8px;border:1px solid #eee;font-size:11px;font-weight:700">${document.getElementById('edl-km')?.value||'—'} km</td>
          <td style="padding:5px 8px;border:1px solid #eee;font-size:11px;color:#777">Carburant</td><td style="padding:5px 8px;border:1px solid #eee;font-size:11px">${document.getElementById('edl-fuel')?.value||'—'}</td></tr>
      <tr><td style="padding:5px 8px;border:1px solid #eee;font-size:11px;color:#777">Propreté ext.</td><td style="padding:5px 8px;border:1px solid #eee;font-size:11px">${document.getElementById('edl-ext')?.value||'—'}</td>
          <td style="padding:5px 8px;border:1px solid #eee;font-size:11px;color:#777">Propreté int.</td><td style="padding:5px 8px;border:1px solid #eee;font-size:11px">${document.getElementById('edl-int')?.value||'—'}</td></tr>
    </table>
    <div style="margin-top:16px;"><strong style="font-size:12px;">Dommages constatés (${Pages._edlDamages.length}) :</strong><div style="margin-top:8px;">${dmgHtml}</div></div>
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
        <td>${fmt.dateTime(e.date_edl)}</td>
        <td style="color:var(--gold)">${e.reservation_id}</td>
        <td>${e.reservations?.vehicules?.marque||''} ${e.reservations?.vehicules?.modele||''}</td>
        <td><span class="pill ${e.type==='depart'?'pill-green':'pill-blue'}">${e.type==='depart'?'Départ':'Retour'}</span></td>
        <td>${fmt.km(e.km)}</td>
        <td><span class="pill ${(e.dommages?.length||0)>0?'pill-orange':'pill-gray'}">${e.dommages?.length||0}</span></td>
        <td>${e.niveau_carburant||'—'}</td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
  } catch(err) {
    el.innerHTML = `<div class="card"><p style="color:#f87171;">Erreur: ${err.message}</p></div>`;
  }
}
