// ============================================================
// PAGE — Documents (photos stockées dans Supabase Storage)
// ============================================================
Pages.documents = async function() {
  const el = document.getElementById('page-documents');
  el.innerHTML = `
  <div class="tabs">
    <div class="tab active" onclick="switchTab(this,'doc-tab-veh');_loadDocsVeh()">Documents véhicules</div>
    <div class="tab" onclick="switchTab(this,'doc-tab-clients');_loadDocsClients()">Documents clients</div>
  </div>
  <div id="doc-tab-veh"><div class="spinner"></div></div>
  <div id="doc-tab-clients" style="display:none;"><div class="card"><p style="color:var(--gray);">Cliquez sur l'onglet pour charger.</p></div></div>
  
  <!-- Lightbox -->
  <div id="doc-lightbox" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:9999;align-items:center;justify-content:center;flex-direction:column;gap:16px;" onclick="this.style.display='none'">
    <img id="doc-lightbox-img" style="max-width:92vw;max-height:85vh;border-radius:4px;border:2px solid var(--gold);">
    <div style="color:#aaa;font-size:12px;">Cliquez n'importe où pour fermer</div>
  </div>`;
  _loadDocsVeh();
};

async function _loadDocsVeh() {
  const el = document.getElementById('doc-tab-veh');
  el.innerHTML = '<div class="spinner"></div>';
  try {
    const vehicules = await DB.getVehicules();
    el.innerHTML = `
    <div class="card" style="margin-bottom:14px;">
      <div class="card-header">
        <div class="card-title">Photos & documents par véhicule <small>Carte grise, assurance, CT, etc.</small></div>
      </div>
      <div class="form-group" style="max-width:320px;">
        <label>Sélectionner un véhicule</label>
        <select id="doc-veh-select" onchange="_loadVehDocs(this.value)">
          <option value="">-- Choisir un véhicule --</option>
          ${vehicules.map(v=>`<option value="${v.id}">${v.marque} ${v.modele} (${v.immatriculation})</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="veh-docs-content"></div>`;
  } catch(e) {
    el.innerHTML = `<div class="card"><p style="color:#f87171;">Erreur: ${e.message}</p></div>`;
  }
}

async function _loadVehDocs(vehiculeId) {
  const el = document.getElementById('veh-docs-content');
  if (!vehiculeId) { el.innerHTML = ''; return; }
  el.innerHTML = '<div class="spinner"></div>';
  try {
    // Lister les fichiers dans le bucket pour ce véhicule
    const { data: files, error } = await supabase.storage.from('documents-vehicules').list(vehiculeId, { sortBy: { column: 'created_at', order: 'desc' } });
    if (error && error.message !== 'The resource was not found') throw error;
    const fileList = files || [];
    el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">Documents <small>${fileList.length} fichier(s)</small></div>
        <label class="btn btn-gold btn-sm" style="cursor:pointer;">
          📷 Ajouter photo/document
          <input type="file" accept="image/*,application/pdf" multiple style="display:none;" onchange="_uploadVehDoc('${vehiculeId}', this)">
        </label>
      </div>
      ${fileList.length === 0
        ? '<p style="color:var(--gray);font-size:13px;text-align:center;padding:20px;">Aucun document. Cliquez sur "Ajouter" pour uploader une photo.</p>'
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;">
            ${fileList.map(f => {
              const { data: urlData } = supabase.storage.from('documents-vehicules').getPublicUrl(`${vehiculeId}/${f.name}`);
              const url = urlData.publicUrl;
              const isPdf = f.name.endsWith('.pdf');
              return `<div style="position:relative;background:var(--dark3);border-radius:4px;overflow:hidden;border:1px solid #2a2a2a;">
                ${isPdf
                  ? `<div style="height:100px;display:flex;align-items:center;justify-content:center;font-size:32px;cursor:pointer;" onclick="window.open('${url}','_blank')">📄</div>`
                  : `<img src="${url}" style="width:100%;height:100px;object-fit:cover;cursor:pointer;display:block;" 
                      onclick="document.getElementById('doc-lightbox-img').src='${url}';document.getElementById('doc-lightbox').style.display='flex';">`}
                <div style="padding:6px 8px;">
                  <div style="font-size:10px;color:#aaa;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${f.name.replace(/^\d+-/,'')}</div>
                  <div style="display:flex;gap:4px;margin-top:4px;">
                    ${!isPdf ? `<button onclick="document.getElementById('doc-lightbox-img').src='${url}';document.getElementById('doc-lightbox').style.display='flex';" class="btn btn-xs btn-outline" style="flex:1;font-size:9px;">👁</button>` : ''}
                    <button onclick="_deleteVehDoc('${vehiculeId}','${f.name}')" class="btn btn-xs btn-outline" style="color:#f87171;border-color:#f87171;flex:1;font-size:9px;">🗑</button>
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>`}
    </div>`;
  } catch(e) {
    el.innerHTML = `<div class="card"><p style="color:#f87171;">Erreur: ${e.message}</p></div>`;
  }
}

async function _uploadVehDoc(vehiculeId, input) {
  const files = Array.from(input.files);
  if (!files.length) return;
  toast(`Upload de ${files.length} fichier(s)...`, 'info');
  let success = 0;
  for (const file of files) {
    try {
      const ts = Date.now();
      const path = `${vehiculeId}/${ts}-${file.name}`;
      const { error } = await supabase.storage.from('documents-vehicules').upload(path, file, { upsert: false });
      if (error) throw error;
      success++;
    } catch(e) { toast('Erreur: ' + e.message, 'error'); }
  }
  if (success > 0) {
    toast(`${success} fichier(s) uploadé(s) ✓`, 'success');
    _loadVehDocs(vehiculeId);
  }
}

async function _deleteVehDoc(vehiculeId, fileName) {
  if (!confirm(`Supprimer "${fileName.replace(/^\d+-/,'')}" ?`)) return;
  try {
    const { error } = await supabase.storage.from('documents-vehicules').remove([`${vehiculeId}/${fileName}`]);
    if (error) throw error;
    toast('Document supprimé', 'success');
    _loadVehDocs(vehiculeId);
  } catch(e) { toast('Erreur: ' + e.message, 'error'); }
}

async function _loadDocsClients() {
  const el = document.getElementById('doc-tab-clients');
  el.innerHTML = `<div class="card">
    <div class="card-header"><div class="card-title">Documents clients <small>Permis, CNI, etc.</small></div></div>
    <p style="color:var(--gray);font-size:13px;">Cette section sera disponible prochainement.</p>
  </div>`;
}
