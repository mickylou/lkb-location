// ============================================================
// PAGE — Comptabilité
// ============================================================
Pages._comptaMois = new Date().getMonth() + 1;
Pages._comptaAnnee = new Date().getFullYear();

Pages.comptabilite = async function() {
  const el = document.getElementById('page-comptabilite');
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  el.innerHTML = `
  <div style="display:flex;gap:12px;align-items:center;margin-bottom:20px;flex-wrap:wrap;" class="no-print">
    <button class="btn btn-gold" onclick="_openEcritureForm()">+ Écriture manuelle</button>
    <button class="btn btn-outline" onclick="_exportCompta()">📥 Export CSV</button>
    <button class="btn btn-outline" onclick="window.print()">🖨 Imprimer</button>
    <div style="margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <select id="compta-mois" onchange="Pages._comptaMois=parseInt(this.value);Pages.comptabilite()" style="background:var(--dark3);border:1px solid #333;border-radius:3px;padding:8px 12px;color:var(--white);font-size:12px;">
        ${months.map((m,i)=>`<option value="${i+1}" ${Pages._comptaMois===i+1?'selected':''}>${m}</option>`).join('')}
      </select>
      <select id="compta-an" onchange="Pages._comptaAnnee=parseInt(this.value);Pages.comptabilite()" style="background:var(--dark3);border:1px solid #333;border-radius:3px;padding:8px 12px;color:var(--white);font-size:12px;">
        ${[2024,2025,2026,2027].map(y=>`<option ${Pages._comptaAnnee===y?'selected':''}>${y}</option>`).join('')}
      </select>
    </div>
  </div>
  <div id="compta-content"><div class="spinner"></div></div>`;
  await _loadCompta();
};

async function _loadCompta() {
  try {
    const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const journal = await DB.getJournal(Pages._comptaMois, Pages._comptaAnnee);
    const ca = journal.reduce((s,e)=>s+(e.credit||0),0);
    const charges = journal.reduce((s,e)=>s+(e.debit||0),0);
    const net = ca - charges;
    document.getElementById('compta-content').innerHTML = `
    <div class="grid-3" style="margin-bottom:20px;">
      <div class="stat-card"><div class="val" style="color:#4ade80">${fmt.money(ca)}</div><div class="lbl">Recettes</div></div>
      <div class="stat-card"><div class="val" style="color:#f87171">${fmt.money(charges)}</div><div class="lbl">Dépenses</div></div>
      <div class="stat-card"><div class="val" style="color:${net>=0?'#4ade80':'#f87171'}">${fmt.money(net)}</div><div class="lbl">Résultat net</div></div>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">Journal comptable <small>${months[Pages._comptaMois-1]} ${Pages._comptaAnnee}</small></div>
      </div>
      ${journal.length === 0
        ? '<p style="color:var(--gray);font-size:13px;">Aucune écriture ce mois.</p>'
        : `<div style="overflow-x:auto;"><table class="tbl">
          <thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th>Référence</th><th>Débit</th><th>Crédit</th><th>Solde</th><th class="no-print">Actions</th></tr></thead>
          <tbody>${(() => {
            let solde = 0;
            return journal.map(e => {
              solde += (e.credit||0) - (e.debit||0);
              return `<tr>
                <td style="white-space:nowrap">${fmt.date(e.date_operation)}</td>
                <td>${e.libelle}</td>
                <td><span class="pill pill-gray" style="font-size:9px;">${e.categorie||'—'}</span></td>
                <td style="color:var(--gold);font-size:11px">${e.reference||'—'}</td>
                <td>${e.debit?`<span class="compta-debit">-${fmt.money(e.debit)}</span>`:''}</td>
                <td>${e.credit?`<span class="compta-credit">+${fmt.money(e.credit)}</span>`:''}</td>
                <td style="font-weight:600;color:${solde>=0?'#4ade80':'#f87171'};white-space:nowrap">${fmt.money(solde)}</td>
                <td class="no-print" style="white-space:nowrap;">
                  <button class="btn btn-xs btn-outline" onclick="_openEcritureForm(${JSON.stringify(e).replace(/"/g,'&quot;')})">✏</button>
                  <button class="btn btn-xs btn-outline" style="color:#f87171;border-color:rgba(192,57,43,.4);" onclick="_deleteEcriture('${e.id}')">🗑</button>
                </td>
              </tr>`;
            }).join('');
          })()}</tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="padding:10px 13px;font-weight:700;font-size:13px;border-top:2px solid var(--gold);">TOTAUX</td>
              <td style="padding:10px 13px;border-top:2px solid var(--gold);"><span class="compta-debit">-${fmt.money(charges)}</span></td>
              <td style="padding:10px 13px;border-top:2px solid var(--gold);"><span class="compta-credit">+${fmt.money(ca)}</span></td>
              <td style="padding:10px 13px;border-top:2px solid var(--gold);font-weight:700;color:${net>=0?'#4ade80':'#f87171'}">${fmt.money(net)}</td>
              <td class="no-print" style="border-top:2px solid var(--gold);"></td>
            </tr>
          </tfoot>
        </table></div>`}
    </div>`;
  } catch(e) {
    document.getElementById('compta-content').innerHTML = `<p style="color:#f87171;">Erreur: ${e.message}</p>`;
  }
}

