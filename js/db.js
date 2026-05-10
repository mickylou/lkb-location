// ============================================================
// LKB LOCATION — Couche base de données (Supabase)
// ============================================================

const DB = {

  // ---- VÉHICULES ----
  async getVehicules() {
    const { data, error } = await supabase.from('vehicules').select('*, proprietaires(nom,prenom)').order('marque');
    if (error) throw error; return data;
  },
  async getVehicule(id) {
    const { data, error } = await supabase.from('vehicules').select('*').eq('id', id).single();
    if (error) throw error; return data;
  },
  async saveVehicule(v) {
    const id = v.id;
    if (id) {
      const { data, error } = await supabase.from('vehicules').update(v).eq('id', id).select();
      if (error) throw error; return data[0];
    } else {
      const { data, error } = await supabase.from('vehicules').insert(v).select();
      if (error) throw error; return data[0];
    }
  },
  async deleteVehicule(id) {
    const { error } = await supabase.from('vehicules').delete().eq('id', id);
    if (error) throw error;
  },
  async updateVehiculeKm(id, km) {
    const { error } = await supabase.from('vehicules').update({ km_actuel: km }).eq('id', id);
    if (error) throw error;
  },

  // ---- DÉGÂTS VÉHICULE ----
  async getDegatsVehicule(vehiculeId) {
    const { data, error } = await supabase.from('degats_vehicule').select('*').eq('vehicule_id', vehiculeId).order('numero');
    if (error) throw error; return data;
  },
  async saveDegat(d) {
    const id = d.id;
    if (id) {
      const { data, error } = await supabase.from('degats_vehicule').update(d).eq('id', id).select();
      if (error) throw error; return data[0];
    } else {
      const { data, error } = await supabase.from('degats_vehicule').insert(d).select();
      if (error) throw error; return data[0];
    }
  },
  async deleteDegat(id) {
    const { error } = await supabase.from('degats_vehicule').delete().eq('id', id);
    if (error) throw error;
  },
  async addDegatsFromRetour(vehiculeId, reservationId, dommages) {
    if (!dommages || dommages.length === 0) return;
    // Récupérer le numéro max existant
    const { data: existing } = await supabase.from('degats_vehicule').select('numero').eq('vehicule_id', vehiculeId).order('numero', { ascending: false }).limit(1);
    let maxNum = existing && existing.length > 0 ? existing[0].numero : 0;
    for (const d of dommages) {
      maxNum++;
      await supabase.from('degats_vehicule').insert({
        vehicule_id: vehiculeId,
        face: d.face || 'front',
        x: d.x || 50,
        y: d.y || 50,
        numero: maxNum,
        description: d.description || d.label || '',
        photo_url: d.photoUrl || null,
        source: 'retour',
        reservation_id: reservationId,
      });
    }
  },

  // ---- FACES VÉHICULE ----
  async getVehiculeFaces(vehiculeId) {
    const { data, error } = await supabase.from('vehicule_faces').select('*').eq('vehicule_id', vehiculeId);
    if (error) throw error; return data || [];
  },
  async saveVehiculeFace(vehiculeId, face, photoUrl) {
    const { error } = await supabase.from('vehicule_faces').upsert({ vehicule_id: vehiculeId, face, photo_url: photoUrl, updated_at: new Date().toISOString() }, { onConflict: 'vehicule_id,face' });
    if (error) throw error;
  },

  // ---- CLIENTS ----
  async getClients() {
    const { data, error } = await supabase.from('clients').select('*').order('nom');
    if (error) throw error; return data;
  },
  async getClient(id) {
    const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
    if (error) throw error; return data;
  },
  async saveClient(c) {
    const id = c.id;
    if (id) {
      const { data, error } = await supabase.from('clients').update(c).eq('id', id).select();
      if (error) throw error; return data[0];
    } else {
      const { data, error } = await supabase.from('clients').insert(c).select();
      if (error) throw error; return data[0];
    }
  },

  // ---- RÉSERVATIONS ----
  async getReservations(filters = {}) {
    let q = supabase.from('reservations').select(`*, vehicules(marque, modele, immatriculation, type_propriete, tarif_jour), clients(civilite, nom, prenom, email, telephone)`).order('date_depart', { ascending: false });
    if (filters.statut) q = q.eq('statut', filters.statut);
    if (filters.vehicule_id) q = q.eq('vehicule_id', filters.vehicule_id);
    const { data, error } = await q;
    if (error) throw error; return data;
  },
  async getReservation(id) {
    const { data, error } = await supabase.from('reservations').select(`*, vehicules(*), clients(*)`).eq('id', id).single();
    if (error) throw error; return data;
  },
  async saveReservation(r) {
    const id = r.id;
    if (id) {
      const { data, error } = await supabase.from('reservations').update(r).eq('id', r.id).select();
      if (error) throw error; return data[0];
    } else {
      const { data, error } = await supabase.from('reservations').insert(r).select();
      if (error) throw error; return data[0];
    }
  },
  async cloturerReservation(id, kmRetour, frais, nouveauxDommages) {
    const { data: resData, error: resError } = await supabase.from('reservations')
      .update({ statut: 'cloture', km_retour: kmRetour, date_retour_effective: new Date().toISOString() })
      .eq('id', id).select();
    if (resError) throw resError;
    const res = resData[0];
    if (kmRetour && res.vehicule_id) {
      await supabase.from('vehicules').update({ km_actuel: kmRetour, statut: 'dispo' }).eq('id', res.vehicule_id);
    }
    if (frais && frais.length > 0) {
      await supabase.from('frais_retour').insert(frais.map(f => ({ ...f, reservation_id: id })));
      for (const f of frais) {
        await supabase.from('journal_comptable').insert({ date_operation: new Date().toISOString().split('T')[0], libelle: `Frais retour ${id} — ${f.type_frais}`, categorie: 'Frais retour', reference: id, credit: f.montant, reservation_id: id, vehicule_id: res.vehicule_id });
      }
    }
    // Ajouter les nouveaux dommages à l'état du véhicule
    if (nouveauxDommages && nouveauxDommages.length > 0 && res.vehicule_id) {
      await this.addDegatsFromRetour(res.vehicule_id, id, nouveauxDommages);
    }
    return res;
  },
  async nextReservationId() {
    const year = new Date().getFullYear();
    const { count } = await supabase.from('reservations').select('*', { count: 'exact', head: true }).like('id', `LC-${year}-%`);
    return `LC-${year}-${String((count || 0) + 1).padStart(3, '0')}`;
  },

  // ---- FRAIS RETOUR ----
  async getFraisRetour(reservationId) {
    const { data, error } = await supabase.from('frais_retour').select('*').eq('reservation_id', reservationId);
    if (error) throw error; return data;
  },

  // ---- EDL ----
  async getEDLs(reservationId) {
    const { data, error } = await supabase.from('etats_des_lieux').select('*').eq('reservation_id', reservationId);
    if (error) throw error; return data;
  },
  async getAllEDLs() {
    const { data, error } = await supabase.from('etats_des_lieux').select(`*, reservations(id, vehicules(marque, modele), clients(nom, prenom))`).order('created_at', { ascending: false });
    if (error) throw error; return data;
  },
  async saveEDL(edl) {
    const { data, error } = await supabase.from('etats_des_lieux').insert(edl).select();
    if (error) throw error; return data[0];
  },

  // ---- MAINTENANCE ----
  async getMaintenances() {
    const { data, error } = await supabase.from('maintenances').select('*, vehicules(marque,modele,immatriculation)').order('date_intervention', { ascending: false });
    if (error) throw error; return data;
  },
  async saveMaintenance(m) {
    const { data, error } = await supabase.from('maintenances').insert(m).select();
    if (error) throw error; return data[0];
  },
  async getAlertes() {
    const { data, error } = await supabase.from('alertes_entretien').select('*, vehicules(marque,modele)').eq('statut', 'actif').order('echeance_date');
    if (error) throw error; return data;
  },
  async saveAlerte(a) {
    const { data, error } = await supabase.from('alertes_entretien').insert(a).select();
    if (error) throw error; return data[0];
  },

  // ---- DOCUMENTS ----
  async getDocuments(entiteType, entiteId) {
    let q = supabase.from('documents').select('*');
    if (entiteType) q = q.eq('entite_type', entiteType);
    if (entiteId) q = q.eq('entite_id', entiteId);
    const { data, error } = await q.order('date_fin');
    if (error) throw error; return data;
  },
  async saveDocument(d) {
    const { data, error } = await supabase.from('documents').insert(d).select();
    if (error) throw error; return data[0];
  },

  // ---- FACTURES ----
  async getFactures() {
    const { data, error } = await supabase.from('factures').select('*, clients(nom,prenom), reservations(id)').order('date_emission', { ascending: false });
    if (error) throw error; return data;
  },
  async saveFacture(f) {
    const id = f.id;
    if (id) {
      const { data, error } = await supabase.from('factures').update(f).eq('id', id).select();
      if (error) throw error; return data[0];
    } else {
      const { data, error } = await supabase.from('factures').insert(f).select();
      if (error) throw error; return data[0];
    }
  },
  async nextFactureId() {
    const year = new Date().getFullYear();
    const { count } = await supabase.from('factures').select('*', { count: 'exact', head: true }).like('id', `FAC-${year}-%`);
    return `FAC-${year}-${String((count || 0) + 1).padStart(3, '0')}`;
  },

  // ---- COMPTABILITÉ ----
  async getJournal(mois, annee) {
    let q = supabase.from('journal_comptable').select('*').order('date_operation', { ascending: false });
    if (mois && annee) {
      const debut = `${annee}-${String(mois).padStart(2,'0')}-01`;
      const fin = `${annee}-${String(mois).padStart(2,'0')}-31`;
      q = q.gte('date_operation', debut).lte('date_operation', fin);
    }
    const { data, error } = await q;
    if (error) throw error; return data;
  },
  async addEcriture(e) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('journal_comptable').insert({ ...e, created_by: user?.id }).select();
    if (error) throw error; return data[0];
  },

  // ---- PROPRIÉTAIRES ----
  async getProprietaires() {
    const { data, error } = await supabase.from('proprietaires').select('*, vehicules(id,marque,modele,immatriculation)').order('nom');
    if (error) throw error; return data;
  },
  async saveProprietaire(p) {
    const id = p.id;
    if (id) {
      const { data, error } = await supabase.from('proprietaires').update(p).eq('id', id).select();
      if (error) throw error; return data[0];
    } else {
      const { data, error } = await supabase.from('proprietaires').insert(p).select();
      if (error) throw error; return data[0];
    }
  },

  // ---- SINISTRES ----
  async getSinistres() {
    const { data, error } = await supabase.from('sinistres').select('*, vehicules(marque,modele), clients(nom,prenom)').order('date_sinistre', { ascending: false });
    if (error) throw error; return data;
  },
  async saveSinistre(s) {
    const id = s.id;
    if (id) {
      const { data, error } = await supabase.from('sinistres').update(s).eq('id', id).select();
      if (error) throw error; return data[0];
    } else {
      const { data, error } = await supabase.from('sinistres').insert(s).select();
      if (error) throw error; return data[0];
    }
  },

  // ---- PARAMÈTRES ----
  async getParametres() {
    const { data, error } = await supabase.from('parametres').select('*').eq('id', 'societe').single();
    if (error) return null;
    return data;
  },
  async saveParametres(p) {
    const { data, error } = await supabase.from('parametres').upsert({ ...p, id: 'societe', updated_at: new Date().toISOString() }).select();
    if (error) throw error; return data[0];
  },

  // ---- STATS DASHBOARD ----
  async getDashboardStats() {
    const [vehRes, resRes, journalRes] = await Promise.all([
      supabase.from('vehicules').select('statut'),
      supabase.from('reservations').select('statut, total_prevu, date_retour_prevue').in('statut', ['active','retard','retour-j']),
      supabase.from('journal_comptable').select('credit,debit,date_operation').gte('date_operation', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
    ]);
    const vehicules = vehRes.data || [];
    const reservations = resRes.data || [];
    const journal = journalRes.data || [];
    const today = new Date().toISOString().split('T')[0];
    return {
      total_vehicules: vehicules.length,
      dispo: vehicules.filter(v => v.statut === 'dispo').length,
      loue: vehicules.filter(v => v.statut === 'loue').length,
      maint: vehicules.filter(v => v.statut === 'maint').length,
      locations_actives: reservations.length,
      retards: reservations.filter(r => r.statut === 'retard').length,
      retours_today: reservations.filter(r => r.date_retour_prevue?.startsWith(today)).length,
      ca_mois: journal.reduce((s, e) => s + (e.credit || 0), 0),
      charges_mois: journal.reduce((s, e) => s + (e.debit || 0), 0),
    };
  },

  // ---- REALTIME ----
  subscribeToChanges(table, callback) {
    return supabase.channel(`lkb-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, payload => callback(payload))
      .subscribe();
  }
};