async function _openEcritureForm(existing = null) {
  const isEdit = existing !== null;
  // Si existing est une string (depuis HTML), parser
  if (typeof existing === 'string') {
    try { existing = JSON.parse(existing); } catch(e) { existing = null; }
  }
  const e = existing || {};
  const html = `<div class="modal-overlay" id="modal-ecriture" onclick="if(event.target===this)closeModal('modal-ecriture')">
  <div class="modal" style="max-width:580px;">
    <button class="modal-close" onclick="closeModal('modal-ecriture')">✕</button>
    <div class="modal-title">${isEdit ? '✏ Modifier l\'écriture' : '+ Nouvelle écriture'}</div>
    <div class="form-grid">
      <div class="form-group"><label>Date</label>
        <input type="date" id="ef-date" value="${e.date_operation ? e.date_operation.split('T')[0] : new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group"><label>Catégorie</label>
        <select id="ef-cat">
          ${['Location','Entretien','Assurance','Propriétaire','Carburant','Divers','Frais retour','Autre'].map(c=>`<option ${(e.categorie||''===c)?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group form-row-full"><label>Libellé</label>
        <input id="ef-lib" value="${e.libelle||''}" placeholder="Description de l'écriture">
      </div>
      <div class="form-group"><label>Référence</label>
        <input id="ef-ref" value="${e.reference||''}" placeholder="N° facture, contrat...">
      </div>
      <div class="form-group"><label>Type</label>
        <select id="ef-type" onchange="_updateMontantLabel()">
          <option value="credit" ${!e.debit||e.debit==0?'selected':''}>Recette (+)</option>
          <option value="debit" ${e.debit&&e.debit>0?'selected':''}>Dépense (-)</option>
        </select>
      </div>
      <div class="form-group"><label id="ef-montant-label">Montant (€)</label>
        <input type="number" step="0.01" id="ef-montant" value="${e.debit&&e.debit>0?e.debit:(e.credit||'')}" placeholder="0.00">
      </div>
    </div>
    ${isEdit ? `<div style="background:rgba(230,126,34,.1);border:1px solid rgba(230,126,34,.3);border-radius:3px;padding:10px 14px;font-size:11px;color:#fb923c;margin-top:12px;">
      ⚠ Vous modifiez une écriture existante. Les montants seront mis à jour.
    </div>` : ''}
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-ecriture')">Annuler</button>
      <button class="btn btn-gold" onclick="_saveEcriture('${e.id||''}')">✓ ${isEdit ? 'Mettre à jour' : 'Enregistrer'}</button>
    </div>
  </div></div>`;
  openModal(html, 'modal-ecriture');
  // Pré-sélectionner la catégorie correctement
  if (e.categorie) {
    const sel = document.getElementById('ef-cat');
    if (sel) {
      for (let opt of sel.options) {
        if (opt.value === e.categorie) { opt.selected = true; break; }
      }
    }
  }
}

function _updateMontantLabel() {
  const type = document.getElementById('ef-type')?.value;
  const lbl = document.getElementById('ef-montant-label');
  if (lbl) lbl.textContent = type === 'credit' ? 'Montant recette (€)' : 'Montant dépense (€)';
}

async function _saveEcriture(existingId) {
  const type = document.getElementById('ef-type').value;
  const montant = parseFloat(document.getElementById('ef-montant').value)||0;
  if (!montant) { toast('Montant requis', 'error'); return; }
  const data = {
    date_operation: document.getElementById('ef-date').value,
    libelle: document.getElementById('ef-lib').value,
    categorie: document.getElementById('ef-cat').value,
    reference: document.getElementById('ef-ref').value,
    debit: type === 'debit' ? montant : 0,
    credit: type === 'credit' ? montant : 0,
  };
  try {
    setSyncStatus('syncing');
    if (existingId) {
      // Mise à jour
      const { error } = await supabase.from('journal_comptable').update(data).eq('id', existingId);
      if (error) throw error;
      toast('Écriture mise à jour ✓', 'success');
    } else {
      // Nouvelle écriture
      await DB.addEcriture(data);
      toast('Écriture ajoutée ✓', 'success');
    }
    setSyncStatus('synced');
    closeModal('modal-ecriture');
    await _loadCompta();
  } catch(e) { setSyncStatus('offline'); toast('Erreur: ' + e.message, 'error'); }
}

async function _deleteEcriture(id) {
  if (!confirm('Supprimer cette écriture ? Cette action est irréversible.')) return;
  try {
    setSyncStatus('syncing');
    const { error } = await supabase.from('journal_comptable').delete().eq('id', id);
    if (error) throw error;
    setSyncStatus('synced');
    toast('Écriture supprimée', 'success');
    await _loadCompta();
  } catch(e) { setSyncStatus('offline'); toast('Erreur: ' + e.message, 'error'); }
}

async function _exportCompta() {
  try {
    const journal = await DB.getJournal(Pages._comptaMois, Pages._comptaAnnee);
    const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    let solde = 0;
    const rows = journal.map(e => {
      solde += (e.credit||0) - (e.debit||0);
      return `${e.date_operation},"${e.libelle}",${e.categorie||''},${e.reference||''},${e.debit||''},${e.credit||''},${solde.toFixed(2)}`;
    });
    const csv = ['Date,Libellé,Catégorie,Référence,Débit,Crédit,Solde', ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8;'}));
    a.download = `lkb-compta-${months[Pages._comptaMois-1]}-${Pages._comptaAnnee}.csv`;
    a.click();
  } catch(e) { toast('Erreur export: ' + e.message, 'error'); }
}
